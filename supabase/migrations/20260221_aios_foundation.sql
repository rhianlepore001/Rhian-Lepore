-- AIOS Engine Foundation Migration
-- Purpose: Setup Feature Flags and System Memory (Logs) for AIOS

-- 1. Extend Profiles with Feature Flags
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS aios_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS aios_features JSONB DEFAULT '{}'::jsonb;

-- 2. Create AIOS Logs table (System Memory)
CREATE TABLE IF NOT EXISTS aios_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    agent_name TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'suggestion', 'execution', 'learning'
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE aios_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view their own AIOS logs" ON aios_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AIOS logs" ON aios_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_aios_logs_user_agent ON aios_logs(user_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_aios_logs_created_at ON aios_logs(created_at);

-- 6. Helper function for learning
COMMENT ON TABLE aios_logs IS 'Armazena a memória e logs de decisões dos agentes de IA do AIOS.';
