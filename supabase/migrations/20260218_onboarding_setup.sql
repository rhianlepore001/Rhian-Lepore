-- Add onboarding tracking columns to business_settings
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;

-- Function to update onboarding step
CREATE OR REPLACE FUNCTION update_onboarding_step(
  p_user_id UUID,
  p_step INTEGER,
  p_completed BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO business_settings (user_id, onboarding_step, onboarding_completed)
  VALUES (p_user_id, p_step, p_completed)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    onboarding_step = GREATEST(business_settings.onboarding_step, p_step),
    onboarding_completed = CASE WHEN p_completed THEN true ELSE business_settings.onboarding_completed END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
