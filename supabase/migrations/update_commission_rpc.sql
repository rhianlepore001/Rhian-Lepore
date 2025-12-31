-- RPC to update a commission record
-- Applied: 2025-12-16

CREATE OR REPLACE FUNCTION update_commission_record(
  p_record_id UUID,
  p_new_value DECIMAL(10,2),
  p_new_rate DECIMAL(5,2)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user_id of the record owner to ensure permission
  SELECT user_id INTO v_user_id
  FROM finance_records
  WHERE id = p_record_id;

  -- Security check: ensure the record belongs to the authenticated user
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update the record
  UPDATE finance_records
  SET 
    commission_value = p_new_value,
    commission_rate = p_new_rate,
    updated_at = NOW()
  WHERE id = p_record_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_commission_record(UUID, DECIMAL, DECIMAL) TO authenticated;
