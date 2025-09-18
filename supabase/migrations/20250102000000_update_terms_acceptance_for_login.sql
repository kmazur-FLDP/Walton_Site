-- Add columns for login-based terms acceptance tracking
-- This allows multiple terms acceptances per user (one per login session)

-- Add new columns
ALTER TABLE terms_acceptance 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS acceptance_type VARCHAR(50) DEFAULT 'voluntary';

-- Drop the unique constraint since we now want multiple records per user
DROP INDEX IF EXISTS terms_acceptance_user_version_idx;

-- Create new index for performance on common queries
CREATE INDEX IF NOT EXISTS terms_acceptance_user_session_idx 
ON terms_acceptance(user_id, session_id);

CREATE INDEX IF NOT EXISTS terms_acceptance_type_idx 
ON terms_acceptance(acceptance_type);

CREATE INDEX IF NOT EXISTS terms_acceptance_created_at_idx 
ON terms_acceptance(created_at DESC);

-- Update RLS policies to allow multiple insertions
-- The existing policies should work fine, but let's make sure insert policy is correct
DROP POLICY IF EXISTS "Users can insert own terms acceptance" ON terms_acceptance;

CREATE POLICY "Users can insert own terms acceptance" 
ON terms_acceptance FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add comment to document the change
COMMENT ON COLUMN terms_acceptance.session_id IS 'Unique identifier for the login session when terms were accepted';
COMMENT ON COLUMN terms_acceptance.acceptance_type IS 'Type of acceptance: voluntary, login_required, admin_reset, etc.';
COMMENT ON TABLE terms_acceptance IS 'Tracks all terms and conditions acceptances, including multiple per user for login-based requirements';