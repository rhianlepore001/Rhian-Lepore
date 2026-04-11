-- Migration: Adicionar constraint UNIQUE para espelhamento de clientes públicos
-- Objetivo: Permitir upsert na tabela 'clients' usando (user_id, phone)
-- Isso é necessário para que o agendamento público crie/atualize clientes no CRM do dono

-- Primeiro, verificar se a constraint já existe (ignorar se existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clients_user_id_phone_unique'
    ) THEN
        -- Remover APENAS duplicatas reais em (user_id, phone)
        -- Manter todas as linhas onde user_id ou phone sejam NULL (não são duplicatas)
        -- Manter a entrada mais antiga (menor id) de cada grupo duplicado
        WITH duplicates AS (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY user_id, phone ORDER BY created_at ASC, id ASC) as rn
            FROM clients
            WHERE user_id IS NOT NULL AND phone IS NOT NULL
        )
        DELETE FROM clients
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

        -- Agora criar a constraint
        ALTER TABLE clients
            ADD CONSTRAINT clients_user_id_phone_unique UNIQUE (user_id, phone);
    END IF;
END $$;

-- Migration: Adicionar coluna source para identificar origem do cliente
-- Existentes recebem 'manual' (pois foram criados antes do sistema público)
-- Novos recebem 'manual' como default (será sobrescrito pelo código quando necessário)
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Atualizar registros existentes que não têm source definido
-- Nenhum existente veio do agendamento online, então marcamos como 'manual'
UPDATE clients SET source = 'manual' WHERE source IS NULL;

COMMENT ON COLUMN clients.source IS 'Fonte de origem do cliente: agendamento_online, manual, importacao, etc';
