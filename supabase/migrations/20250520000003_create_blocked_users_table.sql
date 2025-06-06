-- Create blocked_users table
CREATE TABLE blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can't block the same person twice
  UNIQUE(blocker_id, blocked_id),
  
  -- Prevent users from blocking themselves
  CHECK (blocker_id != blocked_id)
);

-- Create indexes for performance
CREATE INDEX idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON blocked_users(blocked_id);
CREATE INDEX idx_blocked_users_created_at ON blocked_users(created_at);

-- Enable Row Level Security
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own blocking relationships (both as blocker and blocked)
CREATE POLICY "Users can view their own blocking relationships"
  ON blocked_users
  FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- Users can only insert blocks where they are the blocker
CREATE POLICY "Users can block other users"
  ON blocked_users
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id AND auth.uid() != blocked_id);

-- Users can only delete blocks where they are the blocker (unblock)
CREATE POLICY "Users can unblock users they blocked"
  ON blocked_users
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- No updates allowed (users should delete and recreate if needed)
-- This prevents tampering with block relationships 