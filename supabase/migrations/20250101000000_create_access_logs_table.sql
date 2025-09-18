-- Create access_logs table for tracking user access patterns and IP addresses
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(255), -- Store email even if user is deleted
  ip_address INET NOT NULL,
  user_agent TEXT,
  event_type VARCHAR(50) NOT NULL DEFAULT 'login', -- 'login', 'logout', 'session_refresh', 'access_denied'
  success BOOLEAN NOT NULL DEFAULT true,
  location_country VARCHAR(100), -- From IP geolocation
  location_region VARCHAR(100),
  location_city VARCHAR(100),
  location_coords POINT, -- Latitude, longitude
  session_id VARCHAR(255), -- To track session continuity
  referrer TEXT, -- Where they came from
  device_info JSONB, -- Parsed user agent details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_event_type ON access_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_success ON access_logs(success);
CREATE INDEX IF NOT EXISTS idx_access_logs_email ON access_logs(email);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_access_logs_user_date ON access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_date ON access_logs(ip_address, created_at DESC);

-- Enable Row Level Security
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin can view all access logs" ON access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create policy for inserting logs (system level)
CREATE POLICY "System can insert access logs" ON access_logs
  FOR INSERT WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE access_logs IS 'Tracks user access patterns, IP addresses, and login activities for security monitoring';
COMMENT ON COLUMN access_logs.ip_address IS 'Client IP address for geographic and security analysis';
COMMENT ON COLUMN access_logs.event_type IS 'Type of access event: login, logout, session_refresh, access_denied';
COMMENT ON COLUMN access_logs.device_info IS 'Parsed user agent information including browser, OS, device type';
COMMENT ON COLUMN access_logs.location_coords IS 'Geographic coordinates from IP geolocation for mapping';