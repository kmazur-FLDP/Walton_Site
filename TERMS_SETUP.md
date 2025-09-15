# Terms and Conditions Database Setup

## Overview
This implements a terms and conditions acceptance system that tracks when users accept the terms and prevents access until they do.

## Database Migration Required

You need to create the `terms_acceptance` table in your Supabase database. 

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database/migrations/create_terms_acceptance_table.sql`
4. Click "Run" to execute the migration

### Option 2: Manual SQL Execution
Run the following SQL in your Supabase SQL editor:

```sql
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

-- Create policies
CREATE POLICY "Users can view own terms acceptance" 
ON terms_acceptance FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own terms acceptance" 
ON terms_acceptance FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own terms acceptance" 
ON terms_acceptance FOR UPDATE 
USING (auth.uid() = user_id);

-- Function and trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_terms_acceptance_updated_at 
BEFORE UPDATE ON terms_acceptance 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Features Implemented

### 1. **Terms Modal Component** (`src/components/TermsModal.jsx`)
- Professional modal with scrollable terms
- Requires user to scroll to bottom before accepting
- Checkbox confirmation
- Loading states and proper UX

### 2. **Terms Service** (`src/services/termsService.js`)
- Check if user has accepted current terms version
- Record terms acceptance with audit trail
- Admin functions for compliance reporting

### 3. **Landing Page Integration**
- Automatically checks terms acceptance on page load
- Blocks access until terms are accepted
- Seamless user experience after acceptance

### 4. **Security Features**
- Strong non-disclosure language specifically about real estate agents
- Legal compliance tracking
- Version control for terms updates
- Audit trail with IP and user agent

## Terms Content
The terms specifically prohibit sharing data with:
- Real estate agents or brokers
- Property developers or investors
- Competitors or business partners
- Media or publications
- Social media platforms
- Any individuals outside of the user's company

## Admin Features
Admins can view terms acceptance records through the `termsService.getAllTermsAcceptances()` function for compliance reporting.

## Testing
After running the migration, test the system by:
1. Login as a new user - should see terms modal
2. Accept terms - should be able to access the portal
3. Login again - should not see terms modal (already accepted)
4. Check Supabase database to confirm acceptance was recorded

## Version Updates
To require users to accept new terms:
1. Update the version number in `termsService.js` (currently '1.0')
2. Update the terms content in `TermsModal.jsx`
3. All users will be prompted to accept the new version