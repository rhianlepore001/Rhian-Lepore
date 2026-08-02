# M1 — Rotas e superfícies

## Tabela principal

| Rota (hash) | Arquivo de página | Definição em App.tsx (arquivo:linha) | Lazy? | Layout/Wrapper | Guard (ProtectedLayout / OwnerRouteGuard / nenhum) | Acesso (pública / autenticada / owner-only) | Caminho de navegação até ela (a partir do Dashboard, clique por clique, citando o componente de navegação e arquivo:linha) |
|---|---|---|---|---|---|---|---|
| `/#/register` | pages/Register.tsx | App.tsx:152 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — rota pública; link `Criar conta` em Login (pages/Login.tsx:347) |
| `/#/login` | pages/Login.tsx | App.tsx:153 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — rota pública; link `Entrar` em Register (pages/Register.tsx:200) |
| `/#/termos` | pages/Legal.tsx | App.tsx:154 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — rota pública; link `Termos` em Register (pages/Register.tsx:368) |
| `/#/privacidade` | pages/Legal.tsx | App.tsx:155 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — rota pública; link `Privacidade` em Register (pages/Register.tsx:370) |
| `/#/forgot-password` | pages/ForgotPassword.tsx | App.tsx:156 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — rota pública; link em Login (pages/Login.tsx:341) |
| `/#/update-password` | pages/UpdatePassword.tsx | App.tsx:157 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — rota pública; redirect automático de token recovery (App.tsx:138-144) |
| `/#/playwright-bug-reporter-demo` | pages/PlaywrightBugReporterDemo.tsx | App.tsx:158 | sim | Suspense (App.tsx:149) | DevRouteGuard (App.tsx:114-120) | autenticada | não aplicável — URL direta |
| `/#/design-review-demo` | pages/DesignReviewDemo.tsx | App.tsx:159 | sim | Suspense (App.tsx:149) | DevRouteGuard (App.tsx:114-120) | autenticada | não aplicável — URL direta |
| `/#/club-demo` | pages/ClubDemo.tsx | App.tsx:160 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — URL direta |
| `/#/book/:slug` | pages/PublicBooking.tsx | App.tsx:161 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — rota pública; link em ClientArea (pages/ClientArea.tsx:287) |
| `/#/queue/:slug` | pages/QueueJoin.tsx | App.tsx:162 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — URL direta |
| `/#/queue-status/:id` | pages/QueueStatus.tsx | App.tsx:163 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — redirect pós-entrada na fila (pages/QueueJoin.tsx:112) |
| `/#/pro/:slug` | pages/ProfessionalPortfolio.tsx | App.tsx:164 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — URL direta |
| `/#/minha-area/:slug` | pages/ClientArea.tsx | App.tsx:165 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — link público (components/PublicBusinessHeader.tsx:126) |
| `/#/clube` | pages/JoinClub.tsx | App.tsx:166 | sim | Suspense (App.tsx:149) | nenhum | pública | não aplicável — URL direta |
| `/#/onboarding-wizard` | pages/OnboardingWizard.tsx | App.tsx:167-171 | sim | RequireAuth (App.tsx:168-170) | RequireAuth (App.tsx:99-111) | autenticada | redirect automático se `!tutorialCompleted` e `role !== 'staff'` (App.tsx:78-84) |
| `/#/onboarding` | — (Navigate) | App.tsx:172 | não | Suspense (App.tsx:149) | nenhum | autenticada | não aplicável — alias; redirect para `/#/onboarding-wizard` (App.tsx:172) |
| `/#/staff-onboarding` | pages/StaffOnboarding.tsx | App.tsx:173-179 | sim | RequireAuth + Suspense (App.tsx:173-178) | RequireAuth (App.tsx:99-111) | autenticada | redirect automático se `!tutorialCompleted` e `role === 'staff'` (App.tsx:80-81) |
| `/#/` | pages/Dashboard.tsx | App.tsx:183 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | destino inicial pós-login (pages/Login.tsx:65) |
| `/#/agenda` | pages/Agenda.tsx | App.tsx:184 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | Sidebar → `Agenda` (constants.ts:7 · components/Sidebar.tsx:106) |
| `/#/fila` | pages/QueueManagement.tsx | App.tsx:185 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | Sidebar → `Fila Digital` (constants.ts:8 · components/Sidebar.tsx:106) |
| `/#/clientes` | pages/Clients.tsx | App.tsx:186 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | Sidebar → `Clientes CRM` (constants.ts:9 · components/Sidebar.tsx:106) |
| `/#/clientes/:id` | pages/ClientCRM.tsx | App.tsx:187 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | Sidebar → `Clientes CRM` (constants.ts:9 · components/Sidebar.tsx:106) → card de cliente (pages/Clients.tsx:256) |
| `/#/produtos` | pages/Products.tsx | App.tsx:188 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | Sidebar → `Produtos` (constants.ts:10 · components/Sidebar.tsx:106) |
| `/#/financeiro` | pages/Finance.tsx | App.tsx:189 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | Sidebar → `Financeiro` (constants.ts:11 · components/Sidebar.tsx:106) |
| `/#/insights` | pages/Reports.tsx | App.tsx:190 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:190) | owner-only | Sidebar → `Insights` (constants.ts:12 · components/Sidebar.tsx:106) |
| `/#/meus-insights` | pages/StaffInsights.tsx | App.tsx:191 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | BottomMobileNav → `Insights` (components/BottomMobileNav.tsx:95) — visível só para staff |
| `/#/configuracoes` | — (Navigate) | App.tsx:194 | não | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:194) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → redirect para `/#/configuracoes/geral` (App.tsx:194) |
| `/#/configuracoes/geral` | pages/settings/GeneralSettings.tsx | App.tsx:195 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout (pages/settings/GeneralSettings.tsx) | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:195) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Geral` (constants.ts:25 · components/SettingsLayout.tsx:59) |
| `/#/configuracoes/agendamento` | pages/settings/PublicBookingSettings.tsx | App.tsx:196 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:196) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Agendamento` (constants.ts:26 · components/SettingsLayout.tsx:59) |
| `/#/configuracoes/equipe` | pages/settings/TeamSettings.tsx | App.tsx:197 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:197) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Equipe` (constants.ts:27 · components/SettingsLayout.tsx:59) |
| `/#/configuracoes/servicos` | pages/settings/ServiceSettings.tsx | App.tsx:198 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:198) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Serviços` (constants.ts:28 · components/SettingsLayout.tsx:59) |
| `/#/configuracoes/comissoes` | pages/settings/CommissionsSettings.tsx | App.tsx:199 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:199) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Comissões` (constants.ts:29 · components/SettingsLayout.tsx:59) |
| `/#/configuracoes/financeiro` | — (Navigate) | App.tsx:200 | não | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | não determinado — rota redirect sem item de menu; URL direta → redirect (App.tsx:200) |
| `/#/configuracoes/assinatura` | pages/settings/SubscriptionSettings.tsx | App.tsx:201 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:201) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Assinatura` (constants.ts:30 · components/SettingsLayout.tsx:59) |
| `/#/configuracoes/clube` | pages/settings/MembershipPlansSettings.tsx | App.tsx:202 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:202) | owner-only | Dashboard → card `Clube de Assinatura` (pages/Dashboard.tsx:222) → botão em MembersList (pages/MembersList.tsx:104) |
| `/#/configuracoes/clube/pix` | pages/settings/MembershipSettings.tsx | App.tsx:203 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:203) | owner-only | Dashboard → card `Clube de Assinatura` (pages/Dashboard.tsx:222) → `/#/clube/assinantes` → link `← Configurar Pix` (pages/settings/MembershipPlansSettings.tsx:157) |
| `/#/clube/assinantes` | pages/MembersList.tsx | App.tsx:204 | sim | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:204) | owner-only | Dashboard → card `Clube de Assinatura` (pages/Dashboard.tsx:222) |
| `/#/configuracoes/auditoria` | pages/settings/AuditLogs.tsx | App.tsx:205 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · DevRouteGuard (App.tsx:205) | autenticada | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Auditoria` (constants.ts:34 · components/SettingsLayout.tsx:59) — requer `isDev` |
| `/#/configuracoes/lixeira` | pages/settings/RecycleBin.tsx | App.tsx:206 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · DevRouteGuard (App.tsx:206) | autenticada | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Lixeira` (constants.ts:35 · components/SettingsLayout.tsx:59) — requer `isDev` |
| `/#/configuracoes/seguranca` | pages/settings/SecuritySettings.tsx | App.tsx:207 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:207) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Segurança` (constants.ts:32 · components/SettingsLayout.tsx:59) |
| `/#/configuracoes/erros` | — (Navigate) | App.tsx:208 | não | Layout via ProtectedLayout (App.tsx:87) | ProtectedLayout (App.tsx:182) | autenticada | não aplicável — URL direta → redirect (App.tsx:208) |
| `/#/configuracoes/ui-preview` | pages/settings/UiPreview.tsx | App.tsx:209 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · DevRouteGuard (App.tsx:209) | autenticada | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Preview UI` (constants.ts:33 · components/SettingsLayout.tsx:59) — requer `isDev` |
| `/#/configuracoes/notificacoes` | pages/Placeholder.tsx | App.tsx:210 | sim | Layout via ProtectedLayout (App.tsx:87) · SettingsLayout | ProtectedLayout (App.tsx:182) · OwnerRouteGuard (App.tsx:210) | owner-only | Sidebar → `Ajustes` (constants.ts:13 · components/Sidebar.tsx:106) → nav `Notificações` (constants.ts:31 · components/SettingsLayout.tsx:59) |
| `/#/*` (catch-all) | — (Navigate) | App.tsx:214 | não | Suspense (App.tsx:149) | nenhum | autenticada / pública | não aplicável — URL inválida → redirect para `/#/` (App.tsx:214) |

## Rotas públicas e contratos de URL

| Rota (hash) | Parâmetro | Leitura no código (arquivo:linha) | Tratamento se parâmetro inválido (arquivo:linha) |
|---|---|---|---|
| `/#/register` | `type` (query) | pages/Register.tsx:24 · pages/Register.tsx:39 | fallback para `'barber'` se valor ≠ `'beauty'` (pages/Register.tsx:25) |
| `/#/register` | `company` (query) | pages/Register.tsx:33 | não determinado — RPC `get_company_for_invite` sem UI de erro dedicada (pages/Register.tsx:50-63) |
| `/#/book/:slug` | `:slug` | pages/PublicBooking.tsx:74 | tela `Página indisponível` se `!business \|\| profileError` (pages/PublicBooking.tsx:670-683) |
| `/#/book/:slug` | `pro` (query) | pages/PublicBooking.tsx:77 | não determinado |
| `/#/book/:slug` | `rebook` (query) | pages/PublicBooking.tsx:78 | não determinado |
| `/#/book/:slug` | `edit` (query) | pages/PublicBooking.tsx:79 | log de aviso se agendamento não encontrado (pages/PublicBooking.tsx:182) |
| `/#/queue/:slug` | `:slug` | pages/QueueJoin.tsx:46 | mensagem `Estabelecimento não encontrado` se `!business` (pages/QueueJoin.tsx:123) |
| `/#/queue/:slug` | `pro` (query) | pages/QueueJoin.tsx:47-48 | não determinado |
| `/#/queue-status/:id` | `:id` | pages/QueueStatus.tsx:13 | mensagem `Não encontramos você na fila...` se `!entry` (pages/QueueStatus.tsx:105) |
| `/#/pro/:slug` | `:slug` | pages/ProfessionalPortfolio.tsx:10 | tela `Profissional não encontrado` + botão Voltar (pages/ProfessionalPortfolio.tsx:53-58) |
| `/#/minha-area/:slug` | `:slug` | pages/ClientArea.tsx:31 | mensagem `Estabelecimento não encontrado.` se `businessError \|\| !business` (pages/ClientArea.tsx:272-276) |
| `/#/clube` | `slug` (query) | pages/JoinClub.tsx:16-17 | tela `Link inválido. Solicite o link correto...` se `!slug` (pages/JoinClub.tsx:119-126); slug inválido não vazio: toast `Link inválido.` no submit (pages/JoinClub.tsx:48-49) |
| `/#/update-password` | `access_token`, `refresh_token`, `type` (hash/query) | pages/UpdatePassword.tsx:32-51 | mensagem `Sessão expirada ou link inválido...` (pages/UpdatePassword.tsx:70) ou `Link de recuperação inválido ou expirado...` (pages/UpdatePassword.tsx:63) |

## Itens de navegação

| Rótulo exato | Ícone | Rota destino | Componente declarado (arquivo:linha) | Condicionado a role/flag (arquivo:linha) |
|---|---|---|---|---|
| Dashboard | LayoutDashboard | `/#/` | constants.ts:6 · components/Sidebar.tsx:106 | visível se `!item.ownerOnly \|\| !isStaff` (components/Sidebar.tsx:21) |
| Agenda | Calendar | `/#/agenda` | constants.ts:7 · components/Sidebar.tsx:106 | idem (components/Sidebar.tsx:21) |
| Fila Digital | Clock | `/#/fila` | constants.ts:8 · components/Sidebar.tsx:106 | idem (components/Sidebar.tsx:21) |
| Clientes CRM | Users | `/#/clientes` | constants.ts:9 · components/Sidebar.tsx:106 | idem (components/Sidebar.tsx:21) |
| Produtos | Package | `/#/produtos` | constants.ts:10 · components/Sidebar.tsx:106 | idem (components/Sidebar.tsx:21) |
| Financeiro | DollarSign | `/#/financeiro` | constants.ts:11 · components/Sidebar.tsx:106 | oculto para staff: `ownerOnly: true` (constants.ts:11) |
| Insights | TrendingUp | `/#/insights` | constants.ts:12 · components/Sidebar.tsx:106 | oculto para staff: `ownerOnly: true` (constants.ts:12) |
| Ajustes | Settings | `/#/configuracoes` | constants.ts:13 · components/Sidebar.tsx:106 | oculto para staff: `ownerOnly: true` (constants.ts:13) |
| Meus Insights | TrendingUp | `/#/meus-insights` | components/Sidebar.tsx:112 | `isStaff` (components/Sidebar.tsx:111-112) |
| Sair | LogOut | logout | components/Sidebar.tsx:126 | nenhuma |
| AgendiX (logo) | — | `/#/` | components/Sidebar.tsx:83 | nenhuma |
| Agenda | Calendar | `/#/agenda` | components/BottomMobileNav.tsx:36-44 | oculto em rotas settings/billing ou `?new` (components/Layout.tsx:54) |
| Clientes | Users | `/#/clientes` | components/BottomMobileNav.tsx:50-58 | idem (components/Layout.tsx:54) |
| Ações rápidas | Plus | modal QuickActionsModal | components/BottomMobileNav.tsx:65-72 | idem (components/Layout.tsx:54) |
| Financeiro | DollarSign | `/#/financeiro` | components/BottomMobileNav.tsx:82-90 | `!isStaff` (components/BottomMobileNav.tsx:79) |
| Insights | TrendingUp | `/#/meus-insights` | components/BottomMobileNav.tsx:95-104 | `isStaff` (components/BottomMobileNav.tsx:92) |
| Mais | Menu | drawer MoreOptionsDrawer | components/BottomMobileNav.tsx:110-118 | idem (components/Layout.tsx:54) |
| Início | LayoutDashboard | `/#/` | components/MoreOptionsDrawer.tsx:117 | `!item.ownerOnly \|\| !isStaff` (components/MoreOptionsDrawer.tsx:127) |
| Agenda | Clock | `/#/agenda` | components/MoreOptionsDrawer.tsx:118 | idem (components/MoreOptionsDrawer.tsx:127) |
| Clientes | Users | `/#/clientes` | components/MoreOptionsDrawer.tsx:119 | idem (components/MoreOptionsDrawer.tsx:127) |
| Financeiro | DollarSign | `/#/financeiro` | components/MoreOptionsDrawer.tsx:120 | `ownerOnly: true` (components/MoreOptionsDrawer.tsx:120) |
| Produtos | Package | `/#/produtos` | components/MoreOptionsDrawer.tsx:121 | `ownerOnly: true` (components/MoreOptionsDrawer.tsx:121) |
| Fila Digital | Users | `/#/fila` | components/MoreOptionsDrawer.tsx:122 | nenhuma |
| Insights | TrendingUp | `/#/insights` | components/MoreOptionsDrawer.tsx:123 | `ownerOnly: true` (components/MoreOptionsDrawer.tsx:123) |
| Ajustes | Settings | `/#/configuracoes` | components/MoreOptionsDrawer.tsx:124 | `ownerOnly: true` (components/MoreOptionsDrawer.tsx:124) |
| Sair da Conta | LogOut | logout | components/MoreOptionsDrawer.tsx:234 | nenhuma |
| Voltar ao Dashboard | ArrowLeft | `/#/` | components/Header.tsx:75 | `isSettingsRoute` (components/Header.tsx:74) |
| Voltar ao Dashboard (mobile) | ArrowLeft | `/#/` | components/Header.tsx:91 | `pathname !== '/' && !isSettingsRoute` (components/Header.tsx:90) |
| Meu Perfil | User | modal ProfileModal | components/Header.tsx:254 | nenhuma |
| Configurações | Settings | `/#/configuracoes/geral` | components/Header.tsx:258 | `role !== 'staff'` (components/Header.tsx:256) |
| Sair | LogOut | logout | components/Header.tsx:269 | nenhuma |
| Avisos Importantes (dinâmico) | AlertTriangle | `alert.actionPath` | components/Header.tsx:194 | quando alerta tem `actionPath` (components/Header.tsx:193) |
| Geral | Settings | `/#/configuracoes/geral` | constants.ts:25 · components/SettingsLayout.tsx:59 | owner: todos; staff: filtrado (components/SettingsLayout.tsx:110-112) |
| Agendamento | Calendar | `/#/configuracoes/agendamento` | constants.ts:26 · components/SettingsLayout.tsx:59 | idem |
| Equipe | Users | `/#/configuracoes/equipe` | constants.ts:27 · components/SettingsLayout.tsx:59 | idem |
| Serviços | Package | `/#/configuracoes/servicos` | constants.ts:28 · components/SettingsLayout.tsx:59 | staff: único item no array (components/SettingsLayout.tsx:110-111) |
| Comissões | DollarSign | `/#/configuracoes/comissoes` | constants.ts:29 · components/SettingsLayout.tsx:59 | owner only no filtro (components/SettingsLayout.tsx:110-112) |
| Assinatura | CreditCard | `/#/configuracoes/assinatura` | constants.ts:30 · components/SettingsLayout.tsx:59 | idem |
| Notificações | Bell | `/#/configuracoes/notificacoes` | constants.ts:31 · components/SettingsLayout.tsx:59 | idem |
| Segurança | Shield | `/#/configuracoes/seguranca` | constants.ts:32 · components/SettingsLayout.tsx:59 | idem |
| Preview UI | ClipboardList | `/#/configuracoes/ui-preview` | constants.ts:33 · components/SettingsLayout.tsx:59 | `devOnly: true`; visível se `isDev` (components/SettingsLayout.tsx:112) |
| Auditoria | ShieldAlert | `/#/configuracoes/auditoria` | constants.ts:34 · components/SettingsLayout.tsx:59 | idem |
| Lixeira | Trash2 | `/#/configuracoes/lixeira` | constants.ts:35 · components/SettingsLayout.tsx:59 | idem |
| Voltar ao Dashboard | ArrowLeft | `/#/dashboard` | components/SettingsLayout.tsx:90 | nenhuma — rota `/dashboard` não declarada; cai no catch-all (App.tsx:214) |
| Novo Atendimento | Calendar | `/#/agenda?new=true` | components/QuickActionsModal.tsx:54-64 | nenhuma |
| Nova Transação | DollarSign | `/#/financeiro?new=true` | components/QuickActionsModal.tsx:70-80 | `!isStaff` (components/QuickActionsModal.tsx:68) |

## Rotas alcançáveis que não aparecem em nenhum menu

| Rota (hash) | Como se chega (arquivo:linha) |
|---|---|
| `/#/register` | URL direta · link Login (pages/Login.tsx:347) |
| `/#/login` | URL direta · logout · links Register (pages/Register.tsx:200) |
| `/#/termos` | URL direta · link Register (pages/Register.tsx:368) |
| `/#/privacidade` | URL direta · link Register (pages/Register.tsx:370) |
| `/#/forgot-password` | URL direta · link Login (pages/Login.tsx:341) |
| `/#/update-password` | URL direta · redirect token recovery (App.tsx:138-144) |
| `/#/playwright-bug-reporter-demo` | URL direta |
| `/#/design-review-demo` | URL direta |
| `/#/club-demo` | URL direta |
| `/#/book/:slug` | URL direta · links ClientArea (pages/ClientArea.tsx:287) · ClientBookingCard (components/ClientBookingCard.tsx:103) |
| `/#/queue/:slug` | URL direta |
| `/#/queue-status/:id` | redirect QueueJoin (pages/QueueJoin.tsx:112) |
| `/#/pro/:slug` | URL direta |
| `/#/minha-area/:slug` | URL direta · PublicBusinessHeader (components/PublicBusinessHeader.tsx:126) · PublicBooking (pages/PublicBooking.tsx:546) |
| `/#/clube` | URL direta |
| `/#/onboarding-wizard` | redirect ProtectedLayout (App.tsx:83) · pós-login owner (pages/Login.tsx:63) |
| `/#/onboarding` | URL direta → redirect (App.tsx:172) |
| `/#/staff-onboarding` | redirect ProtectedLayout (App.tsx:81) · pós-login staff (pages/Login.tsx:55) · pós-register staff (pages/Register.tsx:99) |
| `/#/clientes/:id` | Clients → Link card (pages/Clients.tsx:256) |
| `/#/configuracoes/clube` | MembersList botão (pages/MembersList.tsx:104) · link MembershipSettings (pages/settings/MembershipSettings.tsx:187) |
| `/#/configuracoes/clube/pix` | link MembershipPlansSettings (pages/settings/MembershipPlansSettings.tsx:157) |
| `/#/clube/assinantes` | card Dashboard (pages/Dashboard.tsx:222) |
| `/#/configuracoes/financeiro` | URL direta → redirect (App.tsx:200) |
| `/#/configuracoes/erros` | URL direta → redirect (App.tsx:208) |

## Rotas declaradas sem página / páginas sem rota

| Tipo | Item | Arquivo:linha |
|---|---|---|
| página sem rota | pages/settings/FinancialSettings.tsx | pages/settings/FinancialSettings.tsx:1 — não importada em App.tsx |
| rota sem arquivo de página | nenhuma — rotas com `<Navigate>` usam componente inline (App.tsx:172, App.tsx:194, App.tsx:200, App.tsx:208, App.tsx:214) | — |

## Diferença owner vs staff (rotas protegidas)

| Rota (hash) | Comportamento para `role === 'staff'` (arquivo:linha) |
|---|---|
| `/#/` | renderiza Dashboard (App.tsx:183) |
| `/#/agenda` | renderiza Agenda (App.tsx:184) |
| `/#/fila` | renderiza QueueManagement (App.tsx:185) |
| `/#/clientes` | renderiza Clients (App.tsx:186) |
| `/#/clientes/:id` | renderiza ClientCRM (App.tsx:187) |
| `/#/produtos` | renderiza Products (App.tsx:188) |
| `/#/financeiro` | renderiza Finance (App.tsx:189) — item de nav oculto (constants.ts:11 · components/BottomMobileNav.tsx:79) |
| `/#/insights` | OwnerRouteGuard → redirect `/#/` + toast sessionStorage (App.tsx:128-130 · pages/Dashboard.tsx:40-44) |
| `/#/meus-insights` | renderiza StaffInsights (App.tsx:191) |
| `/#/configuracoes` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/geral` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/agendamento` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/equipe` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/servicos` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/comissoes` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/financeiro` | redirect para `/#/configuracoes/comissoes` (App.tsx:200) → OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/assinatura` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/clube` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/clube/pix` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/clube/assinantes` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/auditoria` | DevRouteGuard: se `!isDev` → `/#/configuracoes` (App.tsx:118) → OwnerRouteGuard → redirect `/#/` + toast |
| `/#/configuracoes/lixeira` | idem DevRouteGuard (App.tsx:118) |
| `/#/configuracoes/seguranca` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/configuracoes/erros` | redirect → auditoria (App.tsx:208) → cadeia DevRouteGuard acima |
| `/#/configuracoes/ui-preview` | idem DevRouteGuard (App.tsx:118) |
| `/#/configuracoes/notificacoes` | OwnerRouteGuard → redirect `/#/` + toast (App.tsx:128-130) |
| `/#/onboarding-wizard` | RequireAuth renderiza; ProtectedLayout redireciona staff para `/#/staff-onboarding` se `!tutorialCompleted` (App.tsx:80-81) |
| `/#/staff-onboarding` | RequireAuth renderiza StaffOnboarding (App.tsx:173-178) |
| `/#/meus-insights` (owner navegando) | componente redireciona owner para `/#/insights` (pages/StaffInsights.tsx:50) |

## Contagem

| Métrica | Quantidade |
|---|---|
| Rotas na tabela principal | 45 |
| Contratos de URL públicos | 13 |
| Itens de navegação | 45 |
| Rotas alcançáveis fora de menu | 24 |
| Páginas sem rota | 1 |
| Entradas owner vs staff | 27 |
| **Total de itens catalogados** | **155** |

## Lacunas (não determinado)

1. Parâmetro `company` inválido em `/#/register` — RPC silenciosa, sem UI de erro dedicada (pages/Register.tsx:50-63).
2. Valores de `alert.actionPath` no Header — gerados em runtime, rotas destino não estáticas (components/Header.tsx:194).
3. Query params `pro`, `rebook`, `edit` em `/#/book/:slug` quando inválidos — sem tratamento dedicado verificável além de logs (pages/PublicBooking.tsx:77-79 · pages/PublicBooking.tsx:182).
