# M2 — Vocabulário visual (componentes)

## 1. Inventário de primitivos em components/ui/

| Componente | Arquivo:linha | Props (nome: tipo) | Variantes disponíveis (valores literais aceitos) | Estados suportados no código (hover / focus / active / disabled / loading / error) — marque só os que existem de fato e cite a linha | Tamanhos/alturas disponíveis | Nº de usos no projeto | Arquivos que o usam (até 8, depois "+N") |
|---|---|---|---|---|---|---|---|
| Badge | components/ui/Badge.tsx:13 | children: React.ReactNode; variant?: BadgeVariant; className?: string; forceTheme?: ThemeVariant | accent, danger, success, warning, neutral | nenhum | não determinado | 19 | pages/settings/UiPreview.tsx, pages/Products.tsx, pages/Finance.tsx |
| Button | components/ui/Button.tsx:26 | variant?: ButtonVariant; size?: ButtonSize; icon?: React.ReactNode; iconRight?: React.ReactNode; fullWidth?: boolean; loading?: boolean; forceTheme?: ThemeVariant; + ButtonHTMLAttributes | primary, secondary, danger, ghost, success, outline | focus (59), active (64), disabled (51,64,67), loading (51,69,72) | sm: min-h-[44px] md:min-h-[36px] md:h-9 (21); md: h-11 min-h-[44px] (22); lg: h-[52px] min-h-[52px] (23) | 160 | pages/Agenda.tsx, pages/settings/UiPreview.tsx, pages/QueueJoin.tsx, pages/settings/FinancialSettings.tsx, pages/settings/TeamSettings.tsx, components/TeamMemberForm.tsx, pages/settings/ServiceSettings.tsx, pages/settings/CommissionsSettings.tsx, +41 |
| Card | components/ui/Card.tsx:35 | children: React.ReactNode; variant?: CardVariantInput; title?: React.ReactNode; action?: React.ReactNode; noPadding?: boolean; className?: string; id?: string; style?: React.CSSProperties; forceTheme?: ThemeVariant; onClick?: () => void | outlined, elevated, default (deprecado), accent (deprecado), glow (deprecado) | hover (80), focus (80), active (80) quando onClick; disabled: não | padding via density.cardPadding (124): barber p-4 md:p-5; beauty p-5 md:p-8 (hooks/useBrutalTheme.ts:231,241) | 117 | pages/StaffInsights.tsx, pages/settings/UiPreview.tsx, components/TimeGrid.tsx, components/StaffEarningsCard.tsx, pages/QueueManagement.tsx, pages/Finance.tsx, pages/settings/TeamSettings.tsx, pages/settings/RecycleBin.tsx, +31 |
| Checkbox | components/ui/Checkbox.tsx:11 | label?: string; error?: string; forceTheme?: ThemeVariant; + Omit<InputHTMLAttributes, type \| size> | não determinado | focus (45), disabled (25,49), error (44,58,64) | h-5 w-5 (42) | 3 | pages/settings/UiPreview.tsx |
| ConfirmModal | components/ui/ConfirmModal.tsx:17 | open: boolean; title?: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: danger \| default; loading?: boolean; onConfirm: () => void; onCancel: () => void | danger, default | loading (12,37,43); disabled via loading nos botões (37,43) | size fixo sm via Modal interno (32) | 8 | pages/Finance.tsx, pages/MembersList.tsx, pages/ClientCRM.tsx, pages/PublicBooking.tsx, pages/Agenda.tsx, pages/QueueManagement.tsx, pages/QueueStatus.tsx |
| EmptyState | components/ui/EmptyState.tsx:16 | icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string; forceTheme?: ThemeVariant; bordered?: boolean | bordered: true/false | nenhum | py-12 px-6 (23) | 16 | pages/ClientArea.tsx, pages/settings/UiPreview.tsx, pages/Products.tsx, pages/Agenda.tsx, pages/ClientCRM.tsx, pages/QueueManagement.tsx, components/dashboard/modals/GoalHistoryModal.tsx, components/dashboard/modals/MonthlyProfitModal.tsx, +1 |
| ErrorState | components/ui/ErrorState.tsx:14 | title?: string; message?: string; onRetry?: () => void; retryLabel?: string; className?: string; forceTheme?: ThemeVariant | não determinado | hover (42) no botão retry | py-12 px-6 (26); botão retry px-4 py-2 (39) | 3 | pages/settings/UiPreview.tsx, pages/Products.tsx |
| Input | components/ui/Input.tsx:21 | label?: string; error?: string; hint?: string; icon?: React.ReactNode; iconRight?: React.ReactNode; size?: sm \| md \| lg; fullWidth?: boolean; forceTheme?: ThemeVariant; + Omit<InputHTMLAttributes, size> | não determinado | focus (88), disabled (90), error (86,93,111) | sm: h-9 (16); md: h-11 (17); lg: h-[52px] (18) | 25 | pages/settings/UiPreview.tsx, pages/Clients.tsx, pages/Register.tsx, pages/Products.tsx, pages/Login.tsx |
| Modal | components/ui/Modal.tsx:37 | open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: ModalSize; footer?: React.ReactNode; preventClose?: boolean; closeOnOverlay?: boolean; closeOnEsc?: boolean; showCloseButton?: boolean; className?: string; forceTheme?: ThemeVariant | size: sm, md, lg, xl, full | hover (144) no botão fechar; disabled (149) no botão fechar quando preventClose | sm max-w-sm; md max-w-md; lg max-w-[560px]; xl max-w-2xl; full h-[100dvh] (28-34) | 29 | components/CheckoutModal.tsx, pages/MembersList.tsx, pages/settings/UiPreview.tsx, pages/QueueManagement.tsx, pages/Products.tsx, pages/settings/MembershipPlansSettings.tsx, pages/Finance.tsx, components/CommissionPaymentHistory.tsx, +14 |
| PageHeader | components/ui/PageHeader.tsx:18 | title: string; subtitle?: React.ReactNode; action?: React.ReactNode; meta?: React.ReactNode; className?: string; forceTheme?: ThemeVariant | não determinado | nenhum | title text-2xl md:text-3xl (40) | 4 | pages/MembersList.tsx, pages/Reports.tsx, pages/Finance.tsx, pages/Dashboard.tsx |
| Select | components/ui/Select.tsx:28 | label?: string; error?: string; hint?: string; options: SelectOption[]; placeholder?: string; size?: sm \| md \| lg; fullWidth?: boolean; forceTheme?: ThemeVariant; + Omit<SelectHTMLAttributes, size> | não determinado | focus (82), disabled (84), error (81,85) | sm: h-9 (23); md: h-11 (24); lg: h-[52px] (25) | 4 | pages/settings/UiPreview.tsx, pages/Products.tsx |
| SettingsRow | components/ui/SettingsRow.tsx:23 | label: string; help?: string; icon?: LucideIcon; children?: React.ReactNode; className?: string | não determinado | nenhum | py-4 (29) | 1 | pages/settings/PublicBookingSettings.tsx |
| Skeleton | components/ui/Skeleton.tsx:36 | variant?: rect \| circle \| text; className?: string; width?: string \| number; height?: string \| number; count?: number | rect, circle, text | nenhum (animate-pulse linha 24) | text: h-4 w-3/4 (16); rect/circle via props | 9 | pages/settings/UiPreview.tsx, components/dashboard/modals/MonthlyProfitModal.tsx, components/dashboard/modals/AllAppointmentsModal.tsx, components/SkeletonLoader.tsx, components/StaffEarningsCard.tsx |
| SkeletonCard | components/ui/SkeletonCard.tsx:48 | className?: string | não determinado | nenhum | p-5 rounded-2xl (51) | 21 | pages/Clients.tsx, pages/Dashboard.tsx, pages/settings/UiPreview.tsx, pages/QueueManagement.tsx, pages/Products.tsx, pages/Reports.tsx |
| Table | components/ui/Table.tsx:42 | columns: TableColumn<T>[]; data: T[]; rowKey; onRowClick?; selectedRowKey?; emptyState?; emptyMessage?; compact?; stickyHeader?; forceTheme?; mobileRender?; getRowClassName? | compact: boolean; stickyHeader: boolean | focus (119-127) em linha com onRowClick | compact: px-3 (58); default px-4 (58) | 2 | pages/settings/UiPreview.tsx, pages/Products.tsx |
| Tabs | components/ui/Tabs.tsx:20 | tabs: TabItem[]; activeTab: string; onTabChange: (id: string) => void; className?: string; size?: sm \| md; forceTheme?: ThemeVariant | size: sm, md | hover (82), disabled (79), focus implícito via button (64-87) | sm: text-xs py-1.5 (49-50); md: text-sm py-2 (49-50) | 1 | pages/settings/UiPreview.tsx |
| ToastProvider | components/ui/Toast.tsx:106 | children: React.ReactNode | type via useToast: success, error, warning, info (6,39-44) | hover (86,97) nos botões internos | max-w-sm p-4 (66) | 1 | App.tsx |

## 2. Componentes ad-hoc que reimplementam um primitivo existente

### Buscas sistemáticas (contagem de ocorrências)

- `<button` literal em pages/ e components/ (exclui components/ui/Button.tsx): **339** ocorrências em **107** arquivos
- `onClick` em `<div`, `<span`, `<li`, `<a` (alvo clicável improvisado): **6** ocorrências em **5** arquivos (exclui teste)
- className contendo `rounded-` + `border` + `p-` (card à mão): **84** em pages/, **128** em components/ → **212** total
- `<input`, `<select`, `<textarea` literais fora de components/ui/: **131** ocorrências (134 total − 3 em ui/Input, ui/Select, ui/Checkbox)
- `fixed inset-0` ou `z-50`: **32** ocorrências em **24** arquivos
- `animate-pulse` (skeleton à mão): **27** ocorrências em **20** arquivos (26 fora de ui/Skeleton.tsx)

### Tabela de reimplementações

| Onde (arquivo:linha) | O que foi reimplementado à mão | Trecho de className (até 120 caracteres, literal) | Primitivo de ui/ que já fazia isso (arquivo:linha) | Divergência concreta observável |
|---|---|---|---|---|
| pages/Login.tsx:102 | botão | group relative h-72 md:h-96 rounded-2xl md:rounded-3xl focus:outline-none focus-visible:ring-2 | Button (components/ui/Button.tsx:26) | altura h-72/h-96 vs Button md h-11 (22); radius rounded-2xl/3xl vs radius.button rounded-lg barber (hooks/useBrutalTheme.ts:211) |
| pages/Login.tsx:135 | botão | group relative h-72 md:h-96 rounded-2xl md:rounded-3xl focus:outline-none focus-visible:ring-2 | Button (components/ui/Button.tsx:26) | altura h-72/h-96 vs Button md h-11 (22); radius rounded-2xl/3xl vs rounded-lg (211) |
| pages/Login.tsx:198 | botão | não determinado | Button (components/ui/Button.tsx:26) | não determinado |
| pages/Login.tsx:315 | botão | não determinado | Button (components/ui/Button.tsx:26) | não determinado |
| pages/PublicBooking.tsx:1150 | botão | flex-1 py-3 font-black text-xs uppercase tracking-widest ${classes.buttonSecondary} | Button (components/ui/Button.tsx:26) | font-black text-xs vs Button font-semibold text-sm (57,22); py-3 sem min-h-[44px] vs h-11 (22) |
| pages/PublicBooking.tsx:1151 | botão | flex-1 py-3 font-black text-xs uppercase tracking-widest ${classes.buttonPrimary} | Button (components/ui/Button.tsx:26) | font-black text-xs vs font-semibold text-sm (57,22); py-3 vs h-11 min-h-[44px] (22) |
| pages/Agenda.tsx:1683 | botão | p-1 rounded-full transition-colors ${colors.textMuted} hover:text-theme-text hover:bg-theme-surface | Button variant ghost (components/ui/Button.tsx:26) | p-1 rounded-full vs Button ghost min-h-[44px] radius.button rounded-lg (21,211); ícone X w-6 h-6 vs [&>svg]:w-4 (76) |
| pages/Agenda.tsx:1110 | skeleton | ${colors.textSecondary} text-xl animate-pulse | Skeleton (components/ui/Skeleton.tsx:36) | text-xl sem bg placeholder vs animate-pulse bg-[var(--color-card-hover)] rounded-xl (24,14) |
| pages/Agenda.tsx:1179 | card | ${colors.card} ${colors.border} p-4 rounded-xl flex items-center justify-between | Card (components/ui/Card.tsx:35) | radius rounded-xl fixo vs barber radius.card rounded-lg (210); padding p-4 vs p-4 md:p-5 (231) |
| pages/Agenda.tsx:1358 | card | ${colors.card} ${colors.border} rounded-2xl p-5 transition-all duration-300 | Card (components/ui/Card.tsx:35) | radius rounded-2xl vs barber rounded-lg (210); padding p-5 fixo vs p-4 md:p-5 (231) |
| pages/Agenda.tsx:1396 | skeleton | w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse | Skeleton variant circle (components/ui/Skeleton.tsx:36) | tamanho w-1.5 h-1.5 vs Skeleton circle sem tamanho default; sem role=status (29) |
| pages/Agenda.tsx:1652 | modal | fixed inset-0 flex items-center justify-center p-4 ${colors.overlay} md:left-64 | Modal (components/ui/Modal.tsx:37) | offset md:left-64 vs Modal inset-0 sem offset (92); max-w-md manual (1666) vs lg max-w-[560px] (31) |
| pages/Agenda.tsx:1677 | badge | text-xs font-mono font-bold px-3 py-0.5 rounded-full inline-block border | Badge (components/ui/Badge.tsx:13) | px-3 py-0.5 font-mono vs Badge neutral px-2 py-0.5 font-bold (319); radius rounded-full vs barber rounded-md (214) |
| pages/Agenda.tsx:1776 | card | p-4 rounded-xl border ${accent.bgDim} ${accent.borderDim} | Card variant outlined (components/ui/Card.tsx:35) | radius rounded-xl vs rounded-lg barber (210); padding p-4 vs density.cardPadding (124) |
| pages/ClientArea.tsx:314 | card | rounded-2xl p-6 ${isBeauty ? 'bg-theme-card shadow-lg border border-theme-border' : ...} | Card (components/ui/Card.tsx:35) | padding p-6 vs p-4 md:p-5 barber / p-5 md:p-8 beauty (231,241) |
| pages/ClientCRM.tsx:533 | skeleton | w-5 h-5 animate-pulse (ícone Sparkles) | Skeleton (components/ui/Skeleton.tsx:36) | ícone Lucide animado vs div bg-[var(--color-card-hover)] (24) |
| pages/ClientCRM.tsx:544 | card | bg-[var(--color-card-hover)] p-3 rounded border border-[var(--color-border)] | Card (components/ui/Card.tsx:35) | radius rounded vs radius.card rounded-lg/2xl (210,218); padding p-3 vs p-4 md:p-5 (231) |
| pages/Dashboard.tsx:140 | card | fixed bottom-24 ... px-4 py-3 rounded-xl shadow-li | Card (components/ui/Card.tsx:35) | posição fixed flutuante vs Card block; padding py-3 vs cardPadding (124) |
| pages/ForgotPassword.tsx:49 | card | bg-[var(--color-card)] border-4 border-black shadow-[var(--shadow-brutal)] p-8 relative | Card (components/ui/Card.tsx:35) | border-4 border-black vs border simples outlined (61); padding p-8 vs p-4 md:p-5 (231) |
| pages/ForgotPassword.tsx:99 | skeleton | animate-pulse flex items-center gap-2 | Skeleton (components/ui/Skeleton.tsx:36) | texto inline vs bloco bg placeholder (24) |
| pages/PublicBooking.tsx:754 | card | p-1.5 ${colors.card} ${colors.border} border rounded-2xl backdrop-blur-xl | Card (components/ui/Card.tsx:35) | padding p-1.5 vs p-4 md:p-5 (231); backdrop-blur-xl ausente em Card (57-72) |
| pages/PublicBooking.tsx:806 | badge | absolute top-4 left-4 px-3 py-1 backdrop-blur-md border rounded-full text-xs font-black uppercase | Badge (components/ui/Badge.tsx:13) | px-3 py-1 font-black uppercase vs px-2 py-0.5 font-bold (319); backdrop-blur ausente em Badge (27-32) |
| pages/PublicBooking.tsx:943 | card | p-6 ${colors.card} ${colors.border} border rounded-2xl ${shadow.card} | Card (components/ui/Card.tsx:35) | padding p-6 vs p-4 md:p-5 (231); shadow.card explícito vs outlined sem shadow (57-65) |
| pages/PublicBooking.tsx:1467 | modal | fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[var(--color-bg)]/50 backdrop-blur-sm | Modal (components/ui/Modal.tsx:37) | overlay bg-[var(--color-bg)]/50 vs classes.modalOverlay (96); sem FocusTrap vs FocusTrap (101-108) |
| pages/PublicBooking.tsx:1736 | modal | fixed inset-0 flex items-center justify-center p-6 bg-[var(--color-bg)]/95 backdrop-blur-md | Modal (components/ui/Modal.tsx:37) | bg opacity 95% vs modalOverlay token; padding p-6 vs body p-5 md:p-6 (157) |
| pages/QueueManagement.tsx:187 | skeleton | border border-[var(--color-success-border)] bg-[var(--color-success-bg)] animate-pulse | Skeleton (components/ui/Skeleton.tsx:36) | borda/background semânticos vs bg-[var(--color-card-hover)] neutro (24) |
| pages/QueueManagement.tsx:317 | card | ${colors.card} backdrop-blur-lg border ${colors.border} p-4 sm:p-5 rounded-2xl | Card (components/ui/Card.tsx:35) | backdrop-blur-lg ausente em Card; radius rounded-2xl vs rounded-lg barber (210) |
| pages/QueueStatus.tsx:193 | skeleton | h-full ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'} animate-pulse w-full | Skeleton (components/ui/Skeleton.tsx:36) | fill color accent vs bg-[var(--color-card-hover)] (24); h-full barra vs bloco configurável |
| pages/Register.tsx:129 | card | relative bg-[#1C1C1C] rounded-2xl border border-[var(--color-border)] shadow-[var(--elevation-3)] | Card (components/ui/Card.tsx:35) | bg hex fixo #1C1C1C vs colors.card token; shadow elevation-3 vs outlined sem shadow (57-65) |
| pages/Reports.tsx:280 | tab | w-full text-left (elemento `<table>`) | Table (components/ui/Table.tsx:42) | table HTML manual vs Table com columns/rowKey API (42-46); sem mobileRender (75-80) |
| components/AppointmentEditModal.tsx:260 | modal | fixed inset-0 ${colors.overlay} flex items-center justify-center md:left-64 p-4 | Modal (components/ui/Modal.tsx:37) | offset md:left-64 ausente em Modal (92); implementação manual FocusTrap vs ui/Modal portal (171) |
| components/AppointmentWizard.tsx:264 | modal | fixed inset-0 md:left-64 flex items-center justify-center p-0 md:p-4 ${colors.overlay} backdrop-blur-sm | Modal (components/ui/Modal.tsx:37) | backdrop-blur-sm + offset sidebar vs Modal overlay padrão (92-96) |
| components/ServiceModal.tsx:177 | modal | fixed inset-0 ${classes.modalOverlay} flex items-center justify-center p-4 backdrop-blur-sm | Modal (components/ui/Modal.tsx:37) | style zIndex inline (177) vs var(--z-modal) (93); container manual vs SIZE_MAP (28-34) |
| components/ServiceModal.tsx:251 | input | ${classes.label} + ${classes.input} literais | Input (components/ui/Input.tsx:21) | classes.input py-3 px-4 (309) vs Input md h-11 px-4 (17); sem prop error/hint integrada (45,111) |
| components/QuickActionsModal.tsx:32 | modal | fixed inset-0 flex items-end justify-center sm:items-center bg-[var(--color-overlay)] backdrop-blur-sm | Modal (components/ui/Modal.tsx:37) | items-end mobile sheet vs items-end md:items-center ui/Modal (92); sem role=dialog explícito |
| components/BugReportModal.tsx:141 | modal | fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center justify-center p-0 md:p-4 | Modal (components/ui/Modal.tsx:37) | estrutura duplicada de overlay+container vs componente único Modal (90-168) |
| components/BugAnnotateModal.tsx:209 | modal | fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center justify-center p-0 md:p-4 | Modal (components/ui/Modal.tsx:37) | idêntico padrão BugReportModal vs import único ui/Modal |
| components/AddAuditEntryModal.tsx:139 | modal | fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center justify-center p-0 md:p-4 | Modal (components/ui/Modal.tsx:37) | modal CRUD manual vs ConfirmModal+Modal composição (ConfirmModal.tsx:28) |
| components/HelpButtons.tsx:161 | modal | fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/50 backdrop-blur-sm p-4 | Modal (components/ui/Modal.tsx:37) | z-50 literal vs var(--z-modal) (93); sem preventClose API (18) |
| components/MoreOptionsDrawer.tsx:136 | modal | fixed inset-0 z-[60] flex justify-end transition-opacity duration-300 | Modal size full (components/ui/Modal.tsx:37) | drawer lateral justify-end vs Modal centered/sheet (92); z-[60] vs var(--z-modal) |
| components/ServiceModal.tsx:312 | botão | flex items-center gap-2 p-2 rounded cursor-pointer transition-colors (div onClick) | Button (components/ui/Button.tsx:26) | div clicável vs button; padding p-2 vs min-h-[44px] (22) |
| components/dashboard/MeuDiaWidget.tsx:157 | skeleton | h-20 ${colors.card} animate-pulse rounded-lg border ${colors.divider} | SkeletonCard (components/ui/SkeletonCard.tsx:48) | h-20 card-shaped vs SkeletonCard p-5 space-y-4 (51-61) |
| components/dashboard/OccupancyRateCard.tsx:84 | skeleton | h-12 rounded-lg ${colors.surface} animate-pulse | Skeleton variant rect (components/ui/Skeleton.tsx:36) | h-12 rounded-lg vs VARIANT_CLASSES rect rounded-xl (14) |
| components/dashboard/CriticalEmptySlotsCard.tsx:74 | skeleton | h-12 rounded-lg ${colors.surface} animate-pulse | Skeleton (components/ui/Skeleton.tsx:36) | rounded-lg vs rounded-xl default rect (14) |
| components/dashboard/CancellationRateCard.tsx:77 | skeleton | h-12 rounded-lg ${colors.surface} animate-pulse | Skeleton (components/ui/Skeleton.tsx:36) | rounded-lg vs rounded-xl (14) |
| components/SkeletonLoader.tsx:8 | skeleton | animate-shimmer bg-gradient-to-r from-white/5 via-white/10 to-white/5 | Skeleton (components/ui/Skeleton.tsx:36) | animate-shimmer gradient vs animate-pulse solid bg (24) |
| components/SkeletonLoader.tsx:22 | skeleton | p-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card-hover)] | SkeletonCard (components/ui/SkeletonCard.tsx:48) | rounded-[24px] vs rounded-2xl (51); p-6 vs p-5 (51) |
| components/TabNav.tsx:23 | tab | flex items-center gap-1.5 rounded-full px-4 py-1.5 font-mono text-xs uppercase | Tabs (components/ui/Tabs.tsx:20) | pill rounded-full container vs underline border-b tabs (57); font-mono uppercase vs font-medium (76) |
| components/SearchableSelect.tsx:65 | dropdown | não determinado (botão trigger custom) | Select (components/ui/Select.tsx:28) | dropdown com busca vs native select appearance-none (76); sem SelectOption[] tipado igual (95-99) |
| components/SettingsSwitch.tsx:32 | toggle | sr-only peer + div rounded-full w-11 h-6 | Checkbox (components/ui/Checkbox.tsx:11) | switch track w-11 h-6 vs checkbox h-5 w-5 (42); sem label/error props (6-8) |
| components/PhoneInput.tsx:147 | dropdown | absolute top-full left-0 mt-1 w-40 shadow-xl z-50 overflow-hidden border | Select (components/ui/Select.tsx:28) | dropdown país z-50 vs select full-width; w-40 fixo vs w-full (76) |
| components/EmptyState.tsx:26 | card | flex flex-col items-center justify-center text-center py-10 px-6 animate-in fade-in | EmptyState (components/ui/EmptyState.tsx:16) | prop message vs title; py-10 vs py-12 (23); animate-in extra (26) |
| components/ErrorState.tsx:35 | botão | inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border (retry) | Button variant danger (components/ui/Button.tsx:26) | text-xs px-4 py-2 rounded-xl vs md h-11 text-sm (22); implementado inline vs Button API |
| components/Header.tsx:170 | badge | absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 ${accent.bg} rounded-full ... animate-pulse | Badge (components/ui/Badge.tsx:13) | h-4 contador notificação vs Badge text-xs py-0.5 (319); animate-pulse ausente em Badge |

## 3. Componentes legados

| Componente | Definido em (arquivo:linha) | Nº de usos | Arquivos que o usam | Primitivo atual substituto |
|---|---|---|---|---|
| BrutalButton | components/BrutalButton.tsx:20 | 11 | components/security/TwoFactorSetup.tsx, components/dashboard/modals/MonthlyProfitModal.tsx, components/dashboard/modals/GoalSettingsModal.tsx, components/dashboard/modals/GoalHistoryModal.tsx, components/dashboard/modals/AllAppointmentsModal.tsx, templates/page.tsx | Button (components/ui/Button.tsx:26) |
| BrutalCard | components/BrutalCard.tsx:29 | 1 | templates/page.tsx | Card (components/ui/Card.tsx:35) |
| Modal (casca legada) | components/Modal.tsx:23 | 1 | pages/settings/ServiceSettings.tsx | Modal (components/ui/Modal.tsx:37) |
| ConfirmModal (casca legada) | components/Modal.tsx:63 | 0 em produção | nenhum (apenas re-export interno) | ConfirmModal (components/ui/ConfirmModal.tsx:17) |
| ModalFooter (legado) | components/Modal.tsx:33 | não determinado | não determinado | footer prop de Modal (components/ui/Modal.tsx:16) |
| Card variants accent/glow/default | components/ui/Card.tsx:26-33 | não determinado (runtime warn) | passagem de variant deprecada em consumidores | Card variant outlined ou elevated (components/ui/Card.tsx:9) |

- BrutalCard importado mas não usado em JSX: components/security/TwoFactorSetup.tsx:4
- Testes de wrappers legados: test/components/BrutalButton.test.tsx, test/components/BrutalCard.test.tsx, test/components/Modal.test.tsx

## 4. Componentes duplicados por nome ou por função

| Função duplicada | Componente A (arquivo:linha) | Componente B (arquivo:linha) |
|---|---|---|
| Navegação por abas | TabNav (components/TabNav.tsx:17) | Tabs (components/ui/Tabs.tsx:20) |
| Seletor de opções | SearchableSelect (components/SearchableSelect.tsx:21) | Select (components/ui/Select.tsx:28) |
| Placeholder de carregamento | SkeletonLoader (components/SkeletonLoader.tsx:8) | Skeleton / SkeletonCard (components/ui/Skeleton.tsx:36, components/ui/SkeletonCard.tsx:48) |
| Estado vazio | EmptyState (components/EmptyState.tsx:15) | EmptyState (components/ui/EmptyState.tsx:16) |
| Modal de confirmação | ConfirmModal legado (components/Modal.tsx:63) | ConfirmModal (components/ui/ConfirmModal.tsx:17) |
| Modal overlay | AppointmentEditModal (components/AppointmentEditModal.tsx:260) | Modal (components/ui/Modal.tsx:37) |
| Modal overlay | AppointmentWizard (components/AppointmentWizard.tsx:264) | Modal (components/ui/Modal.tsx:37) |
| Modal overlay | ServiceModal (components/ServiceModal.tsx:177) | Modal (components/ui/Modal.tsx:37) |
| Modal overlay | QuickActionsModal (components/QuickActionsModal.tsx:32) | Modal (components/ui/Modal.tsx:37) |
| Seletor de data (dia) | CalendarPicker (components/CalendarPicker.tsx:13) | ScheduleSelection inline (components/appointment/ScheduleSelection.tsx) |
| Seletor mês/ano | MonthYearSelector (components/MonthYearSelector.tsx:11) | CalendarPicker navegação mês (components/CalendarPicker.tsx:48-49) |
| Toggle booleano | SettingsSwitch (components/SettingsSwitch.tsx:12) | Checkbox (components/ui/Checkbox.tsx:11) |
| Input telefone | PhoneInput (components/PhoneInput.tsx:19) | Input (components/ui/Input.tsx:21) |

## 5. Componentes com mais de 400 linhas

| Arquivo:linha (export) | Linhas | O que renderiza |
|---|---|---|
| pages/Agenda.tsx:1 | 1864 | Grade de agenda diária/semanal com modais de detalhe, checkout, wizard e fila de booking público. |
| pages/PublicBooking.tsx:1 | 1653 | Fluxo público de agendamento multi-step (serviços, profissional, data/hora, confirmação, chat). |
| pages/Finance.tsx:1 | 1064 | Painel financeiro com gráficos, transações, comissões e filtros por período. |
| pages/Products.tsx:1 | 748 | CRUD e listagem de produtos com tabela e modais. |
| components/CommissionsManagement.tsx:1 | 710 | Gestão de comissões por profissional com tabs, pagamentos e relatórios. |
| pages/ClientArea.tsx:1 | 661 | Portal do cliente com agendamentos, perfil e tabs internas. |
| pages/ClientCRM.tsx:1 | 566 | CRM de clientes com busca, detalhe lateral e ações em massa. |
| pages/QueueManagement.tsx:1 | 560 | Gestão de fila digital com estados calling/serving e QR. |
| components/CheckoutModal.tsx:1 | 505 | Modal de checkout de agendamento com pagamento e produtos. |
| pages/settings/CommissionsSettings.tsx:1 | 499 | Configuração de regras e percentuais de comissão. |
| pages/ClubDemo.tsx:1 | 482 | Demonstração de clube/assinatura com planos e PIX. |
| components/ProfessionalCommissionDetails.tsx:1 | 479 | Detalhamento de comissão individual com histórico e ajustes. |
| pages/settings/UiPreview.tsx:1 | 469 | Showcase interativo dos primitivos ui/ para validação visual. |
| pages/settings/AuditLogs.tsx:1 | 433 | Listagem filtrada de logs de auditoria. |
| components/AppointmentWizard.tsx:29 | 433 | Wizard multi-step para criar agendamento interno. |
| components/AppointmentEditModal.tsx:1 | 431 | Modal de edição de agendamento existente. |
| pages/Dashboard.tsx:1 | 413 | Dashboard principal com widgets de KPIs, ações e copilot. |
