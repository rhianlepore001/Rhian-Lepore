# 🚀 ROADMAP — Semana 2 (3-7 Março 2026)

> **Status Semana 1:** ✅ COMPLETA (2 stories done, 4 in-progress, 13 stories criadas)
> **Timeline Semana 2:** MON 3 Mar → FRI 7 Mar (16h implementação + 4h testing)
> **Agentes:** Dueto Claude + Agente Intermediário (Antigravity IDE)

---

## ⚠️ VALIDAÇÕES PRÉ-SEMANA 2 (CRÍTICO)

### **Tarefa 0.1: Corrigir US-006 Status**
```
Arquivo: docs/stories/README.md
Linha: 14
Ação: Mudar status de "in-progress" → "deleted"
Razão: Clerk migration descartada (vide .ai/CLERK_DECISION.md)

ANTES:
| **US-006** | **Migração Completa para Clerk Auth** | **in-progress** | ...

DEPOIS:
| **US-006** | **[DESCARTADO] Migração Clerk Auth** | **deleted** | ...
```

### **Tarefa 0.2: Testar Backup Script**
```
Status: Script criado em scripts/backup-supabase.js
Ação:
1. Preencher .env.local:
   SUPABASE_URL=https://<seu-project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<sua-chave-aqui>

2. Rodar: npm run backup
3. Validar: ls -la backups/ (arquivo JSON deve existir)
4. Commitar: git add scripts/backup-supabase.js && git commit -m "test: backup script validated"
```

### **Tarefa 0.3: Testar 2FA Login**
```
Status: SecuritySettings.tsx implementado
Ação:
1. Abrir app: npm run dev
2. Login com usuário de teste
3. Ir para Settings → Security
4. Ativar 2FA (Email ou TOTP)
5. Logout completo
6. Login novamente + validar que código é solicitado
7. Validar: 2FA desativável depois

Checkpoint: ✅ 2FA fluxo completo funciona
```

### **Tarefa 0.4: Validar RLS Multi-Tenant**
```
Status: RLS preparado no Supabase
Ação:
1. Abrir Supabase Console
2. Verificar RLS enabled em: companies, users, appointments, services, transactions
3. Validar policies usam company_id
4. Testar: Login em 2 empresas diferentes
   - Empresa A vê apenas seus dados
   - Empresa B vê apenas seus dados
   - Nenhuma contamina a outra

Checkpoint: ✅ RLS isolamento confirmado
```

---

## 🎯 IMPLEMENTAÇÃO SEMANA 2

### **Decisões Arquiteturais Finalizadas**

| Decisão | Recomendação | Documentação |
|---------|--------------|--------------|
| **Priorização US-009→013** | US-009 → 010 → 011 (bloqueadores lógicos) | `.ai/CLERK_DECISION.md` |
| **Soft Delete (US-012)** | Apenas coluna `deleted_at` (simples + eficaz) | Story US-012 |
| **Comissões (US-013)** | Suportar AMBOS (fixas + percentuais) | Story US-013 |

---

## 📅 MON 3 MAR — US-009: Radar de Lucro (Churn Detection)

**Tempo Estimado:** 4h
**Bloqueadores:** Nenhum
**Agente:** backend-specialist

### **Por Quê**
Proprietários de salões precisam de alertas automáticos quando clientes estão em risco de churn (parou de agendar). Discovery-notes menciona "churn detection" como feature core do AgenX.

### **O Que**
1. Criar algoritmo de detecção de churn baseado em:
   - Clientes com última visita > 60 dias
   - Descarga anormal em volume de agendamentos
   - Score de risco (0-100)

2. Criar API/hook `useChurnRiskClients`:
   - Retorna lista de clientes com score > 50
   - Inclui data última visita, volume histórico, recomendação

3. Integrar em `Finance.tsx`:
   - Card "Radar de Lucro" exibindo top 5 clientes em risco
   - Action: Clicar para ir ao CRM cliente

### **Critérios de Aceitação**
- [ ] Algoritmo de churn implementado em `lib/churn.ts`
- [ ] Hook `useChurnRiskClients` criado
- [ ] Component `ChurnRadarCard.tsx` renderiza corretamente
- [ ] Integrado em `pages/Finance.tsx`
- [ ] RLS validada (mostra apenas dados da empresa logada)
- [ ] Teste manual: Radam exibe corretamente para 2+ empresas
- [ ] Lint passa
- [ ] Typecheck passa

### **Arquivos Impactados**
```
NOVO:
- lib/churn.ts (algoritmo + query)
- hooks/useChurnRiskClients.ts
- components/ChurnRadarCard.tsx

MODIFICADO:
- pages/Finance.tsx (integrar card)
- docs/stories/2026-03-01-US-009-radar-lucro.md (atualizar progresso)
```

### **Tarefas Técnicas**

#### **T1: Criar lib/churn.ts**
```typescript
// lib/churn.ts
export interface ChurnRiskClient {
  id: string
  name: string
  lastVisit: string
  daysSinceLastVisit: number
  appointmentCount30Days: number
  appointmentCountHistorical: number
  churnScore: number // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
}

export async function getChurnRiskClients(
  supabase: SupabaseClient,
  companyId: string,
  riskThreshold: number = 50
): Promise<ChurnRiskClient[]> {
  // 1. Query clientes + última visita + volume histórico
  // 2. Calcular churnScore:
  //    - daysSinceLastVisit > 60 = +40 pontos
  //    - appointmentCount30Days === 0 = +30 pontos
  //    - appointmentCountHistorical > 0 && agora === 0 = +20 pontos
  //    - Total máx 100
  // 3. Retornar apenas score >= riskThreshold
  // 4. Ordenar por score DESC
}
```

#### **T2: Criar hooks/useChurnRiskClients.ts**
```typescript
export function useChurnRiskClients() {
  const [clients, setClients] = useState<ChurnRiskClient[]>([])
  const [loading, setLoading] = useState(true)
  const { supabaseClient, companyId } = useAuth()

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      try {
        const data = await getChurnRiskClients(supabaseClient, companyId)
        setClients(data)
      } catch (error) {
        logger.error('Failed to load churn data', { error })
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId, supabaseClient])

  return { clients, loading }
}
```

#### **T3: Criar components/ChurnRadarCard.tsx**
```typescript
export function ChurnRadarCard() {
  const { clients, loading } = useChurnRiskClients()

  if (loading) return <LoadingCard />

  return (
    <BrutalCard title="🎯 Radar de Lucro" className="...">
      {clients.length === 0 ? (
        <p>Nenhum cliente em risco detectado ✅</p>
      ) : (
        <div className="space-y-2">
          {clients.slice(0, 5).map(client => (
            <div key={client.id} className="flex justify-between">
              <span>{client.name}</span>
              <span className="text-red-500">{client.churnScore}</span>
            </div>
          ))}
        </div>
      )}
    </BrutalCard>
  )
}
```

#### **T4: Integrar em pages/Finance.tsx**
```typescript
// Adicionar após Finance Doctor Card
<ChurnRadarCard />
```

### **Teste Manual**
```
1. Abrir Finance page
2. Validar "Radar de Lucro" aparece
3. Validar score exibido (0-100)
4. Validar clientes ordenados por risco DESC
5. Logout + login em outra empresa
6. Validar dados diferentes = isolamento RLS ✅
```

### **Definição de Pronto**
- [ ] Lint: OK (`npm run lint`)
- [ ] Typecheck: OK (`npm run typecheck`)
- [ ] Teste manual: OK (5 passos acima)
- [ ] RLS: Validado (2 empresas isoladas)
- [ ] Commit: `feat(finance): implement churn detection radar`

---

## 📅 TUE 4 MAR — US-010: Copywriter IA (WhatsApp Messages)

**Tempo Estimado:** 3h
**Bloqueadores:** ✅ US-009 (precisa de churn clients)
**Agente:** backend-specialist

### **Por Quê**
Salões/barbearias precisam reengajar clientes em risco de churn. Copywriter IA gera mensagens WhatsApp personalizadas baseadas no contexto (último serviço, tempo sem visita, preferências).

### **O Que**
1. Usar Gemini API para gerar copywriting inteligente:
   - Input: `{ clientName, lastService, daysSinceLastVisit, churnScore }`
   - Output: Mensagem WhatsApp natural + CTA (agendar, desconto, etc.)

2. Salvar templates gerados em `messages` table

3. Button em `ChurnRadarCard`:
   - Clica em cliente → gera mensagem → copia para WhatsApp link

### **Critérios de Aceitação**
- [ ] Função `generateChurnMessage` em `lib/gemini.ts`
- [ ] Hook `useGenerateMessage` criado
- [ ] Button "Gerar Mensagem" em ChurnRadarCard funciona
- [ ] Mensagens salvas em Supabase
- [ ] RLS: Apenas proprietário vê/envia mensagens da sua empresa
- [ ] Teste manual: Gerar 3 mensagens diferentes
- [ ] Lint + Typecheck pass
- [ ] UI: Copy-to-clipboard funciona

### **Arquivos Impactados**
```
NOVO:
- hooks/useGenerateMessage.ts

MODIFICADO:
- lib/gemini.ts (adicionar generateChurnMessage)
- components/ChurnRadarCard.tsx (adicionar button)
- pages/Finance.tsx (se necessário)
- docs/stories/2026-03-01-US-010-copywriter-ia.md
```

### **Tarefas Técnicas**

#### **T1: Estender lib/gemini.ts**
```typescript
export async function generateChurnMessage(
  clientData: {
    name: string
    lastService: string
    daysSinceLastVisit: number
    churnScore: number
  }
): Promise<string> {
  const prompt = `
    Gere uma mensagem WhatsApp curta e persuasiva para ${clientData.name}.
    Contexto: Última visita foi ${clientData.daysSinceLastVisit} dias atrás
    (serviço: ${clientData.lastService}).
    Score de risco: ${clientData.churnScore}/100.

    Requisitos:
    - Max 160 caracteres
    - Personalizada (use nome)
    - CTA clara (agendar/desconto)
    - Tom amigável
  `

  const result = await model.generateContent(prompt)
  return result.response.text()
}
```

#### **T2: Criar hooks/useGenerateMessage.ts**
```typescript
export function useGenerateMessage() {
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const generate = async (clientData: ClientChurnData) => {
    setLoading(true)
    try {
      const msg = await generateChurnMessage(clientData)
      setMessage(msg)
      // Salvar em Supabase se necessário
    } finally {
      setLoading(false)
    }
  }

  return { message, loading, generate }
}
```

#### **T3: Integrar em ChurnRadarCard.tsx**
```typescript
// Adicionar button em cada cliente:
<button
  onClick={() => generateMessage(client)}
  className="text-blue-500"
>
  💬 Gerar Mensagem
</button>

// Exibir mensagem gerada em modal/popover
// Button "Copiar para WhatsApp"
```

### **Teste Manual**
```
1. Abrir Finance → Radar de Lucro
2. Clicar em cliente com churnScore > 50
3. Button "Gerar Mensagem"
4. Validar mensagem gerada (natural, com CTA)
5. Copiar → WhatsApp funciona
6. Enviar mensagem para cliente real (teste!)
7. Validar isolamento RLS (outra empresa não vê)
```

---

## 📅 WED 5 MAR — US-011: Deep Link WhatsApp Integration

**Tempo Estimado:** 3h
**Bloqueadores:** ✅ US-010 (precisa de mensagens geradas)
**Agente:** frontend-specialist

### **Por Quê**
Usuários precisam enviar mensagens WhatsApp DIRETAMENTE do app (sem copiar/colar). Deep links permitem:
- Clicar "Enviar WhatsApp" → abre WhatsApp pré-preenchido
- Cliente recebe agendamento link + mensagem personalizada

### **O Que**
1. Usar WhatsApp API deep link:
   ```
   https://wa.me/{phoneNumber}?text={encodedMessage}
   ```

2. Button "Enviar WhatsApp" em ChurnRadarCard:
   - Clica → abre WhatsApp (ou Web se desktop)
   - Mensagem pré-preenchida
   - Inclui link de agendamento público (PublicBooking)

3. Rastrear envio em audit logs

### **Critérios de Aceitação**
- [ ] Função `generateWhatsAppDeepLink` criada
- [ ] Button "Enviar WhatsApp" renderiza
- [ ] Deep link abre WhatsApp corretamente
- [ ] Mensagem pré-preenchida com copywriting + agendamento link
- [ ] Audit log registra envio
- [ ] Teste manual: Enviar para número real (validation)
- [ ] Mobile responsivo (testa em mobile)
- [ ] Lint + Typecheck pass

### **Arquivos Impactados**
```
NOVO:
- utils/whatsapp.ts (deep link generation)

MODIFICADO:
- components/ChurnRadarCard.tsx (adicionar button WhatsApp)
- lib/auditLogs.ts (registrar envios)
- docs/stories/2026-03-01-US-011-deep-link-whatsapp.md
```

### **Tarefas Técnicas**

#### **T1: Criar utils/whatsapp.ts**
```typescript
export function generateWhatsAppDeepLink(
  phoneNumber: string,
  message: string,
  bookingLink?: string
): string {
  const fullMessage = bookingLink
    ? `${message}\n\n🔗 Agendar: ${bookingLink}`
    : message

  const encoded = encodeURIComponent(fullMessage)
  return `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encoded}`
}

export function openWhatsApp(phoneNumber: string, message: string) {
  const link = generateWhatsAppDeepLink(phoneNumber, message)
  window.open(link, '_blank')
}
```

#### **T2: Integrar em ChurnRadarCard.tsx**
```typescript
// Adicionar button:
<button
  onClick={() => {
    const bookingUrl = `${window.location.origin}/#/public-booking?establishment=${companyId}`
    openWhatsApp(client.phoneNumber, message, bookingUrl)

    // Audit log
    logAudit('whatsapp_message_sent', { clientId: client.id })
  }}
  className="text-green-500"
>
  ✅ Enviar WhatsApp
</button>
```

#### **T3: Audit Log**
```typescript
// lib/auditLogs.ts
export async function logWhatsAppSent(
  supabase: SupabaseClient,
  companyId: string,
  clientId: string,
  message: string
) {
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    action: 'whatsapp_message_sent',
    entity_type: 'client',
    entity_id: clientId,
    metadata: { message },
    created_at: new Date().toISOString()
  })
}
```

### **Teste Manual**
```
1. Abrir Finance → ChurnRadarCard
2. Validar cliente tem phoneNumber
3. Clicar "Enviar WhatsApp"
4. Validar WhatsApp abre com mensagem pré-preenchida
5. Enviar mensagem para número de teste
6. Validar audit log registrado
7. Testar em mobile (deve abrir app WhatsApp)
8. Testar em desktop (deve abrir WhatsApp Web)
```

---

## 📅 THU 6 MAR — US-012: Soft Delete + Lixeira (Trash System)

**Tempo Estimado:** 2h
**Bloqueadores:** Nenhum
**Agente:** backend-specialist

### **Por Quê**
Quando usuário deleta dado (cliente, agendamento, transação), é melhor "soft delete" do que hard delete:
- Recuperação acidental
- Conformidade legal (auditoria)
- Menos alerta/fricção do usuário ("Tem certeza?")

### **O Que**
1. Adicionar coluna `deleted_at` (timestamp) em:
   - `clients`
   - `appointments`
   - `transactions`
   - `services`

2. Criar views que filtram `deleted_at IS NULL`:
   - `clients_active`
   - `appointments_active`
   - `transactions_active`
   - `services_active`

3. UI: Button "Excluir" → soft delete + mostrar em Lixeira
4. Lixeira page: Recuperar ou hard delete permanentemente

### **Critérios de Aceitação**
- [ ] Migrations criadas: `deleted_at` coluna em 4 tabelas
- [ ] Views criadas: `*_active` para cada tabela
- [ ] RLS atualizada: Views usam company_id
- [ ] Components atualizados: Button "Excluir" vs "Restaurar"
- [ ] Lixeira page criada (`pages/Trash.tsx`)
- [ ] Teste manual: Deletar cliente → aparece em Lixeira
- [ ] Teste manual: Restaurar cliente → some de Lixeira
- [ ] Teste manual: Hard delete (permanente)
- [ ] Lint + Typecheck pass

### **Arquivos Impactados**
```
NOVO:
- supabase/migrations/20260306_add_soft_delete.sql
- pages/Trash.tsx
- components/TrashBin.tsx

MODIFICADO:
- lib/supabase.ts (queries atualizadas para usar *_active views)
- Todos os components que deletam (adicionar soft delete)
- docs/stories/2026-03-01-US-012-soft-delete.md
```

### **Tarefas Técnicas**

#### **T1: Criar migration SQL**
```sql
-- supabase/migrations/20260306_add_soft_delete.sql

ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE appointments ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE services ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Views para filtrar deleted
CREATE VIEW clients_active AS
  SELECT * FROM clients WHERE deleted_at IS NULL;

CREATE VIEW appointments_active AS
  SELECT * FROM appointments WHERE deleted_at IS NULL;

CREATE VIEW transactions_active AS
  SELECT * FROM transactions WHERE deleted_at IS NULL;

CREATE VIEW services_active AS
  SELECT * FROM services WHERE deleted_at IS NULL;

-- RLS policies nas views (copiar de tabelas originais)
```

#### **T2: Criar função soft delete**
```typescript
// lib/softDelete.ts
export async function softDeleteClient(
  supabase: SupabaseClient,
  clientId: string,
  companyId: string
) {
  await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('company_id', companyId)
}

export async function restoreClient(
  supabase: SupabaseClient,
  clientId: string,
  companyId: string
) {
  await supabase
    .from('clients')
    .update({ deleted_at: null })
    .eq('id', clientId)
    .eq('company_id', companyId)
}
```

#### **T3: Criar pages/Trash.tsx**
```typescript
// pages/Trash.tsx
export function Trash() {
  const [deletedClients, setDeletedClients] = useState([])
  const [deletedAppointments, setDeletedAppointments] = useState([])

  // Query clients WHERE deleted_at IS NOT NULL
  // Query appointments WHERE deleted_at IS NOT NULL

  return (
    <SettingsLayout>
      <div className="space-y-4">
        <h1>🗑️ Lixeira</h1>

        <div>
          <h2>Clientes Deletados</h2>
          {deletedClients.map(client => (
            <div key={client.id} className="flex justify-between">
              <span>{client.name}</span>
              <div>
                <button onClick={() => restoreClient(client.id)}>Restaurar</button>
                <button onClick={() => hardDeleteClient(client.id)}>Deletar Permanente</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SettingsLayout>
  )
}
```

#### **T4: Atualizar delete buttons em components**
```typescript
// Antes:
await supabase.from('clients').delete().eq('id', clientId)

// Depois:
await softDeleteClient(supabase, clientId, companyId)
```

### **Teste Manual**
```
1. Abrir ClientCRM
2. Deletar cliente → soft delete acontece (sem hard delete)
3. Ir para Settings → Lixeira
4. Validar cliente deletado aparece
5. Button "Restaurar" → cliente volta ao CRM
6. Deletar novamente
7. Button "Deletar Permanente" → hard delete
8. Validar cliente some de Lixeira
```

---

## 📅 FRI 7 MAR — US-013: Comissões Automáticas

**Tempo Estimado:** 4h
**Bloqueadores:** Nenhum
**Agente:** backend-specialist

### **Por Quê**
Salões/barbearias pagam comissões aos profissionais:
- Algumas: % do agendamento (ex: 15% de cada serviço)
- Outras: Valor fixo por serviço (ex: R$ 50/corte)

Sistema precisa:
1. Calcular comissão automática por agendamento
2. Gerar relatório/extrato para pagamento
3. Integrar com Finance (descontar do faturamento)

### **O Que**
1. Criar tabela `commissions`:
   ```
   {
     id,
     professional_id,
     appointment_id,
     type: 'fixed' | 'percentage',
     amount: float,
     status: 'pending' | 'paid',
     paid_at: timestamp,
     company_id
   }
   ```

2. Hook `useCalculateCommission`:
   - Input: appointment (serviços + preços)
   - Output: commission amount baseado em rules

3. Component `CommissionsManagement.tsx`:
   - Exibir pending comissões
   - Mark as "Pago"
   - Relatório mensal

4. Integração Finance:
   - Descontar comissões pendentes do lucro

### **Critérios de Aceitação**
- [ ] Migration: `commissions` table + RLS
- [ ] Function `calculateCommissionForAppointment` criada
- [ ] Hook `useCommissions` para listar pendentes
- [ ] Component `CommissionsManagement.tsx` criado
- [ ] Integrado em Finance page
- [ ] Teste manual: Criar agendamento → comissão calculada
- [ ] Teste manual: Mark comissão como paga
- [ ] Teste manual: Relatório mensal (exportar?)
- [ ] RLS validada (isolamento por company_id)
- [ ] Lint + Typecheck pass

### **Arquivos Impactados**
```
NOVO:
- supabase/migrations/20260307_create_commissions.sql
- components/CommissionsManagement.tsx
- hooks/useCommissions.ts
- utils/commissions.ts

MODIFICADO:
- pages/Finance.tsx (integrar card)
- docs/stories/2026-03-01-US-013-comissoes-auto.md
```

### **Tarefas Técnicas**

#### **T1: Criar migration SQL**
```sql
-- supabase/migrations/20260307_create_commissions.sql

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  professional_id UUID NOT NULL REFERENCES users(id),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- RLS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can see their commissions"
  ON commissions FOR SELECT
  USING (company_id = auth.jwt() ->> 'company_id');

CREATE POLICY "Companies can update their commissions"
  ON commissions FOR UPDATE
  USING (company_id = auth.jwt() ->> 'company_id');
```

#### **T2: Criar utils/commissions.ts**
```typescript
export interface CommissionRule {
  type: 'fixed' | 'percentage'
  amount: number
  serviceIds?: string[] // se vazio, aplica a todos
}

export function calculateCommission(
  appointmentTotal: number,
  rule: CommissionRule
): number {
  if (rule.type === 'fixed') {
    return rule.amount
  } else {
    return (appointmentTotal * rule.amount) / 100
  }
}

export async function createCommissionForAppointment(
  supabase: SupabaseClient,
  appointment: AppointmentData,
  rules: CommissionRule[]
) {
  const commissions = []

  for (const rule of rules) {
    const amount = calculateCommission(appointment.total, rule)
    commissions.push({
      company_id: appointment.company_id,
      professional_id: appointment.professional_id,
      appointment_id: appointment.id,
      type: rule.type,
      amount,
      status: 'pending'
    })
  }

  await supabase.from('commissions').insert(commissions)
}
```

#### **T3: Criar hooks/useCommissions.ts**
```typescript
export function useCommissions() {
  const [pending, setPending] = useState<Commission[]>([])
  const [paid, setPaid] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const { supabaseClient, companyId } = useAuth()

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      try {
        const [pendingData, paidData] = await Promise.all([
          supabaseClient
            .from('commissions')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
          supabaseClient
            .from('commissions')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })
        ])

        setPending(pendingData.data || [])
        setPaid(paidData.data || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId, supabaseClient])

  const markAsPaid = async (commissionId: string) => {
    await supabaseClient
      .from('commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', commissionId)
      .eq('company_id', companyId)

    // Refetch
    // ...
  }

  return { pending, paid, loading, markAsPaid }
}
```

#### **T4: Criar CommissionsManagement.tsx**
```typescript
export function CommissionsManagement() {
  const { pending, paid, loading, markAsPaid } = useCommissions()

  if (loading) return <LoadingCard />

  const pendingTotal = pending.reduce((sum, c) => sum + c.amount, 0)
  const paidTotal = paid.reduce((sum, c) => sum + c.amount, 0)

  return (
    <BrutalCard title="💰 Comissões Automáticas">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-500">
              R$ {pendingTotal.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Pagas</p>
            <p className="text-2xl font-bold text-green-500">
              R$ {paidTotal.toFixed(2)}
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2">Pendentes ({pending.length})</h3>
          {pending.map(commission => (
            <div key={commission.id} className="flex justify-between">
              <span>R$ {commission.amount.toFixed(2)}</span>
              <button
                onClick={() => markAsPaid(commission.id)}
                className="text-blue-500"
              >
                ✓ Marcar como Pago
              </button>
            </div>
          ))}
        </div>
      </div>
    </BrutalCard>
  )
}
```

### **Teste Manual**
```
1. Abrir Finance
2. Criar agendamento com profissional
3. Validar comissão criada em commissions table
4. Abrir CommissionsManagement
5. Validar comissão listada (status: pending)
6. Button "Marcar como Pago"
7. Validar comissão move para "Pagas"
8. Validar Finance desconta comissão do lucro
9. Teste RLS: Login em outra empresa, validar isolamento
```

---

## 📊 TIMELINE RESUMIDA

```
┌─────────────────────────────────────────────────────────────┐
│ SEMANA 2: MON 3 MAR → FRI 7 MAR (16h implementação)        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ MON 3 MAR:  US-009 Radar de Lucro         [████████░░] 4h   │
│ TUE 4 MAR:  US-010 Copywriter IA          [████░░░░░░] 3h   │
│ WED 5 MAR:  US-011 Deep Link WhatsApp     [████░░░░░░] 3h   │
│ THU 6 MAR:  US-012 Soft Delete + Lixeira  [██░░░░░░░░] 2h   │
│ FRI 7 MAR:  US-013 Comissões Automáticas  [████░░░░░░] 4h   │
│                                                              │
│ Total:      16h implementação + 4h testing = 2.5 dias       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST FINAL (FRI 7 MAR NOITE)

**Antes de fazer commit final:**
```
Implementação:
- [ ] US-009 implementado + tested
- [ ] US-010 implementado + tested
- [ ] US-011 implementado + tested
- [ ] US-012 implementado + tested
- [ ] US-013 implementado + tested

Code Quality:
- [ ] npm run lint ✅ (zero warnings)
- [ ] npm run typecheck ✅ (zero errors)
- [ ] npm test ✅ (todos os testes passam)

Documentação:
- [ ] Todas as 5 stories marcadas como "done"
- [ ] docs/stories/README.md atualizado
- [ ] ADRs criadas para decisões arquiteturais (soft delete, comissões)

Segurança:
- [ ] RLS validada em todas as tabelas novas
- [ ] company_id sempre filtrado em queries
- [ ] Nenhum exposure de dados de outras empresas

Testes Manuais:
- [ ] 2+ empresas testadas em paralelo (isolamento)
- [ ] Todos os fluxos end-to-end validados
- [ ] Edge cases testados (dados vazios, erros, etc.)

Commits:
- [ ] Commits diários com mensagens claras (PT-BR)
- [ ] Cada story = 1 commit com fixes
- [ ] Commit final: "chore(semana-2): todas as 5 stories implementadas"
```

---

## 🎯 PRÓXIMAS SEMANAS (Semana 3+)

Após completar Semana 2:
- **Semana 3:** Refinar UI/UX, A/B testing, mobile responsividade
- **Semana 4:** Integração com Stripe (pagamento), CI/CD, deploy staging
- **Semana 5+:** Testes de carga, otimização performance, documentação final

---

## 📞 CONTATOS & RESOURCES

**Documentação:**
- `.ai/CLERK_DECISION.md` — ADR (descarte Clerk)
- `AIOS_INTEGRATION_PLAN.md` — Roadmap AIOS 4 semanas
- `CHECKLIST_PRE_PUSH.md` — Validações antes de git push
- `AIOS_STATUS_ATUAL.md` — Status real do projeto

**Agentes AIOS:**
- `backend-specialist` — Implementação APIs + database
- `frontend-specialist` — Componentes + UI
- `orchestrator` — Coordenação geral

**Próximos Passos:**
1. ✅ Confirmar recomendações (priorização, soft delete, comissões)
2. ✅ Validações pré-Semana 2 (backup, 2FA, RLS)
3. ✅ Começar US-009 segunda-feira (MON 3 MAR)

---

**Agente Intermediário + Claude Code | AgenX AIOS Core**
**Status: Pronto para Semana 2 de Implementação Intensiva**
