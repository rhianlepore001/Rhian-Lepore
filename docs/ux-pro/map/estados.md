# M4 — Estados e fluxos

## 1 — Estados por tela

| Página | Arquivo | Loading: existe? qual forma + arquivo:linha | Empty state: existe? tem ação ou só informa? + arquivo:linha | Error state: existe? genérico ou específico? texto literal + arquivo:linha | Falha de rede (catch faz o quê) + arquivo:linha | Hook(s) de dados |
|--------|---------|-----------------------------------------------|--------------------------------------------------------------|----------------------------------------------------------------------------|---------------------------------------------------|------------------|
| Dashboard | `pages/Dashboard.tsx` | sim — skeleton `SkeletonCard` `pages/Dashboard.tsx:154-155`, `pages/Dashboard.tsx:190-193` | não | não | `useDashboardData` sem `isError` na UI; falha silenciosa via query `hooks/useDashboardData.ts:42-47` | `useDashboardData` `hooks/useDashboardData.ts:9`; `useMembershipStats` `hooks/useMemberships.ts`; `useTenantLocale` `hooks/useTenantLocale.ts:20`; `useAlerts` `contexts/AlertsContext.tsx:260` |
| Agenda | `pages/Agenda.tsx` | sim — texto "Carregando agenda..." `pages/Agenda.tsx:1107-1110`; spinner parcial `Loader2` `pages/Agenda.tsx:1170` | sim — EmptyState legado; CTA "Novo Agendamento" `pages/Agenda.tsx:1463`; "Adicionar Profissionais" `pages/Agenda.tsx:1436`; só informa em atrasados `pages/Agenda.tsx:1173` | toast em mutations; sem `ErrorState` na carga | handlers: `showToast` + `logger.error` ex. `pages/Agenda.tsx:587-590`; fetch inicial `fetchData` `pages/Agenda.tsx:340-351` sem catch | supabase direto (state local); `useAppTour` `hooks/useAppTour.ts:289`; `useTenantLocale` |
| Fila (gestão) | `pages/QueueManagement.tsx` | sim — skeleton `SkeletonCard` `pages/QueueManagement.tsx:219-230` | sim — `ui/EmptyState` com CTA "Adicionar cliente" `pages/QueueManagement.tsx:302-310`; segunda lista só informa `pages/QueueManagement.tsx:373` | toast `pages/QueueManagement.tsx:110` | `catch` → `showToast` `pages/QueueManagement.tsx:108-110`; hook sem UI de erro | `useQueueEntries` `hooks/useQueue.ts:40`; `useBusinessSlug`; `useQueueTeamMembers`; `useServiceById` |
| Clientes | `pages/Clients.tsx` | sim — skeleton `SkeletonCard` `pages/Clients.tsx:232-237` | sim — CTA "Adicionar cliente" `pages/Clients.tsx:240-246` | toast `pages/Clients.tsx:161` | fetch: `catch` → `logger.error` silêncio `pages/Clients.tsx:83-84`; create: `showToast` `pages/Clients.tsx:158-161` | supabase direto (`loading` local `pages/Clients.tsx:29`) |
| CRM Cliente | `pages/ClientCRM.tsx` | sim — texto "Carregando dados do cliente..." `pages/ClientCRM.tsx:247-248` | sim — EmptyState sem prop `action` `pages/ClientCRM.tsx:423-427` | texto "Cliente não encontrado." `pages/ClientCRM.tsx:251-252`; toast em mutations | fetch: `catch` → `console.error` `pages/ClientCRM.tsx:99-100`; mutations: `showToast` | supabase direto; `useAIOSDiagnostic` `hooks/useAIOSDiagnostic.ts:76`; `useSemanticMemory` `hooks/useSemanticMemory.ts:76` |
| Produtos | `pages/Products.tsx` | sim — skeleton `SkeletonCard` `pages/Products.tsx:504-515` | sim — CTA owner "Cadastrar produto" `pages/Products.tsx:527-534`; filtro vazio sem CTA `pages/Products.tsx:541-542` | sim — `ErrorState` "Não foi possível carregar os produtos" `pages/Products.tsx:519-521` | `isError` + refetch; mutations → toast `pages/Products.tsx:218` | `useProducts` `hooks/useCatalog.ts:6`; `useCreateProduct`; `useUpdateProduct`; `useSellProduct`; `useAgendaTeamMembers`; `useAgendaClients` |
| Financeiro | `pages/Finance.tsx` | não na carga inicial (`loading` state `pages/Finance.tsx:90` não renderizado) | não — lista vazia sem EmptyState | toast via `formatUserFacingError` em mutations `pages/Finance.tsx:338-339` | fetch: `catch` → `logger.error` silêncio `pages/Finance.tsx:314-315`; mutations: `showToast` | `useMonthlyHistory` `hooks/useFinance.ts:21`; `useFinanceDropdowns`; `useDeleteFinanceTransaction`; `useMarkExpenseAsPaid`; `useCreateFinanceRecord`; fetch local `fetchFinanceStats` `pages/Finance.tsx:216` |
| Insights (owner) | `pages/Reports.tsx` | sim — skeleton `SkeletonCard` `pages/Reports.tsx:113-124` | sim — artesanal "Coletando dados..." só informa `pages/Reports.tsx:149-160` | toast export `pages/Reports.tsx:53` | hook `useReportsData` sem `isError` exposto `hooks/useReports.ts:18-27` | `useReportsData` `hooks/useReports.ts:5`; `useTenantLocale` |
| Meus Resultados (staff) | `pages/StaffInsights.tsx` | sim — texto "Carregando..." `pages/StaffInsights.tsx:207`, `pages/StaffInsights.tsx:235` | sim — "Vinculação pendente" só informa `pages/StaffInsights.tsx:117-120`; listas vazias só informa `pages/StaffInsights.tsx:208`, `pages/StaffInsights.tsx:236` | não | fetch Supabase direto sem `catch` `pages/StaffInsights.tsx:60-90` | supabase direto (`loading` local `pages/StaffInsights.tsx:48`) |
| Configurações Geral | `pages/settings/GeneralSettings.tsx` | sim — texto "Carregando..." `pages/settings/GeneralSettings.tsx:197-200` | não | toast `pages/settings/GeneralSettings.tsx:188` | mutation `catch` → `showToast` `pages/settings/GeneralSettings.tsx:185-188` | `useBusinessSettings`; `useProfileFields` `hooks/useSettings.ts` |
| Agendamento (settings) | `pages/settings/PublicBookingSettings.tsx` | sim — texto "Carregando agendamento..." `pages/settings/PublicBookingSettings.tsx:88` | não | `alert('Erro ao salvar configurações.')` `pages/settings/PublicBookingSettings.tsx:65` | `catch` → `alert` `pages/settings/PublicBookingSettings.tsx:63-65` | hooks settings (sem UI de erro na carga) |
| Equipe | `pages/settings/TeamSettings.tsx` | sim — spinner CSS `pages/settings/TeamSettings.tsx:96-99` | sim — CTA "Cadastrar Primeiro Perfil" `pages/settings/TeamSettings.tsx:111-115` | `alert('Erro ao excluir.')` `pages/settings/TeamSettings.tsx:33` | delete `catch` → `alert` `pages/settings/TeamSettings.tsx:31-33` | `useTeamMembers` `hooks/useTeam.ts`; `useDeleteTeamMember` |
| Serviços (settings) | `pages/settings/ServiceSettings.tsx` | sim — texto "Carregando..." `pages/settings/ServiceSettings.tsx:87-88` | sim — CTA "Criar Primeira Categoria" `pages/settings/ServiceSettings.tsx:100-104`; categoria vazia só informa `pages/settings/ServiceSettings.tsx:137-138` | `alert` em validação local `pages/settings/ServiceSettings.tsx:72` | delete categoria `catch` log `pages/settings/ServiceSettings.tsx:40-49` | `useServiceSettings` `hooks/useServiceSettings.ts:39` |
| Comissões | `pages/settings/CommissionsSettings.tsx` | sim — texto "Carregando configurações..." `pages/settings/CommissionsSettings.tsx:206` | sim — "Nenhum profissional cadastrado" só informa `pages/settings/CommissionsSettings.tsx:273` | `alert` múltiplos ex. `pages/settings/CommissionsSettings.tsx:102` | `catch` → `alert` ex. `pages/settings/CommissionsSettings.tsx:100-102` | `useTeamMembers`; fetch local settings |
| Assinatura | `pages/settings/SubscriptionSettings.tsx` | sim — spinner no botão `pages/settings/SubscriptionSettings.tsx:190` | não | `alert` checkout `pages/settings/SubscriptionSettings.tsx:89`, `pages/settings/SubscriptionSettings.tsx:93` | Stripe invoke `catch` → `alert` `pages/settings/SubscriptionSettings.tsx:91-93` | `useSubscription` `hooks/useSubscription.ts:21` |
| Planos Clube | `pages/settings/MembershipPlansSettings.tsx` | sim — texto "Carregando planos..." `pages/settings/MembershipPlansSettings.tsx:161-162` | não explícito na listagem | toast `pages/settings/MembershipPlansSettings.tsx:116` | mutation `catch` → toast `pages/settings/MembershipPlansSettings.tsx:115-116` | `useMembershipPlans` |
| Pix Clube | `pages/settings/MembershipSettings.tsx` | sim — texto "Carregando..." `pages/settings/MembershipSettings.tsx:80-83` | não | toast `pages/settings/MembershipSettings.tsx:76` | `catch` → toast `pages/settings/MembershipSettings.tsx:75-76` | `useBusinessPixConfig` |
| Assinantes | `pages/MembersList.tsx` | sim — texto "Carregando..." `pages/MembersList.tsx:163-164` | sim — só informa `pages/MembersList.tsx:169-172` | toast `pages/MembersList.tsx:87` | mutation `catch` → toast `pages/MembersList.tsx:75-87` | `useClientMemberships` `hooks/useMemberships.ts` |
| Auditoria | `pages/settings/AuditLogs.tsx` | sim — texto "Carregando…" + `Loader2` `pages/settings/AuditLogs.tsx:312-314` | sim — só informa "Nenhum problema registrado por aqui. 🎉" `pages/settings/AuditLogs.tsx:317-319` | toast parcial `pages/settings/AuditLogs.tsx:158`, `pages/settings/AuditLogs.tsx:177` | fetch sem `ErrorState`; erros via toast em ações | supabase direto (`loading` local `pages/settings/AuditLogs.tsx:110`) |
| Lixeira | `pages/settings/RecycleBin.tsx` | sim — texto "Carregando lixeira..." `pages/settings/RecycleBin.tsx:123-126` | sim — só informa "Lixeira Vazia" `pages/settings/RecycleBin.tsx:128-132` | `alert` restore `pages/settings/RecycleBin.tsx:32` | restore `catch` → `alert` `pages/settings/RecycleBin.tsx:30-32` | `useDeletedItems` `hooks/useRecycleBin.ts` |
| Segurança | `pages/settings/SecuritySettings.tsx` | sim — texto "Carregando configurações de segurança..." `pages/settings/SecuritySettings.tsx:35-37` | não | `alert` ex. `pages/settings/SecuritySettings.tsx:31` | desativar 2FA `catch` → `alert` `pages/settings/SecuritySettings.tsx:29-31` | `use2FA` `hooks/use2FA.ts:66` |
| UI Preview | `pages/settings/UiPreview.tsx` | sim — demo skeleton `pages/settings/UiPreview.tsx:427-436` | sim — demo EmptyState `pages/settings/UiPreview.tsx:443-444` | sim — demo ErrorState `pages/settings/UiPreview.tsx:456-457` | demo | nenhum hook de produção |
| Notificações (placeholder) | `pages/Placeholder.tsx` | não | sim — só informa "Esta funcionalidade está em desenvolvimento e estará disponível em breve." `pages/Placeholder.tsx:19-20` | não | — | nenhum |
| Financeiro (legado) | `pages/settings/FinancialSettings.tsx` | sim — spinner `Loader2` `pages/settings/FinancialSettings.tsx:42-46` | não | `alert('Erro ao salvar. Tente novamente.')` `pages/settings/FinancialSettings.tsx:38` | `catch` → `alert` `pages/settings/FinancialSettings.tsx:36-38` | `useBusinessSettings` (rota redireciona `App.tsx:200`) |
| Login | `pages/Login.tsx` | sim — spinner no botão submit `pages/Login.tsx:332` | não | sim — específico via `formatUserFacingError(mapError(...))` default "Não foi possível entrar. Verifique seus dados e tente de novo." `pages/Login.tsx:42-43` | `login` error → `setError` `pages/Login.tsx:42-43` | `useAuth` `contexts/AuthContext.tsx` |
| Registro | `pages/Register.tsx` | sim — spinner no botão `pages/Register.tsx:193`, `pages/Register.tsx:362` | não | sim — inline ex. "As senhas não coincidem" `pages/Register.tsx:71` | register error → `setError` | `useAuth` |
| Termos/Privacidade | `pages/Legal.tsx` | não | não | não | — | nenhum |
| Esqueci senha | `pages/ForgotPassword.tsx` | sim — spinner submit `pages/ForgotPassword.tsx:98-100` | não | sim — específico ex. catch `pages/ForgotPassword.tsx:29-31` | `catch` → `setError` `pages/ForgotPassword.tsx:29-31` | supabase auth direto |
| Atualizar senha | `pages/UpdatePassword.tsx` | sim — spinner sessão `pages/UpdatePassword.tsx:123`, botão `pages/UpdatePassword.tsx:204` | não | sim — inline `pages/UpdatePassword.tsx:63-93` | `catch`/`setError` `pages/UpdatePassword.tsx:72`, `pages/UpdatePassword.tsx:111` | supabase auth direto |
| Onboarding owner | `pages/OnboardingWizard.tsx` | sim — spinner + "Carregando..." `pages/OnboardingWizard.tsx:26-33` | não | não | hook sem UI de erro | `useOnboardingState` `hooks/useOnboardingState.ts:60` |
| Onboarding staff | `pages/StaffOnboarding.tsx` | sim — spinner botão `pages/StaffOnboarding.tsx:32-36` | não | toast `pages/StaffOnboarding.tsx:36` | `markTutorialCompleted` error → toast | `useAuth` |
| Agendamento público | `pages/PublicBooking.tsx` | sim — spinner "Preparando os horários..." `pages/PublicBooking.tsx:657-665` | fluxo chat sem EmptyState global | sim — "Página indisponível" `pages/PublicBooking.tsx:678-679` | `profileError`/`!business` tela cheia `pages/PublicBooking.tsx:670`; submit toast `pages/PublicBooking.tsx:611` | `useBusinessProfileBySlug` `hooks/usePublicBooking.ts:45`; `usePublicServices`; `usePublicCategories`; `usePublicProfessionals`; `usePublicGallery` |
| Entrar na fila | `pages/QueueJoin.tsx` | sim — spinner `Loader2` `pages/QueueJoin.tsx:122` | serviços vazios só informa `pages/QueueJoin.tsx:243` | sim — "Não foi possível entrar na fila. Tente novamente ou avise no balcão." `pages/QueueJoin.tsx:305` | `catch` → `setJoinError(true)` `pages/QueueJoin.tsx:116`; sem toast | supabase direto |
| Status fila (público) | `pages/QueueStatus.tsx` | sim — spinner `Loader2` `pages/QueueStatus.tsx:104` | sim — só informa "Não encontramos você na fila..." `pages/QueueStatus.tsx:105` | `leaveError` state `pages/QueueStatus.tsx:38-39` | leave `catch` silencioso `pages/QueueStatus.tsx:38`; fetch via hook sem erro UI | `useQueueStatusSnapshot` `hooks/useQueueStatus.ts` |
| Portfólio pro | `pages/ProfessionalPortfolio.tsx` | sim — spinner `pages/ProfessionalPortfolio.tsx:45-48` | não | não | fetch `catch` log `pages/ProfessionalPortfolio.tsx:35` | supabase direto |
| Minha área cliente | `pages/ClientArea.tsx` | sim — spinner `Loader2` `pages/ClientArea.tsx:264-268`, `pages/ClientArea.tsx:502` | sim — CTA "Agendar" `pages/ClientArea.tsx:520-524` | sim — "Estabelecimento não encontrado." `pages/ClientArea.tsx:276` | `profileError`/`businessError` render dedicado | `useBusinessProfileBySlug`; `useBusinessSettings`; `PublicClientContext` |
| Clube (público) | `pages/JoinClub.tsx` | sim — texto "Carregando planos..." `pages/JoinClub.tsx:147` | não explícito | toast múltiplos `pages/JoinClub.tsx:49-112` | mutation `catch` → toast `pages/JoinClub.tsx:103-112` | `useBusinessProfileBySlug`; `usePublicMembershipPlans`; `usePublicPixConfig` |
| Club Demo | `pages/ClubDemo.tsx` | não | não | não | fixtures locais | nenhum |
| Design Review Demo | `pages/DesignReviewDemo.tsx` | não | não | não | — | nenhum |
| Playwright Bug Demo | `pages/PlaywrightBugReporterDemo.tsx` | não | não | não | — | nenhum |

---

## 2 — Cliques até a ação principal

Fluxos partindo do Dashboard (`/#/`). Rótulos literais do controle.

### criar agendamento

- `Ações rápidas` (botão central Plus) `components/BottomMobileNav.tsx:65`
- `Novo Atendimento` `components/QuickActionsModal.tsx:64`
- seleção de cliente no `SearchableSelect` (passo 1) `components/appointment/ClientSelection.tsx:75-80`
- `Continuar` `components/AppointmentWizard.tsx:460`
- seleção de serviço (card clicável) `components/appointment/ServiceList.tsx:111`
- `Continuar` `components/AppointmentWizard.tsx:460`
- seleção de horário (slot) `components/appointment/ScheduleSelection.tsx:123`
- `Continuar` `components/AppointmentWizard.tsx:460`
- `Confirmar Atendimento` `components/AppointmentWizard.tsx:469`

**Total: 9 cliques**

### confirmar/cobrar um agendamento

- `Agenda` `components/BottomMobileNav.tsx:36`
- clique no card do agendamento (lista mobile) `pages/Agenda.tsx:1481`
- `Confirmar e cobrar` `pages/Agenda.tsx:1801`
- forma de pagamento (radio ex. `PIX`) `components/CheckoutModal.tsx:448-472`
- `Confirmar Pagamento` (ou `Concluir atendimento` se clube cobre) `components/CheckoutModal.tsx:307-308`

**Total: 5 cliques**

### marcar falta (no-show)

- `Agenda` `components/BottomMobileNav.tsx:36`
- clique no card do agendamento `pages/Agenda.tsx:1481`
- `Faltou` `pages/Agenda.tsx:1810`
- `Marcar falta` (ConfirmModal) `pages/Agenda.tsx:850` via `ConfirmModal` botão confirmar `components/ui/ConfirmModal.tsx:40-46`

**Total: 4 cliques**

### cadastrar cliente

- `Clientes` `components/BottomMobileNav.tsx:50`
- `Adicionar cliente` `pages/Clients.tsx:187-188`
- preenchimento de campos (formulário)
- `Cadastrar` `pages/Clients.tsx:374-375`

**Total: 3 cliques** (exclui preenchimento de campos)

### ver histórico de um cliente

- `Clientes` `components/BottomMobileNav.tsx:50`
- clique no card do cliente (Link) `pages/Clients.tsx:256`
- scroll até seção `Histórico de Cortes` / `Histórico de Visitas` `pages/ClientCRM.tsx:421` (conteúdo renderizado na mesma página)

**Total: 2 cliques**

### lançar entrada financeira

- `Financeiro` `components/BottomMobileNav.tsx:82`
- `Registrar receita` `pages/Finance.tsx:578-579`
- preenchimento de campos (modal)
- `Registrar` `pages/Finance.tsx:847`

**Total: 3 cliques** (exclui preenchimento de campos)

### ver fechamento do mês

- `Financeiro` `components/BottomMobileNav.tsx:82`
- `Histórico` (aba TabNav) `pages/Finance.tsx:600`
- visualização `MonthlyHistory` (sem clique adicional; dados em `pages/Finance.tsx:807-812`)

**Total: 2 cliques**

### adicionar serviço

- `Mais` `components/BottomMobileNav.tsx:110`
- `Ajustes` `components/MoreOptionsDrawer.tsx:124`, botão menu `components/MoreOptionsDrawer.tsx:199`
- `Serviços` (sidebar settings) `constants.ts:28`, NavLink `components/SettingsLayout.tsx:59-78`
- `Serviço` `pages/settings/ServiceSettings.tsx:81-82`
- submit no `ServiceModal` (botão salvar) `components/ServiceModal.tsx:329-330` label `Salvar Serviço`

**Total: 5 cliques** (exclui preenchimento de campos)

### adicionar profissional da equipe

- `Mais` `components/BottomMobileNav.tsx:110`
- `Ajustes` `components/MoreOptionsDrawer.tsx:124`, botão `components/MoreOptionsDrawer.tsx:199`
- `Equipe` (sidebar) `constants.ts:27`, NavLink `components/SettingsLayout.tsx:59-78`
- `Profissional` `pages/settings/TeamSettings.tsx:51-52` (ou `Cadastrar Primeiro Perfil` se vazio `pages/settings/TeamSettings.tsx:115`)
- `Salvar Profissional` `components/TeamMemberForm.tsx:336-344`

**Total: 5 cliques** (exclui preenchimento de campos)

### adicionar alguém na fila digital

- `Mais` `components/BottomMobileNav.tsx:110`
- `Fila Digital` `components/MoreOptionsDrawer.tsx:122`, botão `components/MoreOptionsDrawer.tsx:199`
- `Adicionar` (desktop) `pages/QueueManagement.tsx:256-257` ou botão mobile sem texto `pages/QueueManagement.tsx:267-268`
- preenchimento de campos (modal)
- `Adicionar na fila` `pages/QueueManagement.tsx:476-477`

**Total: 4 cliques** (exclui preenchimento de campos)

---

## 3 — Feedback ao usuário

Inventário de `showToast` e `alert()`.

### showToast

| arquivo:linha | tipo | mensagem literal |
|---------------|------|------------------|
| `pages/Agenda.tsx:572` | aviso | Apenas o dono pode excluir agendamentos do histórico. |
| `pages/Agenda.tsx:585` | sucesso | Agendamento e registro financeiro excluídos. |
| `pages/Agenda.tsx:590` | erro | Erro ao excluir agendamento do histórico. |
| `pages/Agenda.tsx:773` | sucesso | Agendamento aceito com sucesso! |
| `pages/Agenda.tsx:777` | erro | Erro ao aceitar agendamento. |
| `pages/Agenda.tsx:786` | info | Solicitação recusada. |
| `pages/Agenda.tsx:790` | erro | Erro ao recusar a solicitação. |
| `pages/Agenda.tsx:796` | aviso | Apenas o dono pode concluir agendamentos. |
| `pages/Agenda.tsx:811` | erro | Erro ao concluir agendamento. Tente novamente. |
| `pages/Agenda.tsx:816` | aviso | Apenas o dono pode cancelar agendamentos. |
| `pages/Agenda.tsx:832` | sucesso | Agendamento cancelado e movido para o histórico. |
| `pages/Agenda.tsx:840` | erro | Erro ao cancelar agendamento. |
| `pages/Agenda.tsx:864` | erro | Erro ao marcar como não compareceu. |
| `pages/Agenda.tsx:880` | erro | Erro ao atribuir profissional. |
| `pages/Agenda.tsx:899` | aviso | Preencha todos os campos! |
| `pages/Agenda.tsx:906` | aviso | Serviço inválido. |
| `pages/Agenda.tsx:915` | aviso | Preço inválido! |
| `pages/Agenda.tsx:968` | sucesso | Agendamento criado com sucesso! |
| `pages/Agenda.tsx:987` | erro | Erro ao criar agendamento. |
| `components/AppointmentWizard.tsx:202` | aviso | (dinâmico) `result.message \|\| 'Horário indisponível'` |
| `components/AppointmentWizard.tsx:251` | erro | (dinâmico) `formatUserFacingError(ui)` |
| `components/AppointmentEditModal.tsx:245` | sucesso | Agendamento atualizado com sucesso! |
| `components/AppointmentEditModal.tsx:250` | erro | Não foi possível salvar as alterações. Tente novamente. |
| `pages/ClientCRM.tsx:124` | sucesso | Notas salvas com sucesso! |
| `pages/ClientCRM.tsx:127` | erro | Não foi possível salvar as notas. Tente novamente. |
| `pages/ClientCRM.tsx:150` | sucesso | Nota e Memória de IA salvas! |
| `pages/ClientCRM.tsx:153` | erro | Não foi possível salvar. Tente novamente. |
| `pages/ClientCRM.tsx:161` | info | Cliente sem telefone cadastrado. |
| `pages/ClientCRM.tsx:206` | sucesso | Cliente atualizado com sucesso! |
| `pages/ClientCRM.tsx:210` | erro | Não foi possível atualizar o cliente. Tente novamente. |
| `pages/ClientCRM.tsx:236` | sucesso | Cliente desativado com sucesso! |
| `pages/ClientCRM.tsx:240` | erro | Não foi possível desativar o cliente. Tente novamente. |
| `pages/ClientCRM.tsx:315` | sucesso | Foto atualizada com sucesso! |
| `pages/ClientCRM.tsx:319` | erro | Não foi possível atualizar a foto. Tente novamente. |
| `pages/Products.tsx:211` | sucesso | Produto salvo |
| `pages/Products.tsx:214` | sucesso | Produto salvo |
| `pages/Products.tsx:218` | erro | Não foi possível salvar o produto |
| `pages/Products.tsx:230` | sucesso | Produto desativado |
| `pages/Products.tsx:234` | erro | Não foi possível desativar o produto |
| `pages/Products.tsx:246` | sucesso | Venda registrada |
| `pages/Products.tsx:253` | erro | Produto indisponível. Atualize a página. |
| `pages/Products.tsx:257` | erro | Não foi possível concluir a venda |
| `pages/Clients.tsx:105` | info | Informe pelo menos um contato (telefone ou e-mail). |
| `pages/Clients.tsx:129` | info | Não foi possível enviar a foto. O cliente será criado sem foto. |
| `pages/Clients.tsx:138` | info | Não foi possível enviar a foto. O cliente será criado sem foto. |
| `pages/Clients.tsx:161` | erro | Não foi possível criar o cliente. Tente novamente. |
| `pages/Finance.tsx:334` | sucesso | Transação excluída com sucesso! |
| `pages/Finance.tsx:339` | erro | (dinâmico) `formatUserFacingError(ui)` default "Não foi possível excluir a transação. Tente de novo." |
| `pages/Finance.tsx:397` | aviso | Por favor, preencha pelo menos a descrição e o valor. |
| `pages/Finance.tsx:405` | aviso | Por favor, insira um valor válido. |
| `pages/Finance.tsx:443` | sucesso | (dinâmico) `${Receita\|Despesa} registrada com sucesso!` |
| `pages/Finance.tsx:449` | erro | (dinâmico) `formatUserFacingError(ui)` |
| `pages/Finance.tsx:1127` | erro | (dinâmico) `formatUserFacingError(ui)` |
| `pages/QueueManagement.tsx:110` | erro | Não foi possível adicionar à fila. Tente novamente. |
| `pages/QueueManagement.tsx:131` | erro | Não foi possível atualizar o status. Tente novamente. |
| `pages/QueueManagement.tsx:173` | sucesso | Atendimento finalizado e registrado! |
| `pages/QueueManagement.tsx:177` | erro | Não foi possível finalizar o atendimento. Tente novamente. |
| `pages/QueueManagement.tsx:215` | erro | Erro ao baixar QR Code. |
| `pages/Reports.tsx:53` | aviso | Ainda não há dados suficientes para exportar. |
| `pages/Reports.tsx:80` | sucesso | Relatório CSV exportado. Abra no Excel ou Google Sheets. |
| `pages/Reports.tsx:85` | aviso | Ainda não há dados suficientes para exportar. |
| `components/CheckoutModal.tsx:178` | aviso | (dinâmico) Estoque insuficiente. Disponível: N un. |
| `components/CheckoutModal.tsx:201` | aviso | (dinâmico) Estoque insuficiente. Disponível: N un. |
| `components/CheckoutModal.tsx:269` | erro | (dinâmico) `userMessage` via `resolveCheckoutErrorMessage` |
| `components/CommissionsManagement.tsx:241` | erro | Informe um percentual válido entre 0 e 100. |
| `components/CommissionsManagement.tsx:262` | erro | Não foi possível salvar a comissão. Tente novamente. |
| `components/CommissionsManagement.tsx:291` | erro | Por favor, preencha todos os campos. |
| `components/CommissionsManagement.tsx:308` | sucesso | (dinâmico) Comissão de {nome} paga com sucesso! |
| `components/CommissionsManagement.tsx:315` | erro | Não foi possível registrar o pagamento. Tente novamente. |
| `pages/PublicBooking.tsx:457` | sucesso | Agendamento cancelado com sucesso. |
| `pages/PublicBooking.tsx:460` | erro | Erro ao cancelar agendamento. |
| `pages/PublicBooking.tsx:551` | aviso | Por favor, preencha todos os campos e aceite a política de cancelamento. |
| `pages/PublicBooking.tsx:611` | erro | Não foi possível concluir seu agendamento agora. Tente novamente em instantes ou fale com a equipe pelo WhatsApp. |
| `components/membership/PixDisplay.tsx:76` | sucesso | Código Pix copiado! Cole no app do seu banco. |
| `components/membership/PixDisplay.tsx:79` | erro | Não foi possível copiar. Selecione manualmente. |
| `pages/settings/AuditLogs.tsx:158` | erro | (dinâmico) `error` |
| `pages/settings/AuditLogs.tsx:161` | sucesso | (dinâmico) mensagem de sucesso |
| `pages/settings/AuditLogs.tsx:174` | erro | (dinâmico) `error` |
| `pages/settings/AuditLogs.tsx:177` | sucesso | Problema removido. |
| `pages/settings/AuditLogs.tsx:187` | erro | (dinâmico) `error` |
| `pages/settings/AuditLogs.tsx:190` | sucesso | (dinâmico) count resolvido(s) |
| `pages/MembersList.tsx:73` | sucesso | (dinâmico) {nome} agora é assinante ativo! |
| `pages/MembersList.tsx:76` | erro | Não foi possível confirmar o pagamento. Tente novamente. |
| `pages/MembersList.tsx:84` | sucesso | Assinatura cancelada. |
| `pages/MembersList.tsx:87` | erro | Não foi possível cancelar a assinatura. Tente novamente. |
| `pages/JoinClub.tsx:49` | erro | Link inválido. |
| `pages/JoinClub.tsx:53` | erro | Preencha nome e WhatsApp. |
| `pages/JoinClub.tsx:57` | erro | WhatsApp inválido. |
| `pages/JoinClub.tsx:61` | erro | O Pix ainda não está disponível aqui. Escolha pagar no balcão. |
| `pages/JoinClub.tsx:97` | sucesso | (dinâmico) |
| `pages/JoinClub.tsx:106` | erro | Este WhatsApp já tem uma assinatura ativa ou pendente aqui. Fale com o estabelecimento. |
| `pages/JoinClub.tsx:108` | erro | Este plano não está mais disponível. Escolha outro. |
| `pages/JoinClub.tsx:110` | erro | WhatsApp inválido. Confira o número. |
| `pages/JoinClub.tsx:112` | erro | Não foi possível enviar sua solicitação. Tente novamente. |
| `components/membership/PixActions.tsx:35` | sucesso | Pix confirmado! Assinatura ativada. |
| `components/membership/PixActions.tsx:38` | erro | (dinâmico) Erro: {message} |
| `components/membership/PixActions.tsx:46` | sucesso | Código Pix copiado! |
| `components/membership/PixActions.tsx:48` | erro | Não foi possível copiar. Selecione manualmente. |
| `pages/settings/MembershipSettings.tsx:59` | erro | Chave Pix inválida. Verifique o valor digitado. |
| `pages/settings/MembershipSettings.tsx:63` | erro | Informe o nome do recebedor. |
| `pages/settings/MembershipSettings.tsx:74` | sucesso | Pix cadastrado com sucesso! |
| `pages/settings/MembershipSettings.tsx:76` | erro | (dinâmico) Erro ao salvar: {message} |
| `pages/settings/MembershipPlansSettings.tsx:88` | erro | Informe o nome do plano. |
| `pages/settings/MembershipPlansSettings.tsx:93` | erro | Preço inválido. |
| `pages/settings/MembershipPlansSettings.tsx:98` | erro | Limite de uso inválido. |
| `pages/settings/MembershipPlansSettings.tsx:112` | sucesso | (dinâmico) Plano atualizado! / Plano criado! |
| `pages/settings/MembershipPlansSettings.tsx:116` | erro | (dinâmico) Erro: {message} |
| `pages/settings/MembershipPlansSettings.tsx:124` | sucesso | Plano excluído. |
| `pages/settings/MembershipPlansSettings.tsx:126` | erro | (dinâmico) Erro: {message} |
| `pages/settings/GeneralSettings.tsx:119` | erro | A imagem deve ter no máximo 10MB. |
| `pages/settings/GeneralSettings.tsx:128` | erro | A imagem deve ter no máximo 10MB. |
| `pages/settings/GeneralSettings.tsx:188` | erro | Não foi possível salvar as configurações. Tente novamente. |
| `components/BugAnnotateModal.tsx:152` | erro | Sessão expirada. Faça login novamente para enviar. |
| `components/BugAnnotateModal.tsx:170` | aviso | Não foi possível enviar o print, mas vamos registrar o report mesmo assim. |
| `components/BugAnnotateModal.tsx:186` | erro | (dinâmico) `result.error` |
| `components/BugAnnotateModal.tsx:189` | sucesso | Report do admin enviado com as marcações. Valeu! |
| `components/AddAuditEntryModal.tsx:85` | erro | Selecione um arquivo de imagem (foto ou print). |
| `components/AddAuditEntryModal.tsx:93` | erro | Sessão expirada. Faça login novamente. |
| `components/AddAuditEntryModal.tsx:97` | erro | Escreva ao menos um título ou uma descrição. |
| `components/AddAuditEntryModal.tsx:107` | aviso | Não consegui subir a imagem, mas vou registrar o problema mesmo assim. |
| `components/AddAuditEntryModal.tsx:130` | erro | (dinâmico) `result.error` |
| `components/AddAuditEntryModal.tsx:133` | sucesso | Problema adicionado à auditoria. |
| `pages/StaffOnboarding.tsx:36` | erro | Não foi possível concluir. Verifique sua conexão e tente novamente. |
| `components/BugReportModal.tsx:92` | erro | Sessão expirada. Faça login novamente para enviar. |
| `components/BugReportModal.tsx:109` | aviso | Não foi possível enviar o print, mas vamos registrar o report mesmo assim. |
| `components/BugReportModal.tsx:123` | erro | (dinâmico) `result.error` |
| `components/BugReportModal.tsx:126` | sucesso | Report enviado com sucesso. Obrigado pelo feedback! |

### alert()

| arquivo:linha | tipo | mensagem literal |
|---------------|------|------------------|
| `components/AppointmentEditModal.tsx:212` | aviso | Por favor, preencha todos os campos obrigatórios e verifique o preço final. |
| `pages/settings/TeamSettings.tsx:33` | erro | Erro ao excluir. |
| `components/TeamMemberForm.tsx:56` | erro | A imagem deve ter no máximo 10MB. |
| `components/TeamMemberForm.tsx:137` | erro | (dinâmico) Erro ao salvar membro da equipe: {message} |
| `pages/settings/RecycleBin.tsx:29` | sucesso | Item restaurado com sucesso! |
| `pages/settings/RecycleBin.tsx:32` | erro | Erro ao restaurar item. Tente novamente. |
| `pages/settings/CommissionsSettings.tsx:98` | sucesso | Dia de acerto salvo com sucesso! |
| `pages/settings/CommissionsSettings.tsx:102` | erro | Erro ao salvar dia de acerto. |
| `pages/settings/CommissionsSettings.tsx:115` | aviso | A taxa deve ser entre 0% e 100% |
| `pages/settings/CommissionsSettings.tsx:144` | sucesso | Taxa de comissão atualizada! |
| `pages/settings/CommissionsSettings.tsx:147` | erro | Erro ao salvar taxa de comissão. |
| `pages/settings/CommissionsSettings.tsx:171` | aviso | Taxa débito deve ser entre 0% e 100% |
| `pages/settings/CommissionsSettings.tsx:175` | aviso | Taxa crédito deve ser entre 0% e 100% |
| `pages/settings/CommissionsSettings.tsx:192` | sucesso | Configurações de taxa salvas com sucesso! |
| `pages/settings/CommissionsSettings.tsx:196` | erro | Erro ao salvar configurações de taxa. |
| `pages/settings/UiPreview.tsx:93` | sucesso | (dinâmico) Dados validados com sucesso!... |
| `pages/settings/UiPreview.tsx:460` | info | Simulando nova tentativa de requisição... |
| `pages/settings/UiPreview.tsx:478` | sucesso | Ação do Modal Confirmada |
| `components/ServiceModal.tsx:87` | erro | A imagem deve ter no máximo 10MB. |
| `components/ServiceModal.tsx:131` | erro | (dinâmico) Erro ao salvar serviço: {message} |
| `components/ServiceModal.tsx:159` | erro | Erro ao criar categoria |
| `pages/settings/ServiceSettings.tsx:72` | aviso | Crie uma categoria primeiro! |
| `components/ProfessionalCommissionDetails.tsx:162` | aviso | Por favor, insira valores válidos. |
| `components/ProfessionalCommissionDetails.tsx:199` | erro | (dinâmico) Erro ao atualizar comissão: ... |
| `pages/settings/SecuritySettings.tsx:20` | sucesso | Autenticação em dois fatores ativada com sucesso! |
| `pages/settings/SecuritySettings.tsx:28` | sucesso | 2FA desativado. |
| `pages/settings/SecuritySettings.tsx:31` | erro | Erro ao desativar 2FA. |
| `components/security/TwoFactorSetup.tsx:70` | sucesso | Código copiado para a área de transferência! |
| `components/onboarding/StepBusinessHours.tsx:50` | erro | Erro ao salvar horários. Por favor, tente novamente. |
| `components/onboarding/StepBusinessHours.tsx:69` | erro | Erro ao salvar horários. Por favor, tente novamente. |
| `pages/settings/SubscriptionSettings.tsx:89` | erro | Erro ao iniciar checkout: URL não retornada. |
| `pages/settings/SubscriptionSettings.tsx:93` | erro | (dinâmico) Erro ao iniciar pagamento: ... |
| `pages/settings/FinancialSettings.tsx:35` | sucesso | Configurações financeiras salvas! |
| `pages/settings/FinancialSettings.tsx:38` | erro | Erro ao salvar. Tente novamente. |
| `components/appointment/ClientSelection.tsx:60` | erro | Erro ao criar cliente |
| `components/BusinessGalleryManager.tsx:50` | erro | A imagem deve ter no máximo 5MB. |
| `components/BusinessGalleryManager.tsx:83` | erro | Erro ao fazer upload da imagem. |
| `components/ProfileModal.tsx:94` | sucesso | Perfil atualizado com sucesso! Recarregue a página para ver as alterações. |
| `components/ProfileModal.tsx:99` | erro | Erro ao atualizar perfil. |
| `pages/settings/PublicBookingSettings.tsx:65` | erro | Erro ao salvar configurações. |

### Mensagens repetidas

- `Ainda não há dados suficientes para exportar.` — 2 ocorrências, 1 arquivo (`pages/Reports.tsx:53`, `pages/Reports.tsx:85`)
- `Produto salvo` — 2 ocorrências, 1 arquivo (`pages/Products.tsx:211`, `pages/Products.tsx:214`)
- `Não foi possível enviar a foto. O cliente será criado sem foto.` — 2 ocorrências, 1 arquivo (`pages/Clients.tsx:129`, `pages/Clients.tsx:138`)
- `A imagem deve ter no máximo 10MB.` — 3 ocorrências, 3 arquivos (`pages/settings/GeneralSettings.tsx:119`, `:128`; `components/TeamMemberForm.tsx:56`; `components/ServiceModal.tsx:87`)
- `Erro ao salvar horários. Por favor, tente novamente.` — 2 ocorrências, 1 arquivo (`components/onboarding/StepBusinessHours.tsx:50`, `:69`)
- `(dinâmico) Estoque insuficiente. Disponível: N un.` — 2 ocorrências, 1 arquivo (`components/CheckoutModal.tsx:178`, `:201`)
- `Não foi possível copiar. Selecione manualmente.` — 2 ocorrências, 2 arquivos (`components/membership/PixDisplay.tsx:79`; `components/membership/PixActions.tsx:48`)
- `Sessão expirada. Faça login novamente para enviar.` — 2 ocorrências, 2 arquivos (`components/BugAnnotateModal.tsx:152`; `components/BugReportModal.tsx:92`)
- `Não foi possível enviar o print, mas vamos registrar o report mesmo assim.` — 2 ocorrências, 2 arquivos (`components/BugAnnotateModal.tsx:170`; `components/BugReportModal.tsx:109`)

### Mensagens genéricas (contagem)

| texto (ou padrão) | ocorrências | arquivos distintos |
|-------------------|-------------|-------------------|
| contém "Tente novamente" | 22 | 12 |
| `Erro ao excluir.` | 1 | 1 |
| `Erro ao criar agendamento.` | 1 | 1 |
| `Erro ao cancelar agendamento.` | 2 | 2 |
| `Erro ao salvar configurações.` / `Erro ao salvar.` | 2 | 2 |
| `Não foi possível salvar.` (variantes) | 6 | 5 |
| `Erro ao excluir agendamento do histórico.` | 1 | 1 |
| `Erro ao criar cliente` | 1 | 1 |
| `Erro ao excluir.` (TeamSettings) | 1 | 1 |
| `Erro ao concluir atendimento. Tente novamente.` (via resolveCheckoutErrorMessage fallback) | 1 | 1 |

---

## 4 — Modais

| componente | arquivo:linha | confirma/edita | focus trap | Esc | overlay | loading no confirmar |
|------------|---------------|----------------|------------|-----|---------|---------------------|
| Modal (DS) | `components/ui/Modal.tsx:37` | container genérico | sim `components/ui/Modal.tsx:101` | sim (default) `components/ui/Modal.tsx:58-62` | sim (default) `components/ui/Modal.tsx:97` | depende do `footer` passado |
| ConfirmModal | `components/ui/ConfirmModal.tsx:17` | confirma ação | herda Modal | sim; bloqueado se `loading` `components/ui/ConfirmModal.tsx:34` | sim; bloqueado se `loading` `components/ui/ConfirmModal.tsx:33` | sim prop `loading` `components/ui/ConfirmModal.tsx:43` |
| Modal legado | `components/Modal.tsx:23` | adapter → ui/Modal | herda | herda | herda | herda |
| AppointmentEditModal | `components/AppointmentEditModal.tsx:55` | edita agendamento | sim `components/AppointmentEditModal.tsx:261` | não | sim overlay `components/AppointmentEditModal.tsx:260` | sim botão submit `loading` state `components/AppointmentEditModal.tsx:290` |
| AppointmentWizard | `components/AppointmentWizard.tsx:29` | cria agendamento (portal) | não | não | não (sem overlay click handler) | sim `Confirmar Atendimento` `components/AppointmentWizard.tsx:466-469` |
| CheckoutModal | `components/CheckoutModal.tsx:94` | cobra/conclui atendimento | herda Modal | bloqueado `preventClose` `components/CheckoutModal.tsx:301` | bloqueado `preventClose` | sim `components/CheckoutModal.tsx:307` |
| QuickActionsModal | `components/QuickActionsModal.tsx:14` | navega ações rápidas | sim `components/QuickActionsModal.tsx:37` | não determinado | sim `components/QuickActionsModal.tsx:33-35` | não |
| MoreOptionsDrawer | `components/MoreOptionsDrawer.tsx:32` | menu navegação | não | sim `components/MoreOptionsDrawer.tsx:64-65` | sim `components/MoreOptionsDrawer.tsx:145` | não |
| ServiceModal | `components/ServiceModal.tsx:26` | CRUD serviço | sim `components/ServiceModal.tsx:179` | não determinado | sim `components/ServiceModal.tsx:178` | sim mutations `components/ServiceModal.tsx` (via `saveServiceMutation.isPending`) |
| ProfileModal | `components/ProfileModal.tsx:13` | edita perfil | herda Modal | herda | herda | não determinado |
| PaywallModal | `components/PaywallModal.tsx:10` | paywall assinatura | herda Modal | herda | herda | não determinado |
| ClientAuthModal | `components/ClientAuthModal.tsx:17` | auth cliente | não | não | não | não determinado |
| TeamMemberForm (Modal) | `components/TeamMemberForm.tsx:147` | cadastra/edita profissional | herda Modal | herda | herda | sim `components/TeamMemberForm.tsx:336-344` |
| GoalSettingsModal | `components/dashboard/modals/GoalSettingsModal.tsx:18` | meta mensal | herda Modal | herda | herda | não determinado |
| GoalHistoryModal | `components/dashboard/modals/GoalHistoryModal.tsx:26` | histórico metas | herda Modal | herda | herda | não |
| AllAppointmentsModal | `components/dashboard/modals/AllAppointmentsModal.tsx:22` | lista agendamentos | herda Modal | herda | herda | não |
| MonthlyProfitModal | `components/dashboard/modals/MonthlyProfitModal.tsx:34` | lucro mensal | herda Modal | herda | herda | não determinado |
| AIOSStrategyModal | `components/dashboard/modals/AIOSStrategyModal.tsx:12` | estratégia IA | herda Modal | herda | herda | não |
| BugReportModal | `components/BugReportModal.tsx:42` | report bug | sim `components/BugReportModal.tsx:143` | não determinado | sim overlay | sim submit |
| BugAnnotateModal | `components/BugAnnotateModal.tsx:72` | report anotado | sim | não determinado | sim | sim submit |
| AddAuditEntryModal | `components/AddAuditEntryModal.tsx:44` | entrada auditoria | sim | não determinado | sim | sim submit |
| CommissionShareModal | `components/CommissionShareModal.tsx:17` | compartilhar comissão | herda Modal | herda | herda | não determinado |
| Detalhes agendamento (Agenda) | `pages/Agenda.tsx:1653` | visualiza/edita ações | sim `pages/Agenda.tsx:1645` | sim `pages/Agenda.tsx:1664` | sim `pages/Agenda.tsx:1653` | não no footer principal |
| Modal adicionar fila | `pages/QueueManagement.tsx:438` | adiciona na fila | herda Modal | herda | herda | sim `pages/QueueManagement.tsx:476` |
| Modal finalizar fila | `pages/QueueManagement.tsx:483` | finaliza atendimento | herda Modal | bloqueado `preventClose` `pages/QueueManagement.tsx:488` | bloqueado | sim `pages/QueueManagement.tsx:492` |
| Modal nova transação | `pages/Finance.tsx:830` | lança receita/despesa | herda Modal | herda | herda | sim `pages/Finance.tsx:844-845` |
| Modal novo cliente | `pages/Clients.tsx:325` | cadastra cliente | herda Modal | herda | herda | sim `pages/Clients.tsx:374` |

---

## 5 — Formulários

| onde | campos | validação (cliente/servidor/nenhuma) + arquivo:linha | erro aparece | escopo erro | submit desabilita no envio |
|------|--------|-----------------------------------------------------|--------------|-------------|---------------------------|
| `pages/Clients.tsx:326` | nome, email, telefone, origem, foto | cliente: telefone OU email `pages/Clients.tsx:104-106`; servidor: supabase insert | ao submeter (toast se falha contato); toast no catch | global (toast) | sim `loading={uploading}` `pages/Clients.tsx:374` |
| `pages/Finance.tsx:830` (modal) | tipo, descrição, valor, data, hora, serviço, profissional, método pagamento | cliente: descrição+valor `pages/Finance.tsx:397-405` | ao submeter (toast) | global (toast) | sim `savingTransaction` `pages/Finance.tsx:844-845` |
| `pages/QueueManagement.tsx:444` | nome, telefone, serviço | HTML `required` nome `pages/QueueManagement.tsx:451` | ao submeter (toast) | global (toast) | sim `isAdding` `pages/QueueManagement.tsx:476` |
| `components/AppointmentWizard.tsx:153` (handleSubmit) | cliente, serviços, pro, data, hora, preço, desconto, notas, pagamento | cliente: steps disabled `components/AppointmentWizard.tsx:453-457`; servidor: RPC/hook | ao submeter (toast) | global (toast) | sim `loading` `components/AppointmentWizard.tsx:466` |
| `components/AppointmentEditModal.tsx:200` | cliente, profissional, serviço, data, hora, preço, desconto, notas | cliente: `alert` campos `components/AppointmentEditModal.tsx:212` | ao submeter | global (alert/toast) | sim `loading` |
| `components/CheckoutModal.tsx:210` (handleConfirm) | forma pagamento, recebido por, taxa maquininha, produtos | cliente: `errors` state `components/CheckoutModal.tsx:216-228` | ao submeter | por campo (`errors.paymentMethod`) | sim `loading` `components/CheckoutModal.tsx:307` |
| `components/TeamMemberForm.tsx:153` | nome, role, slug, bio, comissão, foto, CPF, specialties | cliente: tamanho foto `components/TeamMemberForm.tsx:55-57`; servidor: supabase | ao submeter (alert) | global (alert) | sim `loading` `components/TeamMemberForm.tsx:336` |
| `components/ServiceModal.tsx:329` | nome, descrição, preço, duração, categoria, imagem, upsell | cliente: tamanho imagem `components/ServiceModal.tsx:87`; servidor: mutations | ao submeter (alert) | global (alert) | sim `disabled={loading}` `components/ServiceModal.tsx:329` |
| `pages/Login.tsx:38` | email, senha | servidor: auth | ao submeter (inline) | global (inline) | sim `loading` `pages/Login.tsx:332` |
| `pages/Register.tsx:67` | nome, email, senha, confirmação, tipo | cliente: senhas coincidem `pages/Register.tsx:71` | ao submeter | global (inline) | sim `loading` |
| `pages/ForgotPassword.tsx:29` | email | servidor: supabase | ao submeter | global (inline) | sim `loading` `pages/ForgotPassword.tsx:94` |
| `pages/UpdatePassword.tsx:111` | nova senha, confirmação | cliente: match senhas; servidor: supabase | ao submeter | global (inline) | sim `loading` |
| `pages/PublicBooking.tsx:551` | nome, telefone, serviço, profissional, data, hora, política | cliente: campos+política `pages/PublicBooking.tsx:551` | ao submeter (toast) | global (toast) | sim `isSubmitting` `pages/PublicBooking.tsx:1152` |
| `pages/QueueJoin.tsx:114` | nome, telefone, serviço | HTML + estado local | ao submeter | global (joinError) | sim `submitting` `pages/QueueJoin.tsx:296` |
| `pages/settings/GeneralSettings.tsx:368` | nome negócio, logo, endereço, telefone, etc. | cliente: tamanho imagem; servidor: supabase | ao salvar (toast) | global (toast) | sim `SaveFooter` `disabled` quando `saveStatus==='saving'` `components/SaveFooter.tsx:62`, `components/SaveFooter.tsx:70` |
| `pages/settings/MembershipPlansSettings.tsx:88` | nome, preço, limite, serviços | cliente: campos `pages/settings/MembershipPlansSettings.tsx:88-98` | ao submeter (toast) | global (toast) | sim `upsertMutation.isPending` `pages/settings/MembershipPlansSettings.tsx:214` |
| `pages/settings/MembershipSettings.tsx:59` | chave Pix, nome recebedor | cliente `pages/settings/MembershipSettings.tsx:59-63` | ao submeter (toast) | global (toast) | sim `updateMutation.isPending` `pages/settings/MembershipSettings.tsx:175` |
| `pages/ClientCRM.tsx:610` (edit modal) | nome, telefone, email | servidor: supabase | ao submeter (toast) | global (toast) | sim `updating` `pages/ClientCRM.tsx:610` |
| `pages/Products.tsx:593` (form modal) | nome, preço, estoque, SKU, etc. | cliente: `formErrors` state | ao submeter | por campo + toast | sim mutation pending |

---

## 6 — `window.confirm`, `window.alert` e `window.prompt`

Busca: `window\.(confirm|alert|prompt)` e `\bconfirm\(` em `**/*.{tsx,ts}`.

### window.confirm

| arquivo:linha | texto |
|---------------|-------|
| `components/membership/PixActions.tsx:28` | Simular que o Pix foi recebido? O plano será ativado agora. |
| `components/BusinessGalleryManager.tsx:90` | Tem certeza que deseja remover esta foto? |

### window.alert

nenhum (busca `window\.alert\(` retornou 0 resultados)

### window.prompt

nenhum (busca `window\.prompt\(` retornou 0 resultados)

### confirm() (global, mesmo diálogo nativo)

| arquivo:linha | texto |
|---------------|-------|
| `pages/settings/TeamSettings.tsx:28` | Tem certeza que deseja excluir este profissional? |
| `pages/settings/ServiceSettings.tsx:46` | Tem certeza? Isso pode afetar serviços vinculados. |
| `pages/settings/SecuritySettings.tsx:24` | Tem certeza que deseja desativar o 2FA? Sua conta ficará menos segura. |
| `pages/settings/MembershipPlansSettings.tsx:121` | (dinâmico) Excluir o plano "{name}"? Assinantes existentes serão preservados. |

Nota: o projeto usa extensivamente `alert()` sem prefixo `window.` (37 ocorrências em componentes/páginas); listadas na seção 3.

---

## 7 — Distinção entre vazio e erro

Páginas onde falha de carga pode renderizar o mesmo UI que lista/dados vazios (usuário não distingue "não há dados" de "falhou ao carregar"). RLS sem filtro de tenant também retorna vazio silenciosamente.

| página | condição vazio + arquivo:linha | condição erro/falha + arquivo:linha |
|--------|-------------------------------|-------------------------------------|
| Clientes | `filteredClients.length === 0` EmptyState `pages/Clients.tsx:238-248` | fetch `catch` só log `pages/Clients.tsx:83-84` → `clients` permanece `[]` |
| Dashboard | KPIs com valor 0 após load `pages/Dashboard.tsx:157-160` | `useDashboardData` sem `isError` UI `hooks/useDashboardData.ts:42-47` |
| Financeiro | transações ausentes sem EmptyState dedicado | fetch `catch` log `pages/Finance.tsx:314-315` → summary/transactions default |
| Fila (gestão) | `actionableList.length === 0` EmptyState `pages/QueueManagement.tsx:301-310` | `useQueueEntries` sem erro UI; falha → array vazio `hooks/useQueue.ts:40-46` |
| Insights | `!hasSufficientData` "Coletando dados..." `pages/Reports.tsx:149-160` | `useReportsData` sem `isError` `hooks/useReports.ts:18-27` |
| Agenda | `dayApts.length === 0` EmptyState `pages/Agenda.tsx:1460-1463` | `fetchData` sem catch `pages/Agenda.tsx:340-351`; RLS → arrays vazios |
| Lixeira | `items.length === 0` `pages/settings/RecycleBin.tsx:128-132` | `useDeletedItems` sem erro UI |
| Auditoria | `entries.length === 0` `pages/settings/AuditLogs.tsx:316-319` | fetch sem ErrorState `pages/settings/AuditLogs.tsx:100` |
| Assinantes | `filtered.length === 0` `pages/MembersList.tsx:165-173` | hook sem erro UI; falha → lista vazia |
| Histórico financeiro (componente) | `data.length === 0` "Sem dados históricos disponíveis" `components/MonthlyHistory.tsx:26-31` | `useMonthlyHistory` sem erro UI `hooks/useFinance.ts:21` |
| Queue Status (público) | `!entry` mensagem fila `pages/QueueStatus.tsx:105` | mesmo render para link expirado e entrada inexistente (não distingue causa) |
| Staff Insights | listas vazias `pages/StaffInsights.tsx:208`, `:236` | fetch sem catch `pages/StaffInsights.tsx:60-90` |

---

## Contagem final

| métrica | valor |
|---------|-------|
| Páginas catalogadas | 40 |
| Páginas com skeleton (`SkeletonCard` / `Skeleton`) | 5 produção (Dashboard, Clients, Products, QueueManagement, Reports) + 1 demo (UiPreview) |
| Páginas com empty state com ação (CTA/botão) | 9 (Clients, Products, QueueManagement, Agenda parcial, ClientArea, TeamSettings, ServiceSettings categoria, PublicBooking fluxo, JoinClub implícito via planos) |
| Páginas com error state distinguível de vazio na carga | 6 (Products, PublicBooking, ClientArea, Login, Register, ForgotPassword, UpdatePassword) — ClientCRM distingue "não encontrado" `pages/ClientCRM.tsx:251` mas fetch error cai no mesmo |

### Lacunas (não determinado)

1. Comportamento de Esc em `AppointmentWizard` (`components/AppointmentWizard.tsx:263`) — sem handler `keydown`; Esc pode propagar.
2. Comportamento de Esc em `QuickActionsModal` (`components/QuickActionsModal.tsx:32`) — sem handler `keydown` dedicado.
3. Linha exata do clique de seleção de cliente no `SearchableSelect` dentro de `ClientSelection` (opção individual — handler interno do componente `components/SearchableSelect.tsx` não verificado nesta passagem).
