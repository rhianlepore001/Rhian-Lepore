# US-014 — Área do Cliente: Portal Pós-Agendamento

**Status:** `ready-for-review`
**Prioridade:** `high`
**Criado em:** 2026-03-02
**Agente responsável:** `@dev (Dex)`
**Epic:** Experience do Cliente Público

---

## Story

> **Como** cliente que realizou um agendamento em um salão ou barbearia,
> **Quero** ter acesso a uma área exclusiva onde posso ver meus agendamentos ativos,
> meu histórico de serviços e entrar em contato com o estabelecimento via WhatsApp,
> **Para que** eu tenha uma experiência fluida, profissional e de confiança após o agendamento.

---

## Contexto Técnico

### Estado Atual do Sistema

O sistema de agendamento público (`/book/:slug`) já possui:
- ✅ Autenticação por telefone via `PublicClientContext`
- ✅ Tabela `public_clients` com dados persistentes do cliente
- ✅ Tabela `public_bookings` com todos os agendamentos
- ✅ RPC `get_active_booking_by_phone` (apenas agendamentos ativos/pendentes)
- ✅ Integração WhatsApp na tela de sucesso do agendamento
- ✅ Sistema de temas Beauty/Brutal (theme-aware)
- ✅ Componente `ClientAuthModal` para autenticação por telefone

### O Que Falta (GAP Analysis)

| Funcionalidade | Existe? | Ação |
|---------------|---------|------|
| Rota `/minha-area/:slug` | ❌ | Criar |
| Página `ClientArea.tsx` | ❌ | Criar |
| Histórico de serviços anteriores | ❌ | Criar RPC + página |
| Botão WhatsApp flutuante | ❌ | Criar componente |
| Link "Minha Área" no success screen | ❌ | Modificar PublicBooking |
| Card individual de agendamento | ❌ | Criar componente |
| RPC `get_client_bookings_history` | ❌ | Migration SQL |

---

## Critérios de Aceitação

### AC-1: Rota e Acesso à Área do Cliente
- [x] Rota `/minha-area/:slug` criada em `App.tsx` como rota pública
- [x] Página carrega perfil do negócio via `slug` (mesmo padrão do PublicBooking)
- [x] Tema Beauty/Brutal aplicado conforme `business.user_type`
- [x] URL é compartilhável e funciona ao abrir diretamente no browser

### AC-2: Autenticação por Telefone (Gate)
- [x] Se cliente não está autenticado (sem `PublicClientContext`), exibe tela de verificação de telefone
- [x] Reutiliza a mesma lógica do `ClientAuthModal` (componente existente)
- [x] Após autenticação, exibe os dados do cliente
- [x] Sessão persiste via localStorage (mesmo padrão existente)

### AC-3: Seção "Próximos Agendamentos"
- [x] Lista todos os agendamentos com status `pending` ou `confirmed`
- [x] Cada card exibe: data, hora, serviços, profissional (se houver), preço total, status
- [x] Botão "Editar" → redireciona para `/book/:slug` com pré-seleção (ou step de edição)
- [x] Botão "Cancelar" → confirmation modal → cancela com soft-delete (status = 'cancelled')
- [x] Botão WhatsApp no card → abre WhatsApp do estabelecimento com mensagem pré-formatada
- [x] Estado vazio elegante quando não há agendamentos futuros

### AC-4: Seção "Histórico de Serviços"
- [x] Lista todos os agendamentos com status `completed` (ordenados por data desc)
- [x] Cada card exibe: data, serviços realizados, profissional, preço pago
- [x] Botão "Reagendar" → redireciona para `/book/:slug` com serviços pré-selecionados via query params
- [x] Paginação ou "carregar mais" se histórico > 10 itens
- [x] Estado vazio com mensagem encorajadora e CTA para fazer primeiro agendamento

### AC-5: Botão WhatsApp Flutuante
- [x] Botão verde flutuante fixo no canto inferior direito (mobile e desktop)
- [x] Exibe ícone WhatsApp com texto "Falar com {business_name}"
- [x] Ao clicar: abre `https://wa.me/{phone}?text=Olá, gostaria de falar sobre meu agendamento`
- [x] Mensagem pré-formatada inclui nome do cliente e referência ao estabelecimento
- [x] Apenas exibe se `business.phone` está disponível
- [x] Animação suave de entrada (fade-in com delay 1s)

### AC-6: Link "Minha Área" no Success Screen do Agendamento
- [x] Após agendamento concluído (`step === 'success'`), exibe botão "Ver Minha Área"
- [x] Botão redireciona para `/minha-area/:slug`
- [x] Botão posicionado abaixo do botão WhatsApp de confirmação existente
- [x] Estilo secondary (não concorre com a CTA principal de WhatsApp)

### AC-7: Perfil do Cliente (Tab/Seção)
- [x] Exibe foto, nome, telefone e email do cliente logado
- [x] Botão "Editar Perfil" → modal inline para editar nome e email
- [x] Botão "Sair" → limpa localStorage e redireciona para `/minha-area/:slug` (volta ao gate de telefone)

### AC-8: UX e Performance
- [x] Loading skeleton durante carregamento dos dados
- [x] Responsivo: mobile-first, funciona perfeitamente em iPhone SE e acima
- [x] Tratamento de erro elegante (ex: negócio não encontrado, sem conexão)
- [x] Sem layout shift (CLS) ao carregar dados

---

## Plano de Implementação Técnico

### Fase 1 — Backend (Migration SQL)

**Arquivo:** `supabase/migrations/20260302_client_area_rpc.sql`

```sql
-- RPC: Busca histórico completo de agendamentos do cliente
-- Retorna todos os agendamentos (ativos + histórico) por telefone e business
CREATE OR REPLACE FUNCTION get_client_bookings_history(
  p_phone TEXT,
  p_business_id UUID
)
RETURNS TABLE (
  id UUID,
  appointment_time TIMESTAMPTZ,
  status TEXT,
  service_ids UUID[],
  service_names TEXT[],
  professional_name TEXT,
  total_price DECIMAL,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.appointment_time,
    pb.status,
    pb.service_ids,
    ARRAY(
      SELECT s.name
      FROM services s
      WHERE s.id = ANY(pb.service_ids)
    ) AS service_names,
    tm.full_name AS professional_name,
    pb.total_price,
    pb.duration_minutes,
    pb.created_at
  FROM public_bookings pb
  LEFT JOIN team_members tm ON tm.id = pb.professional_id
  WHERE
    pb.customer_phone = p_phone
    AND pb.business_id = p_business_id
  ORDER BY pb.appointment_time DESC;
END;
$$;
```

### Fase 2 — Componentes

#### 2.1 ClientBookingCard.tsx (novo)
```
components/ClientBookingCard.tsx
```
Props: `booking`, `isBeauty`, `businessPhone`, `onCancel`, `onRebook`

Exibe:
- Data formatada (Ex: "Seg, 10 Mar às 14h30")
- Badges de status com cores (pending=amarelo, confirmed=verde, completed=cinza)
- Lista de serviços com ícones
- Nome do profissional (se houver)
- Preço total formatado
- Botões de ação (Editar/Cancelar para futuros | Reagendar para histórico)
- Botão WhatsApp inline

#### 2.2 ClientWhatsAppFAB.tsx (novo)
```
components/ClientWhatsAppFAB.tsx
```
FAB = Floating Action Button
Props: `phone`, `businessName`, `clientName`, `isBeauty`

#### 2.3 ClientArea.tsx (novo — página principal)
```
pages/ClientArea.tsx
```
Tabs: `upcoming` | `history` | `profile`

### Fase 3 — Routing

**Arquivo modificado:** `App.tsx`
```tsx
// Adicionar após /pro/:slug
<Route path="/minha-area/:slug" element={<ClientArea />} />
```

### Fase 4 — Integração no PublicBooking

**Arquivo modificado:** `pages/PublicBooking.tsx`

Na seção de sucesso (`step === 'success'`), adicionar após o botão WhatsApp existente:
```tsx
<Link to={`/minha-area/${slug}`}>
  <button className="...">Ver Minha Área</button>
</Link>
```

---

## Arquitetura de Dados

### Fluxo de Dados da ClientArea

```
[URL: /minha-area/:slug]
        ↓
[Busca business por slug]
        ↓
[Verifica PublicClientContext (localStorage)]
        ↓
   ┌────┴────┐
   │         │
[Autenticado] [Não autenticado]
   │         │
   │    [Gate: input telefone]
   │    [login() via RPC]
   │         │
   └────┬────┘
        ↓
[get_client_bookings_history(phone, businessId)]
        ↓
   ┌────┴──────────────┐
   │                   │
[Próximos]         [Histórico]
[status: pending]  [status: completed]
[status: confirmed]
```

### Queries Usadas

| Query | Origem | Dados Retornados |
|-------|--------|-----------------|
| `profiles?slug=eq.{slug}` | Supabase | Perfil do negócio + theme |
| `get_public_client_by_phone` | RPC existente | Dados do cliente |
| `get_client_bookings_history` | **Nova RPC** | Todos os agendamentos |

---

## Design e UX

### Especificação Visual

```
┌─────────────────────────────────────────────┐
│  [Logo]  Beauty Studio Alpha    [Minha Área] │
│          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
├─────────────────────────────────────────────┤
│  👋 Olá, Maria Silva                        │
│  📱 +55 11 98765-4321                       │
├─────────────────────────────────────────────┤
│  [Próximos ▼] [Histórico] [Perfil]          │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │ 📅 Seg, 10 Mar · 14h30             │    │
│  │ ✂️ Corte + Barba                   │    │
│  │ 👤 João Paulo                       │    │
│  │ 💰 R$ 75,00        🟡 Pendente     │    │
│  │                                     │    │
│  │ [Editar]  [Cancelar]  [WhatsApp]   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 📅 Qui, 05 Mar · 10h00             │    │
│  │ 💈 Corte Degradê                   │    │
│  │ 👤 Carlos                           │    │
│  │ 💰 R$ 45,00        ✅ Confirmado   │    │
│  └─────────────────────────────────────┘    │
│                              [💬 WhatsApp]  │
└─────────────────────────────────────────────┘
```

### Cores e Tema

**Barbershop (Brutal):**
- Background: `#050505` (obsidian)
- Cards: `bg-zinc-900 border border-zinc-700`
- Accent: `accent-gold` (dourado)
- Status pending: `bg-yellow-500/20 text-yellow-300`
- Status confirmed: `bg-green-500/20 text-green-300`
- Status completed: `bg-zinc-600/20 text-zinc-400`

**Beauty Salon:**
- Background: `#E2E1DA` (silk)
- Cards: `bg-white/80 border border-stone-200`
- Accent: `beauty-neon` (rosa/lilás)
- Status pending: `bg-amber-100 text-amber-700`
- Status confirmed: `bg-green-100 text-green-700`
- Status completed: `bg-stone-100 text-stone-500`

---

## Arquivos Impactados

### Criados (novos)
- [x] `pages/ClientArea.tsx` — Página principal da área do cliente
- [x] `components/ClientBookingCard.tsx` — Card individual de agendamento
- [x] `components/ClientWhatsAppFAB.tsx` — Botão WhatsApp flutuante
- [x] `supabase/migrations/20260302_client_area_rpc.sql` — RPC de histórico

### Modificados (existentes)
- [x] `App.tsx` — Adicionar rota `/minha-area/:slug`
- [x] `pages/PublicBooking.tsx` — Link "Minha Área" no success screen
- [x] `docs/stories/README.md` — Registrar US-014

---

## Testes

### Cenários de Teste

1. **Acesso sem autenticação:** Exibe gate de telefone
2. **Autenticação com telefone registrado:** Carrega dados do cliente
3. **Autenticação com telefone novo:** Exibe formulário de cadastro
4. **Sem agendamentos futuros:** Estado vazio na tab "Próximos"
5. **Sem histórico:** Estado vazio na tab "Histórico"
6. **Cancelamento de agendamento:** Booking atualizado para `cancelled`
7. **Clique no botão WhatsApp FAB:** URL correta com mensagem pré-formatada
8. **Business sem telefone:** FAB não exibe
9. **Slug inválido:** Exibe 404 elegante

---

## Definição de Pronto (DoD)

- [ ] Todos os critérios de aceitação (AC-1 a AC-8) implementados e verificados manualmente
- [ ] RPC `get_client_bookings_history` aplicada no Supabase
- [ ] Rota `/minha-area/:slug` acessível e funcional
- [ ] Tema Beauty e Brutal ambos testados visualmente
- [ ] Mobile responsivo (iPhone SE 375px e acima)
- [ ] `npm run lint` — 0 erros
- [ ] `npm run typecheck` — 0 erros
- [ ] Sem `console.log` expostos em produção
- [ ] Link "Minha Área" visível no success screen do PublicBooking
- [ ] Botão WhatsApp FAB funcional com URL correta

---

## Estimativa de Esforço

| Fase | Componente | Complexidade |
|------|-----------|-------------|
| Backend | Migration SQL (RPC) | Baixa |
| Frontend | `ClientArea.tsx` | Alta |
| Frontend | `ClientBookingCard.tsx` | Média |
| Frontend | `ClientWhatsAppFAB.tsx` | Baixa |
| Integration | `App.tsx` + `PublicBooking.tsx` | Baixa |
| **Total** | **4 arquivos novos + 2 modificações** | **Média-Alta** |

---

## Dev Agent Record

### Debug Log
_Nenhum log ainda_

### Completion Notes
_Nenhuma nota ainda_

### Change Log
| Data | Ação | Agente |
|------|------|--------|
| 2026-03-02 | Story criada com plano técnico completo | @dev (Dex) |
| 2026-03-02 | Implementação completa — 4 arquivos novos + 2 modificações | @dev (Dex) |
