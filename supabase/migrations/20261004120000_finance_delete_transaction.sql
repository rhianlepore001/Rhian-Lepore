-- RPC atômica para excluir lançamento do Financeiro.
-- Função nova: não existia em produção. Não recria get_commissions_due nem constraints.

CREATE OR REPLACE FUNCTION public.delete_finance_transaction(p_record_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant text;
  v_appointment_id uuid;
  v_record public.finance_records%ROWTYPE;
  v_kind text;
  v_staff_name text;
  v_paid_at timestamptz;
  v_is_product boolean := false;
  v_is_commission_payment boolean := false;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid::text AND p.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Apenas o dono pode excluir transações.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_tenant := v_uid::text;

  SELECT a.id
    INTO v_appointment_id
    FROM public.appointments a
   WHERE a.id = p_record_id
     AND a.user_id = v_tenant
     AND a.status = 'Completed'
     FOR UPDATE;

  IF FOUND THEN
    PERFORM 1
      FROM public.finance_records fr
     WHERE fr.appointment_id = v_appointment_id
       AND fr.user_id = v_tenant
       FOR UPDATE;

    SELECT COALESCE(tm.name, fr.barber_name, 'o profissional'),
           COALESCE(fr.commission_paid_at, (
             SELECT max(cp.paid_at)
               FROM public.commission_payments cp
              WHERE cp.user_id = v_tenant
                AND cp.professional_id IS NOT DISTINCT FROM fr.professional_id
                AND cp.status = 'paid'
           ))
      INTO v_staff_name, v_paid_at
      FROM public.finance_records fr
      LEFT JOIN public.team_members tm ON tm.id = fr.professional_id
     WHERE fr.appointment_id = v_appointment_id
       AND fr.user_id = v_tenant
       AND COALESCE(fr.commission_paid, false) = true
       AND COALESCE(fr.commission_value, 0) > 0
     LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'commission_already_paid',
        'staff_name', COALESCE(v_staff_name, 'o profissional'),
        'paid_at', v_paid_at
      );
    END IF;

    DELETE FROM public.finance_records
     WHERE appointment_id = v_appointment_id
       AND user_id = v_tenant;

    DELETE FROM public.appointments
     WHERE id = v_appointment_id
       AND user_id = v_tenant;

    RETURN jsonb_build_object('ok', true, 'kind', 'appointment');
  END IF;

  SELECT *
    INTO v_record
    FROM public.finance_records fr
   WHERE fr.id = p_record_id
     AND fr.user_id = v_tenant
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.commission_payments cp
     WHERE cp.user_id = v_record.user_id
       AND cp.professional_id IS NOT DISTINCT FROM v_record.professional_id
       AND cp.status = 'paid'
       AND round(COALESCE(cp.amount, 0), 2) = round(COALESCE(v_record.commission_value, 0), 2)
       AND v_record.type = 'expense'
       AND COALESCE(v_record.commission_paid, false) = true
       AND COALESCE(v_record.revenue, 0) = 0
       AND COALESCE(v_record.commission_value, 0) > 0
       AND cp.paid_at IS NOT NULL
       AND v_record.created_at >= cp.paid_at - interval '5 minutes'
       AND v_record.created_at <= cp.paid_at + interval '5 minutes'
  ) INTO v_is_commission_payment;

  IF v_is_commission_payment THEN
    RETURN jsonb_build_object('ok', false, 'error', 'commission_payment_record');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id = v_record.id
  ) INTO v_is_product;

  IF v_is_product THEN
    IF COALESCE(v_record.commission_paid, false) = true
       AND COALESCE(v_record.commission_value, 0) > 0 THEN
      v_staff_name := COALESCE(
        (SELECT tm.name FROM public.team_members tm WHERE tm.id = v_record.professional_id),
        v_record.barber_name,
        'o profissional'
      );
      v_paid_at := COALESCE(
        v_record.commission_paid_at,
        (SELECT max(cp.paid_at)
           FROM public.commission_payments cp
          WHERE cp.user_id = v_tenant
            AND cp.professional_id IS NOT DISTINCT FROM v_record.professional_id
            AND cp.status = 'paid')
      );
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'commission_already_paid',
        'staff_name', COALESCE(v_staff_name, 'o profissional'),
        'paid_at', v_paid_at
      );
    END IF;

    UPDATE public.products p
       SET stock_quantity = p.stock_quantity + s.quantity
      FROM public.product_sales s
     WHERE s.finance_record_id = v_record.id
       AND p.id = s.product_id;

    DELETE FROM public.product_sales WHERE finance_record_id = v_record.id;
    DELETE FROM public.finance_records WHERE id = v_record.id AND user_id = v_tenant;
    RETURN jsonb_build_object('ok', true, 'kind', 'product_sale');
  END IF;

  IF v_record.appointment_id IS NOT NULL THEN
    SELECT a.id
      INTO v_appointment_id
      FROM public.appointments a
     WHERE a.id = v_record.appointment_id
       AND a.user_id = v_tenant
       FOR UPDATE;

    IF FOUND THEN
      PERFORM 1
        FROM public.finance_records fr
       WHERE fr.appointment_id = v_appointment_id
         AND fr.user_id = v_tenant
         FOR UPDATE;

      SELECT COALESCE(tm.name, fr.barber_name, 'o profissional'),
             COALESCE(fr.commission_paid_at, (
               SELECT max(cp.paid_at)
                 FROM public.commission_payments cp
                WHERE cp.user_id = v_tenant
                  AND cp.professional_id IS NOT DISTINCT FROM fr.professional_id
                  AND cp.status = 'paid'
             ))
        INTO v_staff_name, v_paid_at
        FROM public.finance_records fr
        LEFT JOIN public.team_members tm ON tm.id = fr.professional_id
       WHERE fr.appointment_id = v_appointment_id
         AND fr.user_id = v_tenant
         AND COALESCE(fr.commission_paid, false) = true
         AND COALESCE(fr.commission_value, 0) > 0
       LIMIT 1;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'commission_already_paid',
          'staff_name', COALESCE(v_staff_name, 'o profissional'),
          'paid_at', v_paid_at
        );
      END IF;

      DELETE FROM public.finance_records
       WHERE appointment_id = v_appointment_id
         AND user_id = v_tenant;

      DELETE FROM public.appointments
       WHERE id = v_appointment_id
         AND user_id = v_tenant;

      RETURN jsonb_build_object('ok', true, 'kind', 'appointment');
    END IF;
  END IF;

  IF v_record.type = 'expense' THEN
    v_kind := 'expense';
  ELSE
    v_kind := 'manual';
  END IF;

  DELETE FROM public.finance_records WHERE id = v_record.id AND user_id = v_tenant;
  RETURN jsonb_build_object('ok', true, 'kind', v_kind);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_finance_transaction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_finance_transaction(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.delete_finance_transaction(uuid) IS
  'Owner-only: exclui lançamento do Financeiro. Appointment Completed apaga finance_records e depois o atendimento; venda de produto apaga só o row; bloqueia comissão paga e despesa de commission_payments.';
