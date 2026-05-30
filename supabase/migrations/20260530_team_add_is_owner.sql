-- Fase 8: Adicionar is_owner a team_members se nao existir
-- Determinado por: user_id = business_id (owner e tambem team member)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT false;

-- Backfill: owner = user_id = business_id
UPDATE team_members SET is_owner = true WHERE user_id = business_id;