import { supabase } from '../src/lib/supabase.js'
import fs from 'fs'
import path from 'path'

async function runMigration() {
  try {
    console.log('Reading migration file...')
    const migrationPath = path.join(process.cwd(), 'database', 'migrations', 'create_terms_acceptance_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Executing migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }
    
    console.log('Migration completed successfully!')
    console.log('Terms acceptance table created.')
    
  } catch (error) {
    console.error('Error running migration:', error)
    process.exit(1)
  }
}

runMigration()