# AgenX — Padrões Supabase

## Cliente

```typescript
import { supabase } from '@/lib/supabase';
```

## Query Básica (SEMPRE com company_id)

```typescript
const { data, error } = await supabase
  .from('appointments')
  .select('id, appointment_time, status, client_name, service_name')
  .eq('company_id', companyId)  // NUNCA esquecer
  .order('appointment_time', { ascending: true });
```

## Insert

```typescript
const { data, error } = await supabase
  .from('appointments')
  .insert({
    company_id: companyId,   // SEMPRE incluir
    client_name: clientName,
    service_name: serviceName,
    appointment_time: datetime,
  })
  .select()
  .single();
```

## Update

```typescript
const { error } = await supabase
  .from('appointments')
  .update({ status: 'cancelled' })
  .eq('id', appointmentId)
  .eq('company_id', companyId);  // Double-check security
```

## Delete (soft delete quando possível)

```typescript
// Soft delete (preferido)
const { error } = await supabase
  .from('clients')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', clientId)
  .eq('company_id', companyId);
```

## business_settings — Configurações do Negócio

```typescript
// Ler configurações
const { data: settings } = await supabase
  .from('business_settings')
  .select('*')
  .eq('company_id', companyId)
  .single();

// Atualizar uma configuração
const { error } = await supabase
  .from('business_settings')
  .update({ monthly_goal: goalValue })
  .eq('company_id', companyId);

// Campos existentes relevantes:
// - monthly_goal: number
// - onboarding_step: number (0-5)
// - tutorial_completed: boolean
// - instagram_handle: string
// - booking_slug: string
// - business_hours: JSON
// - reminder_channels: JSON (novo — para SMS/WhatsApp toggles)
// - setup_progress: JSON (novo — para SetupCopilot)
```

## Edge Functions (server-side)

```typescript
// Chamar Edge Function do frontend
const { data, error } = await supabase.functions.invoke('send-sms-campaign', {
  body: {
    recipients: phoneNumbers,
    message: smsText,
    businessId: companyId,
  },
});
```

## Realtime (quando usar)

```typescript
// Para fila digital — updates ao vivo
const channel = supabase
  .channel('queue-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'queue_entries',
    filter: `company_id=eq.${companyId}`,
  }, (payload) => {
    handleQueueUpdate(payload);
  })
  .subscribe();

// Cleanup no useEffect
return () => { supabase.removeChannel(channel); };
```

## RLS — Padrão para Novas Tabelas

```sql
-- Toda nova tabela DEVE ter RLS ativado
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy de leitura
CREATE POLICY "Users can read own company data"
  ON public.sms_campaigns
  FOR SELECT
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Policy de insert
CREATE POLICY "Users can insert own company data"
  ON public.sms_campaigns
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Policy de update
CREATE POLICY "Users can update own company data"
  ON public.sms_campaigns
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
```

## Nomenclatura de Migrations

```
supabase/migrations/
  YYYYMMDD_HHMMSS_descricao_da_mudanca.sql
  Exemplo: 20260308_120000_sms_campaigns_table.sql
```
