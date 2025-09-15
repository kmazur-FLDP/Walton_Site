import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTermsTable() {
  try {
    console.log('Creating terms_acceptance table...')
    
    // Create the table using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create terms_acceptance table to track user terms and conditions acceptance
        CREATE TABLE IF NOT EXISTS terms_acceptance (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          terms_version VARCHAR(10) DEFAULT '1.0',
          user_email VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create unique constraint to ensure one acceptance per user per version
        CREATE UNIQUE INDEX IF NOT EXISTS terms_acceptance_user_version_idx 
        ON terms_acceptance(user_id, terms_version);

        -- Enable Row Level Security
        ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;

        -- Create policy for users to read their own terms acceptance
        CREATE POLICY "Users can view own terms acceptance" 
        ON terms_acceptance FOR SELECT 
        USING (auth.uid() = user_id);

        -- Create policy for users to insert their own terms acceptance
        CREATE POLICY "Users can insert own terms acceptance" 
        ON terms_acceptance FOR INSERT 
        WITH CHECK (auth.uid() = user_id);

        -- Create policy for users to update their own terms acceptance (if needed)
        CREATE POLICY "Users can update own terms acceptance" 
        ON terms_acceptance FOR UPDATE 
        USING (auth.uid() = user_id);

        -- Function to automatically update the updated_at column
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Create trigger for updated_at
        CREATE TRIGGER update_terms_acceptance_updated_at 
        BEFORE UPDATE ON terms_acceptance 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    })

    if (error) {
      console.error('Error creating table:', error)
    } else {
      console.log('✅ Terms acceptance table created successfully!')
    }
  } catch (err) {
    console.error('Script error:', err)
  }
}

createTermsTable()