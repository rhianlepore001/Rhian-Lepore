# AgenX — Contexto Compartilhado do Projeto

> **LEIA ESTE ARQUIVO ANTES DE QUALQUER EDIÇÃO.**
> Este é o mecanismo central de prevenção de breaking changes.
> Todo agente do squad DEVE consultar este arquivo antes de implementar.

---

## 1. Identidade do Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | AgenX (também chamado de AIOS no código) |
| **Tipo** | SaaS multi-tenant para barbearias e salões de beleza |
| **Status** | Produção (em desenvolvimento ativo) |
| **Repositório** | github.com/rhianlepore/AgenX |
| **Deploy** | Vercel (Edge Network) |
| **Domínio** | PT-BR — Brasil |

---

## 2. Tech Stack (Versões Fixas — Não Atualizar Sem Aprovação)

### Frontend

| Tech | Versão | Observações |
|------|--------|-------------|
| React | 19.x | NÃO usar React 18 patterns obsoletos |
| TypeScript | 5.x | Target ES2022, strict mode |
| Vite | 6.2.x | Bundler principal |
| React Router | 7.x | `useNavigate`, `useParams` atualizados |
| Tailwind CSS | v4.x | **NÃO usar v3 syntax** — utility classes mudaram |
| Recharts | 3.4.x | Gráficos e visualizações |
| Lucide React | 0.554.x | Ícones — usar `lucide-react` |
| Driver.js | 1.4.x | Tours de onboarding |
| QRCode | 1.5.x | Geração de QR codes |

### Backend / BaaS

| Tech | Versão | Observações |
|------|--------|-------------|
| Supabase JS | 2.84.x | Client para frontend e edge functions |
| PostgreSQL | 15 | Via Supabase |
| Clerk | Latest | Auth principal — NUNCA usar Supabase Auth direto para login |
| Deno | Latest | Runtime das edge functions |
| Stripe | 5.4.x | Pagamentos e assinaturas |

### AI / LLM

| Tech | Versão | Observações |
|------|--------|-------------|
| @google/generative-ai | 0.24.x | Gemini API — sentiment, copywriting |
| OpenRouter | via env | Fallback, configurado via .env |

### Testing

| Tech | Versão | Observações |
|------|--------|-------------|
| Vitest | Latest | Unit tests + coverage |
| Playwright | Latest | E2E tests |
| @testing-library/react | Latest | Component tests |

---

## 3. Arquitetura do Sistema

### Multi-Tenancy

**CRÍTICO:** Todo dado é isolado por `tenant_id` (= `establishment_id`).

```typescript
// SEMPRE incluir tenant_id em queries
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('tenant_id', tenantId)  // OBRIGATÓRIO

// NUNCA fazer query sem filtro de tenant
// Isso vaza dados entre estabelecimentos!
```

### Autenticação (Híbrida)

```
Clerk (primário) → gerencia identidade do usuário
Supabase RLS → controla acesso aos dados por tenant
```

- Login/logout: **sempre via Clerk** (`useAuth`, `useUser` de `@clerk/clerk-react`)
- Sessão Supabase: sincronizada com Clerk via token
- 2FA: `use2FA.ts` hook — TOTP com QR code

### Row Level Security (RLS)

**Todo acesso ao banco passa por RLS.** Toda nova tabela DEVE ter RLS habilitado:

```sql
-- Template padrão de RLS para nova tabela
ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON nova_tabela
  FOR ALL USING (
    tenant_id = (
      SELECT establishment_id FROM user_profiles
      WHERE clerk_user_id = auth.uid()::text
    )
  );
```

---

## 4. Estrutura de Arquivos — Ownership por Agente

### @dev (Frontend) — React 19 + TypeScript

```
components/
├── appointment/        # Componentes de agendamento
├── dashboard/          # Dashboard e métricas
├── onboarding/         # Fluxo de onboarding
├── security/           # Componentes de segurança (2FA, etc.)
└── *.tsx               # Componentes globais

pages/
├── settings/           # 10+ páginas de configuração
├── Dashboard.tsx
├── Agenda.tsx
├── Finance.tsx
├── ClientCRM.tsx
└── *.tsx

hooks/
├── useAIOSDiagnostic.ts
├── use2FA.ts
├── useAppTour.ts
├── useDashboardData.ts
├── useDynamicBranding.ts
└── useSubscription.ts

contexts/
├── AuthContext.tsx      # Clerk + Supabase sync
├── AlertsContext.tsx
├── PublicClientContext.tsx
└── UIContext.tsx
```

### @backend (Edge Functions + Utils)

```
supabase/functions/
├── create-checkout-session/    # Stripe checkout
└── send-appointment-reminder/  # Lembretes via WhatsApp

lib/
├── supabase.ts          # Supabase client config
├── gemini.ts            # Google Gemini AI
└── auditLogs.ts         # Sistema de audit logs

utils/
├── aiosCopywriter.ts    # AI copywriting (Gemini)
├── formatters.ts        # Formatação de dados
├── date.ts              # Utilitários de data
├── Logger.ts            # Sistema de logs
├── passwordValidation.ts
├── tierSystem.ts        # Sistema de planos (Free/Pro/Enterprise)
└── tokens.ts            # JWT token handling
```

### @db (Database Architect)

```
supabase/
├── migrations/          # Arquivos SQL de migração
│   ├── 20260129_*.sql   # RLS consolidado
│   ├── 20260214_*.sql   # Audit, rate limiting, soft delete
│   └── 20260216_*.sql   # Error tracking, factory reset
└── types.ts             # Tipos gerados pelo Supabase
```

### @qa (Test Engineer)

```
test/
├── components/          # Testes de componentes React
├── contexts/            # Testes de contexts
├── hooks/               # Testes de hooks
├── lib/                 # Testes de lib/
└── utils/               # Testes de utils/
```

### @devops (DevOps)

```
.github/workflows/       # GitHub Actions
vercel.json              # Config Vercel
scripts/                 # Scripts de build/deploy
```

---

## 5. Padrões de Código Obrigatórios

### Imports Absolutos

```typescript
// ✅ CORRETO — usar alias @/
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/utils/date'
import { supabase } from '@/lib/supabase'

// ❌ ERRADO — imports relativos
import { useAuth } from '../../../contexts/AuthContext'
```

### Naming Conventions

```typescript
// Componentes: PascalCase
export function AppointmentCard() { ... }

// Hooks: camelCase com prefixo "use"
export function useBookingData() { ... }

// Utilities: camelCase
export function formatCurrency(value: number) { ... }

// Tipos/Interfaces: PascalCase com sufixo descritivo
interface BookingRecord { ... }
type TenantId = string;
```

### Padrão de Componente React

```tsx
// Estrutura padrão de componente
interface Props {
  tenantId: string
  // ... outros props tipados
}

export function ComponentName({ tenantId }: Props) {
  // 1. Hooks no topo
  const { user } = useAuth()
  const [state, setState] = useState<Type>(initialValue)

  // 2. Handlers
  const handleAction = async () => { ... }

  // 3. Early returns para loading/error
  if (!user) return null

  // 4. JSX
  return (
    <div className="...tailwind classes...">
      ...
    </div>
  )
}
```

### Padrão Supabase Query

```typescript
// Com tratamento de erro
const fetchData = async (tenantId: string) => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    Logger.error('fetchData failed', { error, tenantId })
    throw error
  }

  return data
}
```

---

## 6. Banco de Dados — Tabelas Principais

| Tabela | Descrição | tenant_id? |
|--------|-----------|-----------|
| `bookings` | Agendamentos | ✅ |
| `clients` | Clientes do estabelecimento | ✅ |
| `services` | Serviços oferecidos | ✅ |
| `transactions` | Registros financeiros | ✅ |
| `staff` | Profissionais da equipe | ✅ |
| `establishments` | Dados do estabelecimento | É o próprio tenant |
| `audit_logs` | Logs de ações dos usuários | ✅ |
| `rate_limit_attempts` | Controle de brute force | Por IP |
| `user_profiles` | Perfis dos usuários | ✅ + clerk_user_id |

### Soft Delete

Registros deletados vão para "lixeira" — 30 dias de recuperação:
```sql
-- Soft delete (não deletar registro permanentemente)
UPDATE bookings
SET deleted_at = NOW(), deleted_by = auth.uid()
WHERE id = $1 AND tenant_id = $2;

-- Query padrão excluindo deletados
SELECT * FROM bookings
WHERE tenant_id = $1 AND deleted_at IS NULL;
```

---

## 7. Sistema de Autenticação

### Clerk (primário)

```typescript
// hooks/useAuth ou contexts/AuthContext.tsx
import { useAuth, useUser } from '@clerk/clerk-react'

const { isSignedIn, getToken } = useAuth()
const { user } = useUser()
```

### 2FA (TOTP)

```typescript
// hooks/use2FA.ts — hook dedicado
import { use2FA } from '@/hooks/use2FA'

const { setup2FA, verify2FA, disable2FA, isEnabled } = use2FA()
```

### Rate Limiting

- 5 tentativas de login por IP/15 minutos
- Implementado via tabela `rate_limit_attempts` no PostgreSQL

---

## 8. Sistema de Planos (Tiers)

```typescript
// utils/tierSystem.ts
type TierName = 'free' | 'pro' | 'enterprise'

// Verificação de acesso a features
import { hasFeatureAccess } from '@/utils/tierSystem'
const canUseAI = hasFeatureAccess(currentTier, 'ai_features')
```

---

## 9. Integração com IA (Gemini)

```typescript
// lib/gemini.ts — client configurado
import { generateContent } from '@/lib/gemini'

// utils/aiosCopywriter.ts — copywriting
import { generateReactivationMessage } from '@/utils/aiosCopywriter'
```

---

## 10. Temas Visuais

O projeto tem 2 temas:

| Tema | Estilo | Cores principais |
|------|--------|----------------|
| **Barber** | Brutalist / Art Deco | Black `#0a0a0a`, Gold `#d4af37` |
| **Beauty** | Elegant / Art Nouveau | Purple `#8b5cf6`, Pink `#ec4899` |

```typescript
// Seleção de tema via URL ou settings
// Usar classes condicionais baseadas no tema ativo
const isBeautyTheme = theme === 'beauty'
```

---

## 11. Estado Atual do Projeto (Atualizar Sempre)

> **Última atualização:** 2026-03-01
> **Branch principal:** main
> **Branch de trabalho atual:** claude/analyze-multiagent-framework-uCVbH

### Módulos Implementados

- [x] Sistema de autenticação (Clerk + 2FA)
- [x] Dashboard principal
- [x] Gestão de agendamentos (Agenda.tsx)
- [x] CRM de clientes (ClientCRM.tsx)
- [x] Módulo financeiro (Finance.tsx)
- [x] Booking público (/book/:tenant_slug)
- [x] Configurações completas (settings/)
- [x] Audit logs
- [x] Rate limiting
- [x] Soft delete
- [x] Sistema de notificações (AlertsContext)
- [x] Onboarding tour (useAppTour)
- [x] Integração Gemini AI

### Em Desenvolvimento / Próximas Features

- [ ] Integração WhatsApp para campanhas
- [ ] Dashboard de métricas de campanhas AI
- [ ] Sistema de agendamento com IA preditiva

---

## 12. Variáveis de Ambiente Necessárias

```bash
# .env (nunca commitar)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CLERK_PUBLISHABLE_KEY=
VITE_GOOGLE_GEMINI_API_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=

# Supabase (servidor)
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 13. Gates de Qualidade (Obrigatórios Antes de Push)

```bash
npm run lint         # ESLint — zero erros
npm run typecheck    # TypeScript — zero erros
npm test             # Vitest — todos passando
npm run build        # Build Vite — sem falhas
```

**O @devops é o ÚNICO que faz `git push`.** Todos os outros agentes apenas fazem commits locais.
