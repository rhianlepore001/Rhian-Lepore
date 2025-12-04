-- Add tutorial_completed column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT false;

-- Update existing users to show tutorial (set to false)
UPDATE profiles
SET tutorial_completed = false
WHERE tutorial_completed IS NULL;
