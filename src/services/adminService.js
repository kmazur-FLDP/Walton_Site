import { supabase } from '../lib/supabase'

class AdminService {
  /**
   * Check if current user is admin
   * @returns {Promise<boolean>} Whether user is admin
   */
  async isAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('AdminService: Current user:', user?.email)
      if (!user) {
        console.log('AdminService: No user found')
        return false
      }

      // Temporary: Allow specific admin email while we fix the database
      if (user.email === 'kmmazur@fldandp.com') {
        console.log('AdminService: Hardcoded admin access granted')
        return true
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('AdminService: Profile query result:', { data, error })
      if (error) {
        console.log('AdminService: Database error, checking hardcoded admin')
        // Fallback for database issues
        return user.email === 'kmmazur@fldandp.com'
      }
      
      const isAdminUser = data?.role === 'admin'
      console.log('AdminService: Is admin:', isAdminUser)
      return isAdminUser
    } catch (error) {
      console.error('Error checking admin status:', error)
      // Fallback: allow hardcoded admin email
      const { data: { user } } = await supabase.auth.getUser()
      return user?.email === 'kmmazur@fldandp.com'
    }
  }

  /**
   * Get all users with their profiles
   * @returns {Promise<Array>} Array of user profiles
   */
  async getAllUsers() {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  }

  /**
   * Get all favorites across all users
   * @returns {Promise<Array>} Array of all favorites with user info
   */
  async getAllFavorites() {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const { data, error } = await supabase
        .from('favorite_parcels')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all favorites:', error)
      return []
    }
  }

  /**
   * Get favorites for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of user's favorites
   */
  async getUserFavorites(userId) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const { data, error } = await supabase
        .from('favorite_parcels')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user favorites:', error)
      return []
    }
  }

  /**
   * Get favorites statistics
   * @returns {Promise<Object>} Stats about favorites usage
   */
  async getFavoritesStats() {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      // Get total favorites count
      const { count: totalFavorites, error: favError } = await supabase
        .from('favorite_parcels')
        .select('*', { count: 'exact', head: true })

      if (favError) throw favError

      // Get active users count (users with at least one favorite)
      const { data: activeUsers, error: activeError } = await supabase
        .from('favorite_parcels')
        .select('user_id')
        .then(({ data, error }) => {
          if (error) throw error
          const uniqueUsers = new Set(data?.map(fav => fav.user_id) || [])
          return { data: uniqueUsers.size, error: null }
        })

      // Get favorites by county
      const { data: countyStats, error: countyError } = await supabase
        .from('favorite_parcels')
        .select('county')

      if (countyError) throw countyError

      const countyBreakdown = countyStats?.reduce((acc, fav) => {
        acc[fav.county] = (acc[fav.county] || 0) + 1
        return acc
      }, {}) || {}

      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (usersError) throw usersError

      return {
        totalFavorites: totalFavorites || 0,
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        countyBreakdown
      }
    } catch (error) {
      console.error('Error fetching favorites stats:', error)
      return {
        totalFavorites: 0,
        totalUsers: 0,
        activeUsers: 0,
        countyBreakdown: {}
      }
    }
  }

  /**
   * Update user role (admin only)
   * @param {string} userId - User ID
   * @param {string} newRole - New role ('user' or 'admin')
   * @returns {Promise<boolean>} Success status
   */
  async updateUserRole(userId, newRole) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating user role:', error)
      return false
    }
  }

  /**
   * Delete a favorite (admin override)
   * @param {string} favoriteId - Favorite ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFavorite(favoriteId) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const { error } = await supabase
        .from('favorite_parcels')
        .delete()
        .eq('id', favoriteId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting favorite:', error)
      return false
    }
  }

  /**
   * Get detailed user information including activity metrics
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User details with activity metrics
   */
  async getUserDetails(userId) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // Get user's favorites
      const { data: favorites, error: favoritesError } = await supabase
        .from('favorite_parcels')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (favoritesError) throw favoritesError

      // Calculate activity metrics
      const now = new Date()
      const joinDate = new Date(profile.created_at)
      const daysActive = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24))
      
      const lastActivity = favorites.length > 0 
        ? new Date(Math.max(...favorites.map(f => new Date(f.created_at))))
        : null
      
      const daysSinceActivity = lastActivity 
        ? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24))
        : null

      // County breakdown
      const countyBreakdown = favorites.reduce((acc, fav) => {
        acc[fav.county] = (acc[fav.county] || 0) + 1
        return acc
      }, {})

      return {
        ...profile,
        favorites,
        metrics: {
          totalFavorites: favorites.length,
          daysActive,
          daysSinceActivity,
          countyBreakdown,
          averageFavoritesPerMonth: daysActive > 0 ? (favorites.length / (daysActive / 30)).toFixed(1) : 0
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
      return null
    }
  }

  /**
   * Update user profile information
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<boolean>} Success status
   */
  async updateUserProfile(userId, updates) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const { error } = await supabase
        .from('profiles')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating user profile:', error)
      return false
    }
  }

  /**
   * Get activity summary for all users
   * @returns {Promise<Object>} Activity metrics
   */
  async getActivitySummary() {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // Get recent favorites
      const { data: recentFavorites, error: recentError } = await supabase
        .from('favorite_parcels')
        .select('created_at, user_id')
        .gte('created_at', thirtyDaysAgo)

      if (recentError) throw recentError

      // Get all users for comparison
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, created_at')

      if (usersError) throw usersError

      // Calculate metrics
      const favoritesLast30Days = recentFavorites?.length || 0
      const favoritesLast7Days = recentFavorites?.filter(
        f => f.created_at >= sevenDaysAgo
      ).length || 0

      const activeUsersLast30Days = new Set(
        recentFavorites?.map(f => f.user_id) || []
      ).size

      const newUsersLast30Days = allUsers?.filter(
        u => u.created_at >= thirtyDaysAgo
      ).length || 0

      return {
        favoritesLast30Days,
        favoritesLast7Days,
        activeUsersLast30Days,
        newUsersLast30Days,
        totalUsers: allUsers?.length || 0
      }
    } catch (error) {
      console.error('Error fetching activity summary:', error)
      return {
        favoritesLast30Days: 0,
        favoritesLast7Days: 0,
        activeUsersLast30Days: 0,
        newUsersLast30Days: 0,
        totalUsers: 0
      }
    }
  }

  /**
   * Bulk update user roles
   * @param {Array<string>} userIds - Array of user IDs
   * @param {string} newRole - New role to assign
   * @returns {Promise<boolean>} Success status
   */
  async bulkUpdateUserRoles(userIds, newRole) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString() 
        })
        .in('id', userIds)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error bulk updating user roles:', error)
      return false
    }
  }

  /**
   * Create a new user (admin only)
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.full_name - User full name
   * @param {string} userData.role - User role ('user' or 'admin')
   * @returns {Promise<boolean>} Success status
   */
  async createUser(userData) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const { email, password, full_name, role = 'user' } = userData

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw profileError
      }

      return true
    } catch (error) {
      console.error('Error creating user:', error)
      return false
    }
  }
}

// Create and export singleton instance
export const adminService = new AdminService()
export default adminService
