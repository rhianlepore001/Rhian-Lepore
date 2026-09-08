-- Senha "ativa" esquecida de um dia anterior (waiting/calling/serving) bloqueava uma nova
-- entrada do mesmo telefone pelo índice uq_queue_active_phone_per_business, enquanto o
-- painel, o quadro público e find_active_queue_entry_by_phone (recorte diário) não a viam.
-- Resultado: "Este telefone ja esta na fila" sem senha para abrir.
-- Antes de inserir uma senha nova, as senhas ativas do mesmo telefone de dias anteriores
-- são encerradas como 'cancelled'. Vale para o QR (join_queue_entry) e para a entrada manual.

CREATE OR REPLACE FUNCTION public.queue_expire_stale_active_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('waiting', 'calling', 'serving') THEN
    UPDATE public.queue_entries
    SET status = 'cancelled',
        closed_at = COALESCE(closed_at, NOW())
    WHERE business_id = NEW.business_id
      AND status IN ('waiting', 'calling', 'serving')
      AND joined_at < date_trunc('day', now())
      AND public.normalize_phone_digits(client_phone) = public.normalize_phone_digits(NEW.client_phone);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_expire_stale_active ON public.queue_entries;
CREATE TRIGGER trg_queue_expire_stale_active
  BEFORE INSERT ON public.queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_expire_stale_active_before_insert();

-- Senhas ativas de dias anteriores já existentes: encerradas (a fila é diária; nenhuma
-- tela as mostra). Em seguida o índice de unicidade de telefone ativo por fila, previsto em
-- 20260706000002 e nunca aplicado em produção, passa a valer.
UPDATE public.queue_entries
SET status = 'cancelled',
    closed_at = COALESCE(closed_at, NOW())
WHERE status IN ('waiting', 'calling', 'serving')
  AND joined_at < date_trunc('day', now());

CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_active_phone_per_business
  ON public.queue_entries (business_id, public.normalize_phone_digits(client_phone))
  WHERE status IN ('waiting', 'calling', 'serving');
