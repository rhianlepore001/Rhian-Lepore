-- Fase 8: Adicionar is_owner e commission_rate a team_members
-- is_owner: determinado por user_id = business_id (owner e tambem team member)
-- commission_rate: coluna referenciada em RPCs mas sem migration explicita

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT false;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;

-- Backfill: owner = user_id = business_id
UPDATE team_members SET is_owner = true WHERE user_id = business_id;