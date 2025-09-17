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
  UserPlusIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import adminService from '../services/adminService'
import termsService from '../services/termsService'
import { CardSkeleton, TableSkeleton } from '../components/SkeletonLoader'
import { AdminOnlyState, DataErrorState } from '../components/EmptyState'

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
  
  // Favorites management state
  const [favoritesSearchTerm, setFavoritesSearchTerm] = useState('')
  const [favoritesCountyFilter, setFavoritesCountyFilter] = useState('all')
  const [favoritesUserFilter, setFavoritesUserFilter] = useState('all')
  const [favoritesDateFilter, setFavoritesDateFilter] = useState('all')
  const [favoritesSortBy, setFavoritesSortBy] = useState('created_at')
  const [favoritesSortOrder, setFavoritesSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(25)
  
  // Terms acceptance tracking state
  const [termsAcceptances, setTermsAcceptances] = useState([])
  const [termsStats, setTermsStats] = useState({
    totalAccepted: 0,
    pendingAcceptance: 0,
    acceptanceRate: 0
  })

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
        const [statsData, favoritesData, usersData, activityData, termsData] = await Promise.all([
          adminService.getFavoritesStats(),
          adminService.getAllFavoritesEnriched(), // Use enriched data instead
          adminService.getAllUsers(),
          adminService.getActivitySummary(),
          termsService.getAllTermsAcceptances()
        ])

        console.log('AdminDashboard: Loaded data:', {
          stats: statsData,
          favoritesCount: favoritesData?.length,
          usersCount: usersData?.length,
          activity: activityData,
          termsCount: termsData?.length
        })

        setStats(statsData)
        setAllFavorites(favoritesData)
        setAllUsers(usersData)
        setActivityStats(activityData)
        setTermsAcceptances(termsData)
        
        // Calculate terms stats
        if (usersData && termsData) {
          const totalUsers = usersData.length
          const acceptedUsers = termsData.length
          const acceptanceRate = totalUsers > 0 ? (acceptedUsers / totalUsers * 100) : 0
          
          setTermsStats({
            totalAccepted: acceptedUsers,
            pendingAcceptance: totalUsers - acceptedUsers,
            acceptanceRate: acceptanceRate
          })
        }
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

  // Favorites filtering and sorting functions
  const getFilteredFavorites = () => {
    let filtered = [...allFavorites]

    // Apply search filter
    if (favoritesSearchTerm) {
      const searchLower = favoritesSearchTerm.toLowerCase()
      filtered = filtered.filter(fav => 
        fav.parcel_id?.toLowerCase().includes(searchLower) ||
        fav.parcel_address?.toLowerCase().includes(searchLower) ||
        fav.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        fav.profiles?.email?.toLowerCase().includes(searchLower)
      )
    }

    // Apply county filter
    if (favoritesCountyFilter !== 'all') {
      filtered = filtered.filter(fav => fav.county === favoritesCountyFilter)
    }

    // Apply user filter
    if (favoritesUserFilter !== 'all') {
      filtered = filtered.filter(fav => fav.user_id === favoritesUserFilter)
    }

    // Apply date filter
    if (favoritesDateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (favoritesDateFilter) {
        case 'today':
          filterDate.setDate(now.getDate())
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3)
          break
        default:
          break
      }
      
      if (favoritesDateFilter !== 'all') {
        filtered = filtered.filter(fav => new Date(fav.created_at) >= filterDate)
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (favoritesSortBy) {
        case 'user_name':
          aValue = a.profiles?.full_name || a.profiles?.email || ''
          bValue = b.profiles?.full_name || b.profiles?.email || ''
          break
        case 'parcel_id':
          aValue = a.parcel_id || ''
          bValue = b.parcel_id || ''
          break
        case 'county':
          aValue = a.county || ''
          bValue = b.county || ''
          break
        case 'created_at':
        default:
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
      }
      
      if (favoritesSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }

  const getUniqueCounties = () => {
    const counties = new Set(allFavorites.map(fav => fav.county))
    return Array.from(counties).sort()
  }

  const getUniqueUsers = () => {
    const usersMap = new Map()
    allFavorites.forEach(fav => {
      if (fav.profiles) {
        usersMap.set(fav.user_id, {
          id: fav.user_id,
          name: fav.profiles.full_name || fav.profiles.email,
          email: fav.profiles.email
        })
      }
    })
    return Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  const exportFavoritesToCSV = () => {
    const filtered = getFilteredFavorites()
    const csvContent = [
      [
        'User Name', 'User Email', 'Parcel ID', 'County', 'Date Added',
        'Parcel Address', 'City', 'ZIP', 'Owner', 'Acreage', 'Total Value', 
        'Land Value', 'Improvement Value', 'Zoning', 'Land Use', 'Legal Description'
      ],
      ...filtered.map(fav => [
        fav.profiles?.full_name || '',
        fav.profiles?.email || '',
        fav.parcel_id || '',
        fav.county || '',
        new Date(fav.created_at).toLocaleDateString(),
        fav.parcelDetails?.address || fav.parcel_address || '',
        fav.parcelDetails?.city || '',
        fav.parcelDetails?.zip || '',
        fav.parcelDetails?.owner || '',
        fav.parcelDetails?.acreage || '',
        fav.parcelDetails?.totalValue || '',
        fav.parcelDetails?.landValue || '',
        fav.parcelDetails?.improvValue || '',
        fav.parcelDetails?.zoning || '',
        fav.parcelDetails?.useDesc || fav.parcelDetails?.landUse || '',
        fav.parcelDetails?.legalDesc || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `favorites-detailed-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Analytics calculation functions
  const getAnalyticsData = () => {
    const favorites = allFavorites
    
    // Most popular parcels (parcels favorited by multiple users)
    const parcelCounts = {}
    favorites.forEach(fav => {
      const key = `${fav.county}-${fav.parcel_id}`
      parcelCounts[key] = (parcelCounts[key] || 0) + 1
    })
    
    const popularParcels = Object.entries(parcelCounts)
      .filter(([, count]) => count > 1)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 10)
      .map(([key, count]) => {
        const [county, parcelId] = key.split('-')
        const sample = favorites.find(fav => fav.county === county && fav.parcel_id === parcelId)
        return {
          county,
          parcelId,
          count,
          sample
        }
      })

    // Activity trends (favorites per day over last 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dailyActivity = {}
    
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      dailyActivity[dateKey] = 0
    }
    
    favorites.forEach(fav => {
      const dateKey = new Date(fav.created_at).toISOString().split('T')[0]
      if (dateKey in dailyActivity) {
        dailyActivity[dateKey]++
      }
    })

    // User engagement patterns
    const userActivity = {}
    favorites.forEach(fav => {
      if (!userActivity[fav.user_id]) {
        userActivity[fav.user_id] = {
          user: fav.profiles,
          count: 0,
          counties: new Set(),
          firstActivity: new Date(fav.created_at),
          lastActivity: new Date(fav.created_at)
        }
      }
      userActivity[fav.user_id].count++
      userActivity[fav.user_id].counties.add(fav.county)
      const activityDate = new Date(fav.created_at)
      if (activityDate < userActivity[fav.user_id].firstActivity) {
        userActivity[fav.user_id].firstActivity = activityDate
      }
      if (activityDate > userActivity[fav.user_id].lastActivity) {
        userActivity[fav.user_id].lastActivity = activityDate
      }
    })

    const engagementLevels = {
      light: Object.values(userActivity).filter(u => u.count <= 2).length,
      moderate: Object.values(userActivity).filter(u => u.count >= 3 && u.count <= 10).length,
      heavy: Object.values(userActivity).filter(u => u.count > 10).length
    }

    const topUsers = Object.values(userActivity)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // County preferences
    const countyStats = {}
    favorites.forEach(fav => {
      if (!countyStats[fav.county]) {
        countyStats[fav.county] = {
          count: 0,
          users: new Set(),
          avgPerUser: 0
        }
      }
      countyStats[fav.county].count++
      countyStats[fav.county].users.add(fav.user_id)
    })

    Object.keys(countyStats).forEach(county => {
      countyStats[county].avgPerUser = (countyStats[county].count / countyStats[county].users.size).toFixed(1)
    })

    return {
      popularParcels,
      dailyActivity,
      engagementLevels,
      topUsers,
      countyStats,
      totalUsers: Object.keys(userActivity).length,
      avgFavoritesPerUser: (favorites.length / Object.keys(userActivity).length).toFixed(1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white shadow-lg border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <CardSkeleton key={i} height="120px" />
            ))}
          </div>
          <TableSkeleton rows={10} />
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminOnlyState />
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
              { id: 'analytics', name: 'Favorites Analytics', icon: ChartBarIcon },
              { id: 'users', name: 'User Management', icon: UserGroupIcon },
              { id: 'terms', name: 'Terms Compliance', icon: ShieldCheckIcon }
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <ShieldCheckIcon className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Terms Compliance</h3>
                    <p className="text-2xl font-bold text-gray-900">{termsStats.acceptanceRate.toFixed(0)}%</p>
                    <p className="text-xs text-green-600">{termsStats.totalAccepted}/{stats.totalUsers} accepted</p>
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
            className="space-y-6"
          >
            {/* Favorites Management Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    User Favorites Management ({getFilteredFavorites().length} of {allFavorites.length})
                  </h3>
                  <p className="text-sm text-gray-500">
                    View, search, and analyze all user favorited parcels
                  </p>
                </div>
                
                {/* Export Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={exportFavoritesToCSV}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search parcels, users..."
                    value={favoritesSearchTerm}
                    onChange={(e) => setFavoritesSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
                  />
                </div>
                
                {/* County Filter */}
                <select
                  value={favoritesCountyFilter}
                  onChange={(e) => setFavoritesCountyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Counties</option>
                  {getUniqueCounties().map(county => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
                
                {/* User Filter */}
                <select
                  value={favoritesUserFilter}
                  onChange={(e) => setFavoritesUserFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Users</option>
                  {getUniqueUsers().map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                
                {/* Date Filter */}
                <select
                  value={favoritesDateFilter}
                  onChange={(e) => setFavoritesDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last Quarter</option>
                </select>
                
                {/* Sort */}
                <select
                  value={`${favoritesSortBy}_${favoritesSortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('_')
                    setFavoritesSortBy(field)
                    setFavoritesSortOrder(order)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="created_at_desc">Newest First</option>
                  <option value="created_at_asc">Oldest First</option>
                  <option value="user_name_asc">User A-Z</option>
                  <option value="user_name_desc">User Z-A</option>
                  <option value="parcel_id_asc">Parcel ID A-Z</option>
                  <option value="county_asc">County A-Z</option>
                </select>
              </div>
            </div>

            {/* Favorites Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parcel Details
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
                    {(() => {
                      const filtered = getFilteredFavorites()
                      const startIndex = (currentPage - 1) * itemsPerPage
                      const endIndex = startIndex + itemsPerPage
                      const paginatedFavorites = filtered.slice(startIndex, endIndex)
                      
                      return paginatedFavorites.map((favorite) => (
                        <tr key={favorite.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                                {(favorite.profiles?.full_name || favorite.profiles?.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {favorite.profiles?.full_name || 'Unknown User'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {favorite.profiles?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 font-mono">
                                {favorite.parcel_id}
                              </div>
                              
                              {/* Enhanced parcel information */}
                              {favorite.parcelDetails ? (
                                <div className="mt-2 space-y-1">
                                  {favorite.parcelDetails.address && (
                                    <div className="text-sm text-gray-600">
                                      📍 {favorite.parcelDetails.address}
                                      {favorite.parcelDetails.city && `, ${favorite.parcelDetails.city}`}
                                      {favorite.parcelDetails.zip && ` ${favorite.parcelDetails.zip}`}
                                    </div>
                                  )}
                                  
                                  {favorite.parcelDetails.owner && (
                                    <div className="text-sm text-gray-600">
                                      👤 {favorite.parcelDetails.owner}
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {favorite.parcelDetails.acreage && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                        🌾 {parseFloat(favorite.parcelDetails.acreage).toFixed(2)} acres
                                      </span>
                                    )}
                                    
                                    {favorite.parcelDetails.totalValue && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                        💰 ${parseInt(favorite.parcelDetails.totalValue).toLocaleString()}
                                      </span>
                                    )}
                                    
                                    {favorite.parcelDetails.zoning && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                        🏗️ {favorite.parcelDetails.zoning}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {favorite.parcel_address && (
                                    <div className="text-sm text-gray-500 mt-1">
                                      📍 {favorite.parcel_address}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 mt-1">
                                    ⚠️ Detailed parcel data not available
                                  </div>
                                </>
                              )}
                              
                              <div className="text-xs text-gray-400 mt-2">
                                ID: {favorite.id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {favorite.county}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(favorite.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(favorite.created_at).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => navigate(`/${favorite.county.toLowerCase()}`)}
                                className="text-primary-600 hover:text-primary-900 p-1 rounded"
                                title={`View ${favorite.county} Map`}
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteFavorite(favorite.id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded"
                                title="Delete Favorite"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {(() => {
                const filtered = getFilteredFavorites()
                const totalPages = Math.ceil(filtered.length / itemsPerPage)
                
                if (totalPages <= 1) return null
                
                return (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * itemsPerPage, filtered.length)}
                          </span> of{' '}
                          <span className="font-medium">{filtered.length}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <ChevronLeftIcon className="h-5 w-5" />
                          </button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pageNum === currentPage
                                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                          
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <ChevronRightIcon className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )
              })()}
              
              {/* No results message */}
              {getFilteredFavorites().length === 0 && (
                <div className="text-center py-12">
                  <StarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900">No favorites found</h3>
                  <p className="text-sm text-gray-500">
                    {favoritesSearchTerm || favoritesCountyFilter !== 'all' || favoritesUserFilter !== 'all' || favoritesDateFilter !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'No users have favorited any parcels yet.'}
                  </p>
                </div>
              )}
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {getFilteredFavorites().length}
                </div>
                <div className="text-sm text-gray-500">Filtered Results</div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {getUniqueUsers().filter(user => 
                    getFilteredFavorites().some(fav => fav.user_id === user.id)
                  ).length}
                </div>
                <div className="text-sm text-gray-500">Active Users</div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {getUniqueCounties().filter(county =>
                    getFilteredFavorites().some(fav => fav.county === county)
                  ).length}
                </div>
                <div className="text-sm text-gray-500">Counties</div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {getFilteredFavorites().length > 0 ? 
                    (getFilteredFavorites().length / getUniqueUsers().filter(user => 
                      getFilteredFavorites().some(fav => fav.user_id === user.id)
                    ).length).toFixed(1) : '0'}
                </div>
                <div className="text-sm text-gray-500">Avg per User</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {(() => {
              const analytics = getAnalyticsData()
              
              return (
                <>
                  {/* Analytics Header */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Favorites Analytics Dashboard
                    </h3>
                    <p className="text-sm text-gray-500">
                      Detailed insights and trends for user favorite activity
                    </p>
                  </div>

                  {/* Key Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {analytics.totalUsers}
                      </div>
                      <div className="text-sm text-gray-500">Active Users</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Users with favorites
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {analytics.avgFavoritesPerUser}
                      </div>
                      <div className="text-sm text-gray-500">Avg per User</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Favorites per active user
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {analytics.popularParcels.length}
                      </div>
                      <div className="text-sm text-gray-500">Popular Parcels</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Favorited by multiple users
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                      <div className="text-3xl font-bold text-amber-600">
                        {Object.keys(analytics.countyStats).length}
                      </div>
                      <div className="text-sm text-gray-500">Active Counties</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Counties with activity
                      </div>
                    </div>
                  </div>

                  {/* User Engagement Levels */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">User Engagement Levels</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {analytics.engagementLevels.light}
                        </div>
                        <div className="text-sm text-blue-800">Light Users</div>
                        <div className="text-xs text-blue-600">1-2 favorites</div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.engagementLevels.moderate}
                        </div>
                        <div className="text-sm text-green-800">Moderate Users</div>
                        <div className="text-xs text-green-600">3-10 favorites</div>
                      </div>
                      
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {analytics.engagementLevels.heavy}
                        </div>
                        <div className="text-sm text-purple-800">Heavy Users</div>
                        <div className="text-xs text-purple-600">10+ favorites</div>
                      </div>
                    </div>
                  </div>

                  {/* Top Users and Popular Parcels */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Users */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Most Active Users</h4>
                      <div className="space-y-3">
                        {analytics.topUsers.slice(0, 8).map((userStat, index) => (
                          <div key={userStat.user?.email || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                {(userStat.user?.full_name || userStat.user?.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {userStat.user?.full_name || 'Unknown User'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {userStat.counties.size} counties • Active for{' '}
                                  {Math.floor((userStat.lastActivity - userStat.firstActivity) / (1000 * 60 * 60 * 24))} days
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary-600">
                                {userStat.count}
                              </div>
                              <div className="text-xs text-gray-500">favorites</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Popular Parcels */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Most Popular Parcels</h4>
                      <div className="space-y-3">
                        {analytics.popularParcels.length > 0 ? (
                          analytics.popularParcels.map((parcel) => (
                            <div key={`${parcel.county}-${parcel.parcelId}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="text-sm font-medium text-gray-900 font-mono">
                                  {parcel.parcelId}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {parcel.county} County
                                  {parcel.sample?.parcel_address && ` • ${parcel.sample.parcel_address}`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-red-600">
                                  {parcel.count}
                                </div>
                                <div className="text-xs text-gray-500">users</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <StarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm">No parcels with multiple favorites yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* County Analysis */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">County Activity Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(analytics.countyStats).map(([county, stats]) => (
                        <div key={county} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">{county} County</h5>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {stats.count} favorites
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>👥 {stats.users.size} active users</div>
                            <div>📊 {stats.avgPerUser} avg per user</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ 
                                  width: `${(stats.count / Math.max(...Object.values(analytics.countyStats).map(s => s.count))) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Daily Activity (Last 30 Days)</h4>
                    <div className="h-64 overflow-x-auto">
                      <div className="flex items-end space-x-1 h-full min-w-max">
                        {Object.entries(analytics.dailyActivity).map(([date, count]) => {
                          const maxCount = Math.max(...Object.values(analytics.dailyActivity))
                          const height = maxCount > 0 ? (count / maxCount) * 200 : 0
                          
                          return (
                            <div key={date} className="flex flex-col items-center">
                              <div 
                                className="w-6 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                                style={{ height: `${height}px`, minHeight: count > 0 ? '4px' : '0px' }}
                                title={`${date}: ${count} favorites`}
                              ></div>
                              <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left w-12">
                                {new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      Hover over bars to see daily counts
                    </div>
                  </div>
                </>
              )
            })()}
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

        {/* Terms Compliance Tab */}
        {activeTab === 'terms' && (
          <div className="space-y-6">
            {/* Terms Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card text-center"
              >
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {termsStats.totalAccepted}
                </div>
                <p className="text-gray-600">Users Accepted Terms</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card text-center"
              >
                <div className="text-3xl font-bold text-amber-600 mb-2">
                  {termsStats.pendingAcceptance}
                </div>
                <p className="text-gray-600">Pending Acceptance</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card text-center"
              >
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {termsStats.acceptanceRate.toFixed(1)}%
                </div>
                <p className="text-gray-600">Acceptance Rate</p>
              </motion.div>
            </div>

            {/* Terms Acceptance Records */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ShieldCheckIcon className="w-5 h-5 mr-2 text-green-500" />
                  Terms Acceptance Records
                </h3>
              </div>

              {termsAcceptances.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No terms acceptance records found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Version
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Accepted Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User Agent
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {termsAcceptances.map((acceptance) => (
                        <tr key={acceptance.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {acceptance.user_email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              v{acceptance.terms_version}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(acceptance.accepted_at).toLocaleDateString()} {new Date(acceptance.accepted_at).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {acceptance.user_agent}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* Compliance Notes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card bg-blue-50 border border-blue-200"
            >
              <div className="flex items-start">
                <ShieldCheckIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Compliance Information</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• All terms acceptances are tracked with timestamps and user agent information</li>
                    <li>• Users must accept terms before accessing any portal features</li>
                    <li>• Terms specifically prohibit sharing data with external parties including real estate agents</li>
                    <li>• Records are maintained for compliance and audit purposes</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
