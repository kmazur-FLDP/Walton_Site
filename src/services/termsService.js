import { supabase } from '../lib/supabase'

class TermsService {
  // Check if user has accepted current terms
  async hasAcceptedTerms(userId = null) {
    try {
      const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id
      
      if (!currentUserId) {
        throw new Error('No user found')
      }

      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('terms_version', '1.0')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking terms acceptance:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('Error in hasAcceptedTerms:', error)
      return false
    }
  }

  // Record terms acceptance
  async acceptTerms() {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        throw new Error('No authenticated user found')
      }

      const user = userData.user

      // Get client IP and user agent for audit trail
      const userAgent = navigator.userAgent
      
      const acceptanceData = {
        user_id: user.id,
        user_email: user.email,
        terms_version: '1.0',
        user_agent: userAgent,
        accepted_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('terms_acceptance')
        .upsert(acceptanceData, {
          onConflict: 'user_id,terms_version'
        })
        .select()

      if (error) {
        console.error('Error recording terms acceptance:', error)
        throw error
      }

      console.log('Terms acceptance recorded:', data)
      return { success: true, data }
    } catch (error) {
      console.error('Error in acceptTerms:', error)
      return { success: false, error: error.message }
    }
  }

  // Get terms acceptance record for user
  async getTermsAcceptance(userId = null) {
    try {
      const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id
      
      if (!currentUserId) {
        throw new Error('No user found')
      }

      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('*')
        .eq('user_id', currentUserId)
        .order('accepted_at', { ascending: false })

      if (error) {
        console.error('Error fetching terms acceptance:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getTermsAcceptance:', error)
      return []
    }
  }

  // Admin function to get all terms acceptances
  async getAllTermsAcceptances() {
    try {
      const { data, error } = await supabase
        .from('terms_acceptance')
        .select(`
          *,
          user_email
        `)
        .order('accepted_at', { ascending: false })

      if (error) {
        console.error('Error fetching all terms acceptances:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getAllTermsAcceptances:', error)
      return []
    }
  }

  // Admin function to delete terms acceptance for a user
  async deleteTermsAcceptance(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required')
      }

      const { data, error } = await supabase
        .from('terms_acceptance')
        .delete()
        .eq('user_id', userId)
        .select()

      if (error) {
        console.error('Error deleting terms acceptance:', error)
        throw error
      }

      console.log('Terms acceptance deleted:', data)
      return { success: true, data }
    } catch (error) {
      console.error('Error in deleteTermsAcceptance:', error)
      return { success: false, error: error.message }
    }
  }
}

const termsService = new TermsService()
export default termsService