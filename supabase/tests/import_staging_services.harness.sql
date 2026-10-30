-- Índice que já existe em produção (migração 20261027083640) e serve de alvo para os vínculos de importação.
CREATE UNIQUE INDEX clients_tenant_id_dependent_fk ON public.clients(user_id, id);
CREATE TABLE public.services (id uuid PRIMARY KEY, user_id text NOT NULL, name text NOT NULL);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner services" ON public.services FOR ALL TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;

INSERT INTO public.services(id, user_id, name) VALUES ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'Serviço fictício'), ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b0', 'Serviço fictício B');
