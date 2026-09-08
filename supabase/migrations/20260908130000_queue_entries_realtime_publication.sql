-- Migration: habilita realtime (postgres_changes) para queue_entries
-- Data: 2026-09-08
-- Contexto: a publication `supabase_realtime` estava vazia em produção. O painel
-- do gestor (/#/fila) assina `postgres_changes` em queue_entries para atualizar
-- quando um cliente entra pelo QR, sai da fila ou muda de status — sem a tabela
-- na publication a assinatura nunca dispara e o painel só atualiza com reload.
-- O RLS existente em queue_entries continua valendo para o que cada assinante recebe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'queue_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
  END IF;
END
$$;
