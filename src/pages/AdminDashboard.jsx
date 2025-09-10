import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  UserGroupIcon, 
  StarIcon, 
  MapIcon, 
  ChartBarIcon,
  ArrowLeftIcon,
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import adminService from '../services/adminService'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState({})
  const [activityStats, setActivityStats] = useState({})
  const [allFavorites, setAllFavorites] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  
  // User management state
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [bulkAction, setBulkAction] = useState('')
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    full_name: '',
    role: 'user',
    password: ''
  })
  const [createUserLoading, setCreateUserLoading] = useState(false)

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true)
        
        // Check if user is admin
        const adminStatus = await adminService.isAdmin()
        setIsAdmin(adminStatus)
        
        if (!adminStatus) {
          // Redirect non-admins
          navigate('/dashboard')
          return
        }

        // Load admin data
        const [statsData, favoritesData, usersData, activityData] = await Promise.all([
          adminService.getFavoritesStats(),
          adminService.getAllFavorites(),
          adminService.getAllUsers(),
          adminService.getActivitySummary()
        ])

        setStats(statsData)
        setAllFavorites(favoritesData)
        setAllUsers(usersData)
        setActivityStats(activityData)
      } catch (error) {
        console.error('Error loading admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [navigate])

  const handleDeleteFavorite = async (favoriteId) => {
    if (!confirm('Are you sure you want to delete this favorite?')) return
    
    const success = await adminService.deleteFavorite(favoriteId)
    if (success) {
      setAllFavorites(prev => prev.filter(fav => fav.id !== favoriteId))
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return
    
    const success = await adminService.updateUserRole(userId, newRole)
    if (success) {
      setAllUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))
    }
  }

  // User management functions
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  }).sort((a, b) => {
    const aValue = a[sortBy] || ''
    const bValue = b[sortBy] || ''
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAllUsers = () => {
    setSelectedUsers(
      selectedUsers.length === filteredUsers.length 
        ? [] 
        : filteredUsers.map(user => user.id)
    )
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return
    
    const action = bulkAction
    setBulkAction('')
    
    if (action === 'make_admin') {
      if (!confirm(`Are you sure you want to make ${selectedUsers.length} users admin?`)) return
      
      for (const userId of selectedUsers) {
        await adminService.updateUserRole(userId, 'admin')
      }
      
      setAllUsers(prev => prev.map(user => 
        selectedUsers.includes(user.id) ? { ...user, role: 'admin' } : user
      ))
    } else if (action === 'make_user') {
      if (!confirm(`Are you sure you want to remove admin privileges from ${selectedUsers.length} users?`)) return
      
      for (const userId of selectedUsers) {
        await adminService.updateUserRole(userId, 'user')
      }
      
      setAllUsers(prev => prev.map(user => 
        selectedUsers.includes(user.id) ? { ...user, role: 'user' } : user
      ))
    }
    
    setSelectedUsers([])
  }

  const openUserModal = (user) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const getUserFavoritesCount = (userId) => {
    return allFavorites.filter(fav => fav.user_id === userId).length
  }

  const getUserLatestActivity = (userId) => {
    const userFavorites = allFavorites.filter(fav => fav.user_id === userId)
    if (userFavorites.length === 0) return null
    
    return new Date(Math.max(...userFavorites.map(fav => new Date(fav.created_at))))
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreateUserLoading(true)
    
    try {
      const success = await adminService.createUser(createUserForm)
      if (success) {
        // Refresh users list
        const updatedUsers = await adminService.getAllUsers()
        setAllUsers(updatedUsers)
        
        // Reset form and close modal
        setCreateUserForm({
          email: '',
          full_name: '',
          role: 'user',
          password: ''
        })
        setShowCreateUserModal(false)
        
        alert('User created successfully!')
      } else {
        alert('Failed to create user. Please try again.')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Failed to create user. Please check the details and try again.')
    } finally {
      setCreateUserLoading(false)
    }
  }

  const handleCreateUserInputChange = (field, value) => {
    setCreateUserForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h2 className="font-bold">Access Denied</h2>
            <p>You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                Admin Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'favorites', name: 'All Favorites', icon: StarIcon },
              { id: 'users', name: 'User Management', icon: UserGroupIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <UserGroupIcon className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    <p className="text-xs text-green-600">+{activityStats.newUsersLast30Days} this month</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <StarIcon className="w-8 h-8 text-amber-600" />
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Favorites</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalFavorites}</p>
                    <p className="text-xs text-green-600">+{activityStats.favoritesLast30Days} this month</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <UserGroupIcon className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                    <p className="text-xs text-blue-600">{activityStats.activeUsersLast30Days} active this month</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <MapIcon className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Counties</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(stats.countyBreakdown || {}).length}
                    </p>
                    <p className="text-xs text-purple-600">with activity</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-blue-900">Last 7 Days</div>
                      <div className="text-xs text-blue-600">New favorites added</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {activityStats.favoritesLast7Days}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-green-900">Last 30 Days</div>
                      <div className="text-xs text-green-600">New favorites added</div>
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {activityStats.favoritesLast30Days}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-purple-900">Active Users</div>
                      <div className="text-xs text-purple-600">Last 30 days</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {activityStats.activeUsersLast30Days}
                    </div>
                  </div>
                </div>
              </div>

              {/* County Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Favorites by County</h3>
                <div className="space-y-3">
                  {Object.entries(stats.countyBreakdown || {}).map(([county, count]) => {
                    const percentage = stats.totalFavorites > 0 ? 
                      ((count / stats.totalFavorites) * 100).toFixed(1) : 0
                    return (
                      <div key={county} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{county} County</span>
                          <div className="text-xs text-gray-500">{percentage}% of total</div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">{count}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow overflow-hidden"
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                All User Favorites ({allFavorites.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parcel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      County
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allFavorites.map((favorite) => (
                    <tr key={favorite.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {favorite.profiles?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {favorite.profiles?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {favorite.parcel_id}
                          </div>
                          {favorite.parcel_address && (
                            <div className="text-sm text-gray-500">
                              {favorite.parcel_address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {favorite.county}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(favorite.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/${favorite.county.toLowerCase()}`)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFavorite(favorite.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* User Management Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    User Management ({filteredUsers.length} of {allUsers.length})
                  </h3>
                  <p className="text-sm text-gray-500">
                    Manage user roles, view activity, and perform bulk actions
                  </p>
                </div>
                
                {/* Create User Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <UserPlusIcon className="w-4 h-4 mr-2" />
                    Create User
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  {/* Role Filter */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                  </select>
                  
                  {/* Sort */}
                  <select
                    value={`${sortBy}_${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('_')
                      setSortBy(field)
                      setSortOrder(order)
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="created_at_desc">Newest First</option>
                    <option value="created_at_asc">Oldest First</option>
                    <option value="full_name_asc">Name A-Z</option>
                    <option value="full_name_desc">Name Z-A</option>
                    <option value="email_asc">Email A-Z</option>
                  </select>
                </div>
              </div>
              
              {/* Bulk Actions */}
              {selectedUsers.length > 0 && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-md">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                  </span>
                  
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="px-3 py-1 text-sm border border-blue-300 rounded bg-white"
                  >
                    <option value="">Choose action...</option>
                    <option value="make_admin">Make Admin</option>
                    <option value="make_user">Remove Admin</option>
                  </select>
                  
                  {bulkAction && (
                    <button
                      onClick={handleBulkAction}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  )}
                  
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-1 text-blue-600 text-sm hover:text-blue-800"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={handleSelectAllUsers}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role & Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Favorites
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const userFavoritesCount = getUserFavoritesCount(user.id)
                      const lastActivity = getUserLatestActivity(user.id)
                      
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.full_name || 'Unknown User'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Joined {new Date(user.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === 'admin' 
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role === 'admin' && <ShieldCheckIcon className="w-3 h-3 mr-1" />}
                                {user.role}
                              </span>
                              
                              <select
                                value={user.role}
                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                className="block text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {lastActivity ? (
                                <div>
                                  <div className="text-gray-900">
                                    {lastActivity.toLocaleDateString()}
                                  </div>
                                  <div className="text-gray-500 text-xs flex items-center">
                                    <ClockIcon className="w-3 h-3 mr-1" />
                                    {Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24))} days ago
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">No activity</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <StarIcon className="w-4 h-4 text-amber-500 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                {userFavoritesCount}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openUserModal(user)}
                                className="text-primary-600 hover:text-primary-900 p-1 rounded"
                                title="View Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openUserModal(user)}
                                className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                title="Edit User"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900">No users found</h3>
                  <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* User Detail Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium text-xl">
                    {(selectedUser.full_name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xl font-medium text-gray-900">
                      {selectedUser.full_name || 'Unknown User'}
                    </h4>
                    <p className="text-gray-500">{selectedUser.email}</p>
                    <div className="flex items-center mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedUser.role === 'admin' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedUser.role === 'admin' && <ShieldCheckIcon className="w-3 h-3 mr-1" />}
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {getUserFavoritesCount(selectedUser.id)}
                    </div>
                    <div className="text-sm text-gray-500">Favorites</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.floor((Date.now() - new Date(selectedUser.created_at)) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-sm text-gray-500">Days Active</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {getUserLatestActivity(selectedUser.id) ? 
                        Math.floor((Date.now() - getUserLatestActivity(selectedUser.id)) / (1000 * 60 * 60 * 24))
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-500">Days Since Activity</div>
                  </div>
                </div>
                
                {/* User Favorites */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Recent Favorites</h5>
                  <div className="space-y-2">
                    {allFavorites
                      .filter(fav => fav.user_id === selectedUser.id)
                      .slice(0, 5)
                      .map((favorite) => (
                        <div key={favorite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {favorite.parcel_id}
                            </div>
                            <div className="text-xs text-gray-500">
                              {favorite.county} County • {new Date(favorite.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/${favorite.county.toLowerCase()}`)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={createUserLoading}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={createUserForm.email}
                    onChange={(e) => handleCreateUserInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="user@example.com"
                    disabled={createUserLoading}
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    value={createUserForm.full_name}
                    onChange={(e) => handleCreateUserInputChange('full_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="John Doe"
                    disabled={createUserLoading}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    required
                    minLength={6}
                    value={createUserForm.password}
                    onChange={(e) => handleCreateUserInputChange('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Minimum 6 characters"
                    disabled={createUserLoading}
                  />
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={createUserForm.role}
                    onChange={(e) => handleCreateUserInputChange('role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    disabled={createUserLoading}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="text-xs text-gray-500">
                  * Required fields. User will receive login credentials via email.
                </div>
              </form>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={createUserLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleCreateUser}
                  disabled={createUserLoading || !createUserForm.email || !createUserForm.password}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {createUserLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-4 h-4 mr-2" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
