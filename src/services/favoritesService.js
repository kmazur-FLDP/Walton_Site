import { supabase } from '../lib/supabase'

class FavoritesService {
  /**
   * Get all favorite parcels for the current user
   * @returns {Promise<Array>} Array of favorite parcels
   */
  async getUserFavorites() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('favorite_parcels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching favorites:', error)
      return []
    }
  }

  /**
   * Get favorite parcels for a specific county
   * @param {string} county - County name
   * @returns {Promise<Array>} Array of favorite parcels for the county
   */
  async getFavoritesByCounty(county) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('favorite_parcels')
        .select('*')
        .eq('user_id', user.id)
        .eq('county', county)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching county favorites:', error)
      return []
    }
  }

  /**
   * Add a parcel to favorites
   * @param {string} parcelId - Parcel ID
   * @param {string} county - County name
   * @param {string} parcelAddress - Parcel address (optional)
   * @param {string} notes - User notes (optional)
   * @returns {Promise<Object|null>} Created favorite record
   */
  async addFavorite(parcelId, county, parcelAddress = null, notes = null) {
    try {
      console.log(`FavoritesService: Adding favorite - parcelId: ${parcelId}, county: ${county}`)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('FavoritesService: No authenticated user')
        throw new Error('No authenticated user')
      }

      console.log(`FavoritesService: User ID: ${user.id}`)

      const { data, error } = await supabase
        .from('favorite_parcels')
        .insert({
          user_id: user.id,
          parcel_id: parcelId,
          county: county,
          parcel_address: parcelAddress,
          notes: notes
        })
        .select()
        .single()

      if (error) {
        console.error('FavoritesService: Database error:', error)
        throw error
      }
      
      console.log('FavoritesService: Successfully added favorite:', data)
      return data
    } catch (error) {
      console.error('FavoritesService: Error adding favorite:', error)
      return null
    }
  }

  /**
   * Remove a parcel from favorites
   * @param {string} parcelId - Parcel ID
   * @param {string} county - County name (optional, for extra safety)
   * @returns {Promise<boolean>} Success status
   */
  async removeFavorite(parcelId, county = null) {
    try {
      console.log(`FavoritesService: Removing favorite - parcelId: ${parcelId}, county: ${county}`)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('FavoritesService: No authenticated user for removal')
        throw new Error('No authenticated user')
      }

      let query = supabase
        .from('favorite_parcels')
        .delete()
        .eq('user_id', user.id)
        .eq('parcel_id', parcelId)

      if (county) {
        query = query.eq('county', county)
      }

      const { error } = await query

      if (error) {
        console.error('FavoritesService: Database error removing favorite:', error)
        throw error
      }
      
      console.log('FavoritesService: Successfully removed favorite')
      return true
    } catch (error) {
      console.error('FavoritesService: Error removing favorite:', error)
      return false
    }
  }

  /**
   * Check if a parcel is favorited
   * @param {string} parcelId - Parcel ID
   * @param {string} county - County name
   * @returns {Promise<boolean>} Whether the parcel is favorited
   */
  async isFavorite(parcelId, county) {
    try {
      console.log(`FavoritesService: Checking favorite status - parcelId: ${parcelId}, county: ${county}`)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('FavoritesService: No authenticated user for favorite check')
        return false
      }

      const { data, error } = await supabase
        .from('favorite_parcels')
        .select('id')
        .eq('user_id', user.id)
        .eq('parcel_id', parcelId)
        .eq('county', county)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('FavoritesService: Database error checking favorite:', error)
        throw error // PGRST116 = no rows returned
      }
      
      const isFav = !!data
      console.log(`FavoritesService: Favorite status result: ${isFav}`)
      return isFav
    } catch (error) {
      console.error('FavoritesService: Error checking favorite status:', error)
      return false
    }
  }

  /**
   * Toggle favorite status of a parcel
   * @param {string} parcelId - Parcel ID
   * @param {string} county - County name
   * @param {string} parcelAddress - Parcel address (optional)
   * @returns {Promise<boolean>} New favorite status (true = favorited, false = unfavorited)
   */
  async toggleFavorite(parcelId, county, parcelAddress = null) {
    try {
      console.log(`FavoritesService: Toggling favorite - parcelId: ${parcelId}, county: ${county}`)
      
      const isFav = await this.isFavorite(parcelId, county)
      console.log(`FavoritesService: Current favorite status: ${isFav}`)
      
      if (isFav) {
        console.log('FavoritesService: Removing from favorites')
        const success = await this.removeFavorite(parcelId, county)
        return success ? false : isFav // If removal failed, keep current status
      } else {
        console.log('FavoritesService: Adding to favorites')
        const result = await this.addFavorite(parcelId, county, parcelAddress)
        return result ? true : false
      }
    } catch (error) {
      console.error('FavoritesService: Error toggling favorite:', error)
      return false
    }
  }

  /**
   * Get all favorites from all users by county (admin only)
   * @param {string} county - County name
   * @returns {Promise<Array>} Array of all favorite parcels for the county
   */
  async getAllFavoritesByCounty(county) {
    try {
      const { data, error } = await supabase
        .from('favorite_parcels')
        .select('*')
        .eq('county', county)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all county favorites:', error)
      return []
    }
  }

  /**
   * Get all favorites from all users (admin only)
   * @returns {Promise<Array>} Array of all favorite parcels
   */
  async getAllFavorites() {
    try {
      const { data, error } = await supabase
        .from('favorite_parcels')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all favorites:', error)
      return []
    }
  }
}

// Create and export singleton instance
export const favoritesService = new FavoritesService()
export default favoritesService
