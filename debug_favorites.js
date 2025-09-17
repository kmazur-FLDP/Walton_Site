// Debug script to check favorites in database
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugFavorites() {
  try {
    console.log('Checking all favorite_parcels in database...')
    
    const { data, error } = await supabase
      .from('favorite_parcels')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return
    }

    console.log('All favorites found:', data.length)
    console.log('Sample favorites:', data.slice(0, 5))
    
    // Group by county
    const byCounty = data.reduce((acc, fav) => {
      acc[fav.county] = (acc[fav.county] || 0) + 1
      return acc
    }, {})
    
    console.log('Favorites by county:', byCounty)
    
  } catch (err) {
    console.error('Error:', err)
  }
}

debugFavorites()