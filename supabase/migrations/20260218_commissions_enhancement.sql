-- Update get_commissions_due to return all active professionals and monthly stats
CREATE OR REPLACE FUNCTION get_commissions_due(p_user_id UUID)
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  photo_url TEXT,
  total_due DECIMAL(10,2),
  total_earnings_month DECIMAL(10,2),
  total_pending_records BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id as professional_id,
    tm.name as professional_name,
    tm.photo_url,
    -- Sum of unpaid commissions
    COALESCE(SUM(CASE WHEN fr.commission_paid = false THEN fr.commission_value ELSE 0 END), 0) as total_due,
    -- Sum of commissions created in the current month
    COALESCE(SUM(CASE WHEN date_trunc('month', fr.created_at) = date_trunc('month', CURRENT_DATE) THEN fr.commission_value ELSE 0 END), 0) as total_earnings_month,
    -- Count of unpaid records
    COUNT(CASE WHEN fr.commission_paid = false THEN 1 END) as total_pending_records
  FROM team_members tm
  LEFT JOIN finance_records fr ON tm.id = fr.professional_id AND fr.user_id = p_user_id AND fr.commission_value > 0
  WHERE tm.user_id = p_user_id AND tm.active = true
  GROUP BY tm.id, tm.name, tm.photo_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
