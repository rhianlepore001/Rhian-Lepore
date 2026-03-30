-- Migration para US-0409: Activation Event
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS activation_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
