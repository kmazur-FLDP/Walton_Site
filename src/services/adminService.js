import { supabase } from '../lib/supabase'
import dataService from './dataService'

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
      console.log('AdminService: Checking admin status for getAllFavorites...')
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      console.log('AdminService: Fetching all favorites...')
      
      // First, try a simple query to see if there are any favorites at all
      const { data: simpleFavorites, error: simpleError } = await supabase
        .from('favorite_parcels')
        .select('*')
      
      console.log('AdminService: Simple favorites query:', { 
        data: simpleFavorites, 
        error: simpleError, 
        count: simpleFavorites?.length 
      })

      // Now try the join query with simplified syntax
      const { data, error } = await supabase
        .from('favorite_parcels')
        .select(`
          *,
          profiles (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      console.log('AdminService: getAllFavorites result:', { data, error, count: data?.length })
      if (error) {
        console.log('AdminService: Join query failed, falling back to simple query with manual joins')
        
        // Fallback: Get favorites and users separately, then join manually
        const { data: favorites, error: favError } = await supabase
          .from('favorite_parcels')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (favError) throw favError
        
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
        
        if (usersError) throw usersError
        
        // Create a user lookup map
        const userMap = {}
        users?.forEach(user => {
          userMap[user.id] = user
        })
        
        // Join the data manually
        const joinedData = favorites?.map(favorite => ({
          ...favorite,
          profiles: userMap[favorite.user_id] || null
        })) || []
        
        console.log('AdminService: Manual join result:', { count: joinedData.length })
        return joinedData
      }
      
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
          profiles (
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
      const { data: activeUsersData, error: activeError } = await supabase
        .from('favorite_parcels')
        .select('user_id')
        
      if (activeError) throw activeError
      
      const activeUsers = new Set(activeUsersData?.map(fav => fav.user_id) || []).size

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

  /**
   * Get all favorites with enriched parcel data from GeoJSON files
   * @returns {Promise<Array>} Array of favorites with detailed parcel information
   */
  async getAllFavoritesEnriched() {
    try {
      console.log('AdminService: Getting enriched favorites...')
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      // Get basic favorites data
      const favorites = await this.getAllFavorites()
      
      // Load all county parcel data
      const [hernandoParcels, manateeParcels, citrusParcels, pascoParcels, polkParcels] = await Promise.all([
        dataService.loadHernandoParcels(),
        dataService.loadManateeParcels(),
        dataService.loadCitrusParcels(),
        dataService.loadPascoParcels(),
        dataService.loadPolkParcels()
      ])

      const countyData = {
        'Hernando': hernandoParcels,
        'Manatee': manateeParcels,
        'Citrus': citrusParcels,
        'Pasco': pascoParcels,
        'Polk': polkParcels
      }

      // Enrich favorites with parcel details
      const enrichedFavorites = favorites.map(favorite => {
        const countyParcels = countyData[favorite.county]
        let parcelDetails = null

        if (countyParcels?.features) {
          // Look for the parcel in the GeoJSON data
          const parcelFeature = countyParcels.features.find(feature => {
            const props = feature.properties
            
            // Try different property names that might match the parcel_id
            const possibleIds = [
              props.PARCEL_UID,
              props.PARCEL_ID,
              props.OBJECTID,
              props.FID,
              props.ID,
              props.PIN,
              props.APN
            ]
            
            return possibleIds.some(id => 
              id && id.toString() === favorite.parcel_id?.toString()
            )
          })

          if (parcelFeature) {
            const props = parcelFeature.properties
            parcelDetails = {
              // Address information
              address: props.BAS_STRT || props.ADDRESS || props.SITUS_ADDR || favorite.parcel_address,
              city: props.CITY || props.SITUS_CITY,
              zip: props.ZIP || props.SITUS_ZIP,
              
              // Owner information
              owner: props.OWNER || props.OWNER_NAME || props.OWN_NAME,
              ownerAddress: props.OWN_ADDR1 || props.OWNER_ADDR,
              ownerCity: props.OWN_CITY || props.OWNER_CITY,
              ownerState: props.OWN_STATE || props.OWNER_STATE,
              ownerZip: props.OWN_ZIP || props.OWNER_ZIP,
              
              // Property details
              acreage: props.ACREAGE || props.ACRES || props.AREA_ACRES,
              totalValue: props.TOTAL_VAL || props.JUST_VAL || props.ASSESSED_VAL,
              landValue: props.LAND_VAL || props.LAND_VALUE,
              improvValue: props.IMPROV_VAL || props.IMP_VALUE,
              
              // Legal description
              legalDesc: props.LEGAL_DESC || props.LEGAL,
              subdivision: props.SUBDIV || props.SUBDIVISION,
              block: props.BLOCK,
              lot: props.LOT,
              
              // Zoning and use
              zoning: props.ZONING || props.ZONE,
              landUse: props.LAND_USE || props.USE_CODE || props.DOR_UC,
              useDesc: props.USE_DESC || props.DOR_UC_DESC,
              
              // Assessment year
              assessYear: props.ASSESS_YR || props.YEAR,
              
              // Geographic data
              geometry: parcelFeature.geometry
            }
          }
        }

        return {
          ...favorite,
          parcelDetails: parcelDetails
        }
      })

      console.log('AdminService: Enriched favorites:', enrichedFavorites.length)
      return enrichedFavorites
    } catch (error) {
      console.error('Error getting enriched favorites:', error)
      // Fallback to basic favorites if enrichment fails
      return await this.getAllFavorites()
    }
  }

  /**
   * Get all access logs with optional filtering
   * @param {Object} filters - Filter options
   * @param {string} filters.userId - Filter by user ID
   * @param {string} filters.eventType - Filter by event type
   * @param {string} filters.dateFrom - Filter from date (ISO string)
   * @param {string} filters.dateTo - Filter to date (ISO string)
   * @param {number} filters.limit - Limit number of results (default 100)
   * @returns {Promise<Array>} Array of access logs
   */
  async getAccessLogs(filters = {}) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      let query = supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType)
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      // Apply limit (default 100)
      const limit = filters.limit || 100
      query = query.limit(limit)

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching access logs:', error)
      return []
    }
  }

  /**
   * Get access log statistics
   * @returns {Promise<Object>} Access log stats
   */
  async getAccessLogStats() {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // Get recent access logs for analysis
      const { data: recentLogs, error } = await supabase
        .from('access_logs')
        .select('*')
        .gte('created_at', thirtyDaysAgo)

      if (error) throw error

      const logs = recentLogs || []

      // Calculate statistics
      const totalAccess = logs.length
      const successfulLogins = logs.filter(log => log.event_type === 'login' && log.success).length
      const failedLogins = logs.filter(log => log.event_type === 'login' && !log.success).length
      const uniqueUsers = new Set(logs.filter(log => log.user_id).map(log => log.user_id)).size
      const uniqueIPs = new Set(logs.map(log => log.ip_address)).size

      // Time-based stats
      const accessLast7Days = logs.filter(log => log.created_at >= sevenDaysAgo).length
      const accessLast24Hours = logs.filter(log => log.created_at >= oneDayAgo).length

      // Geographic distribution
      const countryStats = {}
      logs.forEach(log => {
        const country = log.location_country || 'Unknown'
        countryStats[country] = (countryStats[country] || 0) + 1
      })

      // Suspicious activity detection
      const suspiciousIPs = this.detectSuspiciousIPs(logs)
      const multiLocationUsers = this.detectMultiLocationUsers(logs)

      return {
        totalAccess,
        successfulLogins,
        failedLogins,
        uniqueUsers,
        uniqueIPs,
        accessLast7Days,
        accessLast24Hours,
        countryStats,
        suspiciousIPs: suspiciousIPs.length,
        multiLocationUsers: multiLocationUsers.length,
        loginSuccessRate: totalAccess > 0 ? ((successfulLogins / (successfulLogins + failedLogins)) * 100).toFixed(1) : 0
      }
    } catch (error) {
      console.error('Error fetching access log stats:', error)
      return {
        totalAccess: 0,
        successfulLogins: 0,
        failedLogins: 0,
        uniqueUsers: 0,
        uniqueIPs: 0,
        accessLast7Days: 0,
        accessLast24Hours: 0,
        countryStats: {},
        suspiciousIPs: 0,
        multiLocationUsers: 0,
        loginSuccessRate: 0
      }
    }
  }

  /**
   * Detect suspicious IP addresses based on activity patterns
   * @param {Array} logs - Access logs
   * @returns {Array} Suspicious IP addresses with details
   */
  detectSuspiciousIPs(logs) {
    const ipStats = {}
    
    logs.forEach(log => {
      const ip = log.ip_address
      if (!ipStats[ip]) {
        ipStats[ip] = {
          ip,
          totalAccess: 0,
          failedLogins: 0,
          successfulLogins: 0,
          users: new Set(),
          countries: new Set(),
          firstSeen: log.created_at,
          lastSeen: log.created_at
        }
      }

      const stats = ipStats[ip]
      stats.totalAccess++
      
      if (log.event_type === 'login') {
        if (log.success) {
          stats.successfulLogins++
        } else {
          stats.failedLogins++
        }
      }

      if (log.user_id) {
        stats.users.add(log.user_id)
      }

      if (log.location_country) {
        stats.countries.add(log.location_country)
      }

      if (log.created_at < stats.firstSeen) {
        stats.firstSeen = log.created_at
      }

      if (log.created_at > stats.lastSeen) {
        stats.lastSeen = log.created_at
      }
    })

    // Define suspicious criteria
    const suspicious = Object.values(ipStats).filter(stats => {
      const failureRate = stats.totalAccess > 0 ? (stats.failedLogins / stats.totalAccess) : 0
      const multipleUsers = stats.users.size > 3 // More than 3 users from same IP
      const highFailures = stats.failedLogins > 10 // More than 10 failed attempts
      const highFailureRate = failureRate > 0.5 // More than 50% failures

      return multipleUsers || highFailures || highFailureRate
    })

    return suspicious.map(stats => ({
      ...stats,
      users: Array.from(stats.users),
      countries: Array.from(stats.countries),
      suspicionReasons: [
        stats.users.size > 3 && 'Multiple users from same IP',
        stats.failedLogins > 10 && 'High number of failed logins',
        (stats.failedLogins / stats.totalAccess) > 0.5 && 'High failure rate'
      ].filter(Boolean)
    }))
  }

  /**
   * Detect users accessing from multiple geographic locations
   * @param {Array} logs - Access logs
   * @returns {Array} Users with multi-location access
   */
  detectMultiLocationUsers(logs) {
    const userStats = {}

    logs.forEach(log => {
      if (!log.user_id || !log.location_country) return

      if (!userStats[log.user_id]) {
        userStats[log.user_id] = {
          userId: log.user_id,
          email: log.email,
          countries: new Set(),
          ips: new Set(),
          locations: new Set()
        }
      }

      const stats = userStats[log.user_id]
      stats.countries.add(log.location_country)
      stats.ips.add(log.ip_address)
      
      if (log.location_city && log.location_region) {
        stats.locations.add(`${log.location_city}, ${log.location_region}`)
      }
    })

    // Users with access from multiple countries or many different IPs
    const multiLocation = Object.values(userStats).filter(stats => 
      stats.countries.size > 1 || stats.ips.size > 5
    )

    return multiLocation.map(stats => ({
      ...stats,
      countries: Array.from(stats.countries),
      ips: Array.from(stats.ips),
      locations: Array.from(stats.locations)
    }))
  }

  /**
   * Get recent suspicious activities
   * @param {number} hours - Hours to look back (default 24)
   * @returns {Promise<Array>} Recent suspicious activities
   */
  async getRecentSuspiciousActivity(hours = 24) {
    try {
      const isAdminUser = await this.isAdmin()
      if (!isAdminUser) throw new Error('Access denied: Admin role required')

      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data: recentLogs, error } = await supabase
        .from('access_logs')
        .select('*')
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false })

      if (error) throw error

      const logs = recentLogs || []
      const suspiciousIPs = this.detectSuspiciousIPs(logs)
      const multiLocationUsers = this.detectMultiLocationUsers(logs)

      // Combine and format suspicious activities
      const activities = []

      suspiciousIPs.forEach(ip => {
        activities.push({
          type: 'suspicious_ip',
          severity: 'high',
          title: `Suspicious IP Activity: ${ip.ip}`,
          description: `IP ${ip.ip} has ${ip.suspicionReasons.join(', ')}`,
          details: ip,
          timestamp: ip.lastSeen
        })
      })

      multiLocationUsers.forEach(user => {
        activities.push({
          type: 'multi_location_user',
          severity: user.countries.size > 2 ? 'high' : 'medium',
          title: `Multi-Location Access: ${user.email}`,
          description: `User accessed from ${user.countries.length} countries: ${user.countries.join(', ')}`,
          details: user,
          timestamp: new Date().toISOString()
        })
      })

      // Sort by severity and timestamp
      activities.sort((a, b) => {
        if (a.severity !== b.severity) {
          return a.severity === 'high' ? -1 : 1
        }
        return new Date(b.timestamp) - new Date(a.timestamp)
      })

      return activities
    } catch (error) {
      console.error('Error fetching suspicious activity:', error)
      return []
    }
  }
}

// Create and export singleton instance
export const adminService = new AdminService()
export default adminService
