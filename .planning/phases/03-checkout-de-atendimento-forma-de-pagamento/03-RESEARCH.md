# Phase 3: Checkout de Atendimento + Forma de Pagamento — Research

**Researched:** 2026-04-13
**Domain:** React 19 + TypeScript + Supabase — fluxo de conclusão de agendamento com pagamento
**Confidence:** HIGH (todo o código-fonte verificado diretamente no repositório)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Fluxo de Pagamento**
- Forma de pagamento é capturada APENAS no momento de conclusão do serviço, não na criação
- Na criação do agendamento: campo `payment_method` é opcional (pode ficar em branco)
- Esta é uma decisão FECHADA — não reverter ao modelo anterior

**D-02: Modal de Conclusão (CheckoutModal)**
- Aparece ao clicar "Concluir atendimento" no card de agendamento
- Campos do modal:
  - Serviço realizado (pré-preenchido, read-only)
  - Valor (pré-preenchido, editável)
  - Forma de pagamento: PIX | Dinheiro | Débito | Crédito (obrigatório)
  - Taxa de maquininha (%): aparece SOMENTE se Débito ou Crédito selecionado
    - Pré-preenchido com taxa configurada pelo dono nas Settings
    - Campo opcional
  - "Recebido por": dropdown com todos os colaboradores + dono (quem pegou o dinheiro)
- Botão "Confirmar pagamento" → muda status do agendamento para `concluído`

**D-03: Taxa de Maquininha — Configuração pelo Dono**
- Localização: Settings > Financeiro (nova seção)
- Toggle: "Repassar taxa de maquininha ao colaborador?" (Sim/Não)
- Campo: "Taxa débito (%)"
- Campo: "Taxa crédito (%)"
- Se toggle = Não → taxa absorvida pela barbearia, comissão calculada sobre valor bruto
- Se toggle = Sim → comissão calculada sobre (valor - taxa)

**D-04: Campos em `appointments` (migration)**
Novos campos a adicionar via migration:
- `payment_method`: TEXT — 'pix' | 'cash' | 'debit' | 'credit' | NULL
- `received_by`: UUID — referência ao colaborador que recebeu o pagamento
- `machine_fee_applied`: BOOLEAN — se taxa foi aplicada
- `machine_fee_percent`: DECIMAL(5,2) — percentual da taxa aplicada

**D-05: Configuração de taxas em settings**
Nova tabela ou campos na tabela existente `settings`:
- `machine_fee_enabled`: BOOLEAN — toggle de repasse
- `debit_fee_percent`: DECIMAL(5,2) — taxa débito (ex: 2.5)
- `credit_fee_percent`: DECIMAL(5,2) — taxa crédito (ex: 3.5)

**D-06: RLS — Regras de Acesso**
- `appointments` UPDATE (status, payment_method, received_by): liberado para todos os usuários da mesma barbearia (`company_id` match)
- `settings` SELECT/UPDATE: apenas owner

**D-07: Edge Cases (decisões fechadas)**
- Colaborador tenta concluir sem escolher forma de pagamento → bloqueia, campo vermelho: "Selecione a forma de pagamento"
- Agendamento já concluído → botão "Concluir" desaparece; badge "Pago via [método]" exibido
- Agendamento concluído + pago → colaborador NÃO pode cancelar: "Este agendamento já foi finalizado. Fale com o dono."

### Claude's Discretion
- Componente visual: pode ser modal ou drawer — preferir modal para mobile
- Animações de transição: mínimas, sem overhead de performance
- Tratamento de erro de rede: toast de erro com retry
- Loading state no botão "Confirmar pagamento"
- Posicionamento do botão "Concluir atendimento" no card existente (antes ou depois de outros botões)
- Limpeza de campos ao fechar modal sem confirmar

### Deferred Ideas (OUT OF SCOPE)
- Integração com maquininha física ou sistema de pagamento externo
- Relatório financeiro detalhado por forma de pagamento (vai para Fase 4)
- Notificações push ou WhatsApp sobre pagamento recebido
- PIX automático integrado
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Descrição | Research Support |
|----|-----------|-----------------|
| REQ-020 | Botão "Concluir atendimento" no card de agendamento | Verificado: `handleCompleteAppointment` em `Agenda.tsx:743` já existe como botão de check — precisa ser convertido em acionador do CheckoutModal |
| REQ-021 | CheckoutModal com forma de pagamento obrigatória | Verificado: padrão de modal em `components/Modal.tsx` com FocusTrap, portal, temas — usar como base |
| REQ-022 | Taxa de maquininha condicional (débito/crédito) | Verificado: nenhum campo de taxa existe em `business_settings` — precisa de migration com 3 novos campos |
| REQ-023 | Campo "Recebido por" no checkout | Verificado: `team_members` acessível via `user_id = get_auth_company_id()` — dropdown com nome dos membros ativos |
| REQ-024 | Settings > Financeiro com configuração de taxas | Verificado: rota `/configuracoes/financeiro` ainda não existe — precisa criar página + entrada em `SETTINGS_ITEMS` + rota em `App.tsx` |
</phase_requirements>

---

## Summary

A Fase 3 implementa o fluxo de checkout de atendimento. A base técnica já existe: o botão "Concluir" (`handleCompleteAppointment`) está em `Agenda.tsx:1578`, chama `supabase.rpc('complete_appointment')` que atualiza status e cria `finance_records`. O que falta é interceptar esse clique, abrir o `CheckoutModal` para capturar `payment_method`, `received_by`, `machine_fee_percent` e só então confirmar.

O campo `payment_method` já existe na tabela `appointments` (migration `20260218_add_payment_method.sql`). Três campos são novos: `received_by` (UUID), `machine_fee_applied` (BOOLEAN), `machine_fee_percent` (DECIMAL). Para as configurações de taxa, a tabela `business_settings` já está sendo usada (padrão `upsert` com `onConflict: 'user_id'`) — basta adicionar 3 colunas via migration.

O RLS atual em `appointments` usa a função `get_auth_company_id()` (criada em `20260307_us015b_multi_user_rls.sql`) que já permite staff acessar dados da mesma empresa. A policy `"Appointments: company isolation"` cobre FOR ALL — o UPDATE de status e payment_method já é permitido para qualquer membro da empresa. Nenhuma mudança de RLS em `appointments` é necessária. Para `business_settings`, a policy de UPDATE já restringe ao owner (`get_auth_role() = 'owner'`).

**Primary recommendation:** Interceptar `handleCompleteAppointment` em `Agenda.tsx` com estado de modal, criar `components/CheckoutModal.tsx` baseado no padrão `Modal.tsx`, adicionar migration para os 3 novos campos em `appointments` e 3 campos em `business_settings`, criar `pages/settings/FinancialSettings.tsx` usando `CommissionsSettings.tsx` como referência estrutural.

---

## Standard Stack

### Core
| Componente | Versão/Padrão | Propósito | Por que usar |
|-----------|--------------|-----------|-------------|
| `components/Modal.tsx` | Projeto | Wrapper de modal com FocusTrap, portal, temas barber/beauty | Padrão estabelecido com acessibilidade (aria-modal, FocusTrap) |
| `focus-trap-react` | Instalado | Trap de foco no modal | Já usado em Modal.tsx e AppointmentEditModal.tsx |
| `components/BrutalButton.tsx` | Projeto | Botões com loading state, variantes, temas | Padrão do projeto, suporta `loading` prop nativo |
| `components/BrutalCard.tsx` | Projeto | Cards para Settings | Usado em todas as settings pages |
| `components/SettingsLayout.tsx` | Projeto | Layout de settings com sidebar | Base para nova página FinancialSettings |
| `supabase.rpc()` | Projeto | Chamada para `complete_appointment` RPC | Padrão já estabelecido em Agenda.tsx |
| `useAuth()` | Projeto | Acesso a `user`, `companyId`, `role` | Fonte obrigatória de company_id |
| `useAlerts()` | Projeto | Toast de sucesso/erro | Padrão do projeto para alertas |

### Supporting
| Componente | Propósito | Quando usar |
|-----------|-----------|------------|
| `components/SaveFooter.tsx` | Footer de salvar em settings | Usar em FinancialSettings para salvar taxas |
| `utils/formatters.ts` (formatCurrency) | Formatação de valor monetário | Exibição do valor no modal |
| `utils/Logger.ts` (logger.error) | Log estruturado de erros | Catch blocks em operações Supabase |

### Alternativas Consideradas
| Em vez de | Poderia usar | Tradeoff |
|-----------|-------------|---------|
| `Modal.tsx` (wrapper padrão) | `AppointmentEditModal.tsx` (createPortal direto) | AppointmentEditModal usa createPortal manualmente sem usar Modal.tsx — preferir Modal.tsx pois é o padrão com mais recursos (footer prop, size variants, FocusTrap integrado) |
| RPC `complete_appointment` modificado | UPDATE direto no cliente | RPC é padrão do projeto para operações transacionais — manter abordagem server-side |

**Instalação:** Nenhum pacote novo necessário — tudo já instalado.

---

## Architecture Patterns

### Estrutura recomendada dos novos arquivos
```
components/
└── CheckoutModal.tsx         # Modal de conclusão de atendimento (novo)

pages/settings/
└── FinancialSettings.tsx     # Settings > Financeiro (nova página)

supabase/migrations/
└── 20260413_checkout_fields.sql  # Campos novos em appointments + business_settings
```

### Pattern 1: Interceptação do Fluxo de Conclusão em Agenda.tsx

**O que é:** Substituir a chamada direta `handleCompleteAppointment(apt.id)` por abertura do CheckoutModal, que coleta dados e então chama a conclusão.

**Quando usar:** Todo clique no botão de concluir agendamento.

**Estado a adicionar em Agenda.tsx:**
```typescript
// Source: padrão verificado em Agenda.tsx (editingAppointment pattern)
const [checkoutAppointment, setCheckoutAppointment] = useState<Appointment | null>(null);

// No card de agendamento — substituir chamada direta:
// ANTES: onClick={() => handleCompleteAppointment(apt.id)
// DEPOIS:
onClick={() => setCheckoutAppointment(apt)}
```

### Pattern 2: CheckoutModal baseado em Modal.tsx

**O que é:** Componente de modal usando `Modal` wrapper existente.

**Exemplo de estrutura:**
```typescript
// Source: padrão verificado em components/Modal.tsx e AppointmentEditModal.tsx
import { Modal, ModalFooter } from '@/components/Modal';
import { BrutalButton } from '@/components/BrutalButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface CheckoutModalProps {
  appointment: Appointment | null;
  teamMembers: TeamMember[];
  financialSettings: FinancialSettings | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  appointment, teamMembers, financialSettings, onClose, onConfirm
}) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [machineFeePercent, setMachineFeePercent] = useState<string>('');
  const [finalPrice, setFinalPrice] = useState<number>(appointment?.price ?? 0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ paymentMethod?: string }>({});

  const showMachineFee = ['debit', 'credit'].includes(paymentMethod);

  const handleConfirm = async () => {
    if (!paymentMethod) {
      setErrors({ paymentMethod: 'Selecione a forma de pagamento' });
      return;
    }
    setLoading(true);
    try {
      // 1. UPDATE dos campos de checkout no appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          payment_method: paymentMethod,
          received_by: receivedBy || null,
          machine_fee_applied: showMachineFee && !!machineFeePercent,
          machine_fee_percent: showMachineFee ? parseFloat(machineFeePercent) || null : null,
          price: finalPrice,
        })
        .eq('id', appointment!.id);

      if (updateError) throw updateError;

      // 2. RPC complete_appointment para mudar status e criar finance_record
      const { error: rpcError } = await supabase
        .rpc('complete_appointment', { p_appointment_id: appointment!.id });

      if (rpcError) throw rpcError;

      onConfirm();
    } catch (err: any) {
      logger.error('Error completing appointment checkout', err);
      showAlert({ type: 'error', message: 'Erro ao concluir atendimento. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={!!appointment}
      onClose={onClose}
      title="Concluir Atendimento"
      size="md"
      footer={
        <ModalFooter align="between">
          <BrutalButton variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </BrutalButton>
          <BrutalButton variant="primary" onClick={handleConfirm} loading={loading}>
            Confirmar Pagamento
          </BrutalButton>
        </ModalFooter>
      }
    >
      {/* campos do modal */}
    </Modal>
  );
};
```

### Pattern 3: FinancialSettings usando padrão de CommissionsSettings

**O que é:** Nova página de settings com upsert em `business_settings`.

**Exemplo baseado no padrão verificado:**
```typescript
// Source: padrão verificado em pages/settings/CommissionsSettings.tsx
const handleSave = async () => {
  if (!user) return;
  setSaving(true);
  try {
    const { error } = await supabase
      .from('business_settings')
      .upsert({
        user_id: user.id,
        machine_fee_enabled: machineFeeEnabled,
        debit_fee_percent: parseFloat(debitFee) || 0,
        credit_fee_percent: parseFloat(creditFee) || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
    setSaveStatus('saved');
  } catch (error) {
    console.error('Error saving financial settings:', error);
    setSaveStatus('error');
  } finally {
    setSaving(false);
  }
};
```

### Pattern 4: Migration SQL

**O que é:** Novos campos adicionados com `ADD COLUMN IF NOT EXISTS` — padrão de todas as migrations do projeto.

```sql
-- Source: padrão verificado em 20260218_add_payment_method.sql e 20260218_client_crm_enhancements.sql

-- Novos campos em appointments (D-04)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS machine_fee_applied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS machine_fee_percent DECIMAL(5,2);

-- Novos campos em business_settings (D-05)
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS machine_fee_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS debit_fee_percent DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_fee_percent DECIMAL(5,2) DEFAULT 0;
```

### Pattern 5: Registro de Financeiro settings e rota

**O que é:** Adicionar entrada no `constants.ts` e rota em `App.tsx`.

```typescript
// Source: padrão verificado em constants.ts (SETTINGS_ITEMS) e App.tsx

// constants.ts — adicionar em SETTINGS_ITEMS:
{ label: 'Financeiro', path: '/configuracoes/financeiro', icon: DollarSign },

// App.tsx — adicionar importação lazy:
const FinancialSettings = React.lazy(() =>
  import('./pages/settings/FinancialSettings').then(module => ({ default: module.FinancialSettings }))
);

// App.tsx — adicionar rota (apenas owner):
<Route path="/configuracoes/financeiro" element={<OwnerRouteGuard><FinancialSettings /></OwnerRouteGuard>} />
```

### Anti-Patterns a Evitar

- **Não criar RPC nova para o checkout:** O `complete_appointment` já existe e funciona. Fazer UPDATE dos campos de pagamento antes de chamar a RPC evita duplicidade.
- **Não aceitar `company_id` de parâmetro de URL ou form:** Extrair sempre de `useAuth()` — regra crítica do CLAUDE.md.
- **Não esquecer RLS silencioso:** Query em `business_settings` sem `user_id` correto retorna vazio, não erro.
- **Não usar `user.id` diretamente para filtros de company:** Staff usa `companyId` (que é o `id` do dono). Usar `get_auth_company_id()` no nível SQL ou `companyId` do `useAuth()` no cliente.

---

## Don't Hand-Roll

| Problema | Não construir | Usar em vez | Por que |
|---------|--------------|-------------|---------|
| Modal com acessibilidade | Div posicionada custom | `Modal.tsx` + FocusTrap | FocusTrap já integrado, ESC handler, body scroll lock, portal |
| Botão com loading | Spinner custom | `BrutalButton` com `loading` prop | Spinner integrado, estados de disabled, animações de temas |
| Toast de erro | Alert nativo | `useAlerts()` + `showAlert` | Padrão do projeto, não bloqueia interação |
| Layout de settings | Layout custom | `SettingsLayout` + `BrutalCard` | Sidebar, nav, responsividade já prontos |
| Footer de salvar | Botão inline | `SaveFooter` | Padrão com estados 'saving'/'saved'/'error'/'idle' |
| Formatação de moeda | `.toFixed(2)` | `formatCurrency(value, currencyRegion)` | Suporta BR/PT, símbolo de moeda correto |

---

## Common Pitfalls

### Pitfall 1: RLS silencioso na business_settings

**O que acontece:** Busca de configurações de taxa retorna `null` sem erro — modal pré-preenche taxa com 0.
**Por que acontece:** Query sem filtro correto de `user_id`. Staff tem `user.id` diferente do owner — precisam buscar via `companyId`.
**Como evitar:** Buscar `business_settings` usando `.eq('user_id', companyId)` (não `user.id`) pois o registro é do dono.
**Sinais de alerta:** Campos de taxa sempre vazios para staff; `maybeSingle()` retornando `null`.

### Pitfall 2: Dupla criação de finance_record

**O que acontece:** Se UPDATE de payment_method e RPC `complete_appointment` forem chamados sem verificar status prévio, chamar RPC em appointment já `Completed` cria segundo `finance_record`.
**Por que acontece:** A RPC `complete_appointment` não verifica idempotência — só checa `NOT FOUND`, não checa status atual.
**Como evitar:** Botão "Concluir" deve aparecer apenas quando `apt.status !== 'Completed'` (já verificado no card, mas garantir no modal também).
**Sinais de alerta:** Duplicatas em `finance_records` para o mesmo `appointment_id`.

### Pitfall 3: `received_by` como UUID vs TEXT

**O que acontece:** `team_members.id` é UUID, mas `appointments.user_id` é TEXT. A FK `received_by` deve referenciar `team_members.id` (UUID) — não misturar com `user_id` (TEXT).
**Por que acontece:** O schema tem inconsistência histórica: `appointments.user_id` é TEXT (referencia `auth.users.id` via cast), enquanto `team_members.id` é UUID.
**Como evitar:** `received_by UUID REFERENCES team_members(id)` — FK correta para o registro do profissional no `team_members`.

### Pitfall 4: Limpeza de estado do modal ao fechar sem confirmar

**O que acontece:** Usuário abre modal, seleciona PIX, fecha sem confirmar, abre novamente — campos mantêm estado anterior.
**Por que acontece:** Estado do componente persiste entre renders se o componente não é desmontado.
**Como evitar:** Resetar estado no `useEffect` quando `appointment` muda para `null` ou ao fechar. Alternativa: sempre desmontar (`{appointment && <CheckoutModal ... />}`).

### Pitfall 5: `payment_method` ainda sendo required na criação

**O que acontece:** Validação na criação de agendamento (AppointmentWizard ou Agenda) ainda exige `payment_method`.
**Por que acontece:** Campo existia como obrigatório no fluxo anterior (D-01 da spec muda isso).
**Como evitar:** Buscar no código de criação de agendamento (`AppointmentWizard.tsx`, formulário de novo agendamento em `Agenda.tsx`) e remover validação de `payment_method` — campo agora é opcional na criação.

### Pitfall 6: Colaborador vendo settings de taxa

**O que acontece:** Staff acessa `/configuracoes/financeiro` e consegue ver/alterar taxas.
**Por que acontece:** Rota não protegida com `OwnerRouteGuard`.
**Como evitar:** Envolver rota com `<OwnerRouteGuard>` em App.tsx. Settings RLS já bloqueia UPDATE pelo banco, mas a proteção de UI é necessária para UX.

---

## Code Examples

### Listagem de team members para dropdown "Recebido por"
```typescript
// Source: padrão verificado em pages/settings/CommissionsSettings.tsx:43-50
// e contexts/AuthContext.tsx (companyId)
const { companyId } = useAuth();

const { data: teamMembers } = await supabase
  .from('team_members')
  .select('id, name, active')
  .eq('user_id', companyId)   // companyId, não user.id — funciona para owner e staff
  .eq('active', true)
  .order('name');
```

### Busca das configurações financeiras do dono
```typescript
// Source: padrão verificado em pages/settings/CommissionsSettings.tsx:61-70
const { companyId } = useAuth();

const { data: settings } = await supabase
  .from('business_settings')
  .select('machine_fee_enabled, debit_fee_percent, credit_fee_percent')
  .eq('user_id', companyId)   // sempre companyId para pegar settings do dono
  .maybeSingle();

// Pré-popular no modal baseado no método selecionado:
const defaultFee = paymentMethod === 'debit'
  ? settings?.debit_fee_percent ?? 0
  : settings?.credit_fee_percent ?? 0;
```

### Badge "Pago via [método]" para agendamentos concluídos
```typescript
// Source: padrão verificado nos badges de status em Agenda.tsx:1661-1664
// Adaptar para mostrar método de pagamento
{isCompleted && apt.payment_method && (
  <span className="text-xs font-mono bg-green-500/10 text-green-400 px-2 py-1 rounded">
    Pago via {apt.payment_method.toUpperCase()}
  </span>
)}
```

### Proteção contra cancelamento de agendamento concluído
```typescript
// Source: padrão de role check verificado em SettingsLayout.tsx:22-24
// e AppointmentEditModal handleSave pattern
const { role } = useAuth();

const handleCancelAppointment = async (apt: Appointment) => {
  if (apt.status === 'Completed' && role === 'staff') {
    showAlert({
      type: 'error',
      message: 'Este agendamento já foi finalizado. Fale com o dono.'
    });
    return;
  }
  // ... continuar com cancelamento
};
```

---

## State of the Art

| Abordagem antiga | Abordagem atual | Quando mudou | Impacto |
|-----------------|-----------------|-------------|--------|
| `payment_method` obrigatório na criação | Opcional na criação, obrigatório no checkout | Fase 3 (D-01) | Simplifica criação de agendamento |
| `complete_appointment` chamado diretamente | Interceptado pelo CheckoutModal | Fase 3 | Captura dados de pagamento antes de fechar |
| Sem configuração de taxa de maquininha | Settings > Financeiro com toggle + taxas | Fase 3 | Dono configura repasse uma vez, pré-preenche modal |

---

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|-------|-------|----------------|
| A1 | O campo `payment_method` em `appointments` já existe no banco de produção (foi aplicado via migration `20260218`) | Migration Section | Migration precisaria incluir ADD COLUMN também — usar `IF NOT EXISTS` previne erro |
| A2 | `business_settings` tem coluna `updated_at` (padrão de upsert em CommissionsSettings usa esse campo) | Pattern 3 | Upsert falha se coluna não existe — verificar schema real antes do deploy |
| A3 | A RPC `complete_appointment` aceita o appointment já com `payment_method` atualizado (UPDATE antes do RPC) — não há conflito de concorrência | Pattern 2 | Se RPC reler o appointment do banco antes do UPDATE persistir, capturaria valor nulo — testado via sequência UPDATE → RPC |

**Nota sobre A3:** A sequência recomendada (UPDATE campos de pagamento → RPC complete_appointment) funciona porque são duas operações sequenciais. A RPC lê o appointment do banco depois do UPDATE já ter sido commitado. Não há race condition em operações síncronas await-sequenciais.

---

## Open Questions

1. **O campo `payment_method` em `appointments.user_id` é TEXT não UUID**
   - O que sabemos: `appointments.user_id` é `TEXT` referenciando `auth.users.id` via cast (padrão histórico do projeto)
   - O que está claro: `received_by` deve referenciar `team_members.id` (UUID), não `user_id`
   - Recomendação: manter como documentado em D-04 — FK para `team_members(id)`

2. **A RPC `complete_appointment` deve ser atualizada para aceitar e persistir os campos de pagamento?**
   - O que sabemos: atualmente a RPC lê `v_appointment.payment_method` para inserir em `finance_records`
   - O que está claro: se o UPDATE de `payment_method` for feito antes da RPC, a RPC já lê o valor correto do banco
   - Recomendação: não modificar a RPC nesta fase — UPDATE dos campos → RPC é suficiente

3. **Deve-se incluir o dono na lista "Recebido por"?**
   - O que sabemos: D-02 diz "dropdown com todos os colaboradores + dono"
   - O que está claro: dono não está em `team_members` (está em `profiles` com `role = 'owner'`)
   - Recomendação: incluir entrada manual "Dono" no dropdown (opção fixa além dos team_members), ou buscar o perfil do dono via `companyId` e incluir na lista

---

## Environment Availability

Fase puramente de código/SQL — nenhuma dependência externa além do Supabase já configurado. Seção omitida.

---

## Validation Architecture

### Test Framework
| Propriedade | Valor |
|-------------|-------|
| Framework | Vitest 2 + @testing-library/react |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --run --reporter=verbose` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map
| Req ID | Comportamento | Tipo de Teste | Comando Automatizado | Arquivo existe? |
|--------|--------------|--------------|---------------------|----------------|
| REQ-020 | Botão "Concluir" abre CheckoutModal (não chama RPC diretamente) | Unit (componente) | `npm test -- CheckoutModal` | ❌ Wave 0 |
| REQ-021 | CheckoutModal bloqueia confirmação sem payment_method | Unit (componente) | `npm test -- CheckoutModal` | ❌ Wave 0 |
| REQ-022 | Campo taxa aparece apenas para débito/crédito | Unit (componente) | `npm test -- CheckoutModal` | ❌ Wave 0 |
| REQ-023 | Dropdown "Recebido por" exibe membros da empresa | Unit (componente) | `npm test -- CheckoutModal` | ❌ Wave 0 |
| REQ-024 | FinancialSettings salva taxas em business_settings | Unit (componente) | `npm test -- FinancialSettings` | ❌ Wave 0 |

### Sampling Rate
- **Por commit de tarefa:** `npm test -- --run`
- **Por wave merge:** `npm run test:coverage`
- **Phase gate:** Suite verde antes do `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `components/CheckoutModal.test.tsx` — cobre REQ-020, REQ-021, REQ-022, REQ-023
- [ ] `pages/settings/FinancialSettings.test.tsx` — cobre REQ-024
- [ ] `test/setup.ts` já existe (mock Supabase disponível)

---

## Security Domain

### Applicable ASVS Categories
| Categoria ASVS | Aplica | Controle Padrão |
|---------------|--------|----------------|
| V2 Authentication | não — usuário já autenticado | Supabase Auth via ProtectedLayout |
| V4 Access Control | sim | `OwnerRouteGuard` + RLS `get_auth_role()` |
| V5 Input Validation | sim | Validação inline no modal (campo obrigatório, parseFloat) |
| V6 Cryptography | não | N/A |

### Threat Patterns para este Stack
| Padrão | STRIDE | Mitigação Padrão |
|--------|--------|-----------------|
| Staff alterando `payment_method` de outro tenant | Tampering | RLS `"Appointments: company isolation"` via `get_auth_company_id()` — já ativo |
| Staff acessando Settings > Financeiro (taxas do dono) | Elevation of Privilege | `OwnerRouteGuard` na rota + RLS UPDATE com `get_auth_role() = 'owner'` |
| Injection via campo `machine_fee_percent` | Tampering | `parseFloat()` + `DECIMAL(5,2)` no banco — não executável como SQL |
| Conclusão de agendamento de outro tenant | Tampering | RLS com `user_id = get_auth_company_id()` — UPDATE bloqueado pelo banco |

---

## Project Constraints (from CLAUDE.md)

| Diretriz | Impacto nesta fase |
|---------|-------------------|
| `company_id` SEMPRE do session Supabase, nunca de URL/form | CheckoutModal e FinancialSettings devem usar `useAuth().companyId` |
| RLS ativo em todas as tabelas — nunca desabilitar | Novos campos não precisam de nova policy — `"Appointments: company isolation"` já cobre FOR ALL |
| HashRouter — links usam `#` | Rota nova: `/#/configuracoes/financeiro` |
| React.lazy() sem Suspense = crash | FinancialSettings deve ser lazy-loaded e dentro de Suspense (já gerenciado pelo `App.tsx`) |
| Staff vs Owner: `OwnerRouteGuard` bloqueia rotas | Rota `/configuracoes/financeiro` deve ser owner-only |
| Mobile first — barbeiro usa celular | Modal deve funcionar em tela pequena; testar touch targets ≥ 44px |
| 91+ migrations — histórico instável de RLS | Usar `IF NOT EXISTS` em todos os ADD COLUMN; não criar policies novas sem necessidade |

---

## Sources

### Primary (HIGH confidence)
- `pages/Agenda.tsx:743-810` — fluxo atual de `handleCompleteAppointment`
- `pages/Agenda.tsx:1575-1581` — botão "Concluir" no card de agendamento
- `components/Modal.tsx` — padrão de modal com FocusTrap, portal, temas
- `components/AppointmentEditModal.tsx` — padrão de modal de agendamento
- `components/BrutalButton.tsx` — props de loading, variantes
- `contexts/AuthContext.tsx` — `companyId`, `role`, `teamMemberId`
- `supabase/migrations/20260218_add_payment_method.sql` — `payment_method` já existe em `appointments`
- `supabase/migrations/20260218_fix_complete_appointment.sql` — RPC `complete_appointment` atual
- `supabase/migrations/20260307_us015b_multi_user_rls.sql` — policy `"Appointments: company isolation"` + `get_auth_company_id()`
- `supabase/migrations/20260406_add_mbway_payment_method.sql` — `get_finance_stats` atual com payment_method
- `pages/settings/CommissionsSettings.tsx` — padrão de settings com upsert em `business_settings`
- `pages/settings/GeneralSettings.tsx` — padrão de settings com upsert em `business_settings`
- `components/SettingsLayout.tsx` — sidebar de settings, filtro owner/staff
- `constants.ts` — `SETTINGS_ITEMS`, padrão de registro de nova seção
- `App.tsx` — rota lazy pattern, `OwnerRouteGuard` usage
- `.planning/codebase/CONVENTIONS.md` — padrões de código verificados
- `.planning/codebase/ARCHITECTURE.md` — padrões de arquitetura verificados

### Secondary (MEDIUM confidence)
- `supabase/migrations/20260218_full_schema_fix.sql` — schema base de `appointments` e `business_settings`

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — todo o código verificado diretamente no repositório
- Architecture: HIGH — padrões extraídos de componentes existentes e funcionando
- Pitfalls: HIGH — baseados em análise do código real e histórico de migrations

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 dias — stack estável)
