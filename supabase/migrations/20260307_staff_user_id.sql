-- ==========================================================================
-- US-015C: STAFF USER ID + TEAM MEMBER LINK
-- ==========================================================================
-- Adiciona staff_user_id para vincular a conta auth do funcionário
-- ao registro de profissional no team_members do dono.
-- ==========================================================================

-- Adicionar coluna staff_user_id
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS staff_user_id UUID REFERENCES auth.users(id);

-- Criar índice para consultas rápidas por staff_user_id
CREATE INDEX IF NOT EXISTS idx_team_members_staff_user_id ON team_members(staff_user_id) WHERE staff_user_id IS NOT NULL;
