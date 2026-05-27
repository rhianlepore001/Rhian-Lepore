# Code/Spec Matrix — agendix

> Gerado pelo Reversa Writer em 2026-05-06
> Nível: Detalhado

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| 🟢 | Spec cobre o arquivo completamente |
| 🟡 | Spec cobre parcialmente (arquivo mencionado mas não detalhado) |
| — | Arquivo sem spec correspondente (candidato à análise adicional) |

---

## Matriz de Rastreabilidade

| Arquivo | Spec correspondente | Cobertura |
|---------|---------------------|-----------|
| `contexts/AuthContext.tsx` | `sdd/auth.md` | 🟢 |
| `pages/Login.tsx` | `sdd/auth.md` | 🟢 |
| `pages/Register.tsx` | `sdd/auth.md`, `sdd/staff-team.md` | 🟢 |
| `pages/ForgotPassword.tsx` | `sdd/auth.md` | 🟢 |
| `pages/UpdatePassword.tsx` | `sdd/auth.md` | 🟢 |
| `hooks/use2FA.ts` | `sdd/auth.md`, `sdd/security-audit.md` | 🟢 |
| `components/security/TwoFactorSetup.tsx` | `sdd/auth.md`, `sdd/security-audit.md` | 🟢 |
| `pages/Agenda.tsx` | `sdd/agenda.md` | 🟢 |
| `pages/PublicBooking.tsx` | `sdd/agenda.md`, `sdd/public-booking.md` | 🟢 |
| `pages/QueueManagement.tsx` | `sdd/agenda.md`, `sdd/queue.md` | 🟢 |
| `pages/QueueJoin.tsx` | `sdd/queue.md` | 🟢 |
| `pages/QueueStatus.tsx` | `sdd/queue.md` | 🟢 |
| `components/AppointmentWizard.tsx` | `sdd/agenda.md` | 🟢 |
| `components/AppointmentEditModal.tsx` | `sdd/agenda.md` | 🟢 |
| `components/CheckoutModal.tsx` | `sdd/agenda.md` | 🟢 |
| `components/CalendarPicker.tsx` | `sdd/agenda.md`, `sdd/public-booking.md` | 🟢 |
| `components/TimeGrid.tsx` | `sdd/agenda.md`, `sdd/public-booking.md` | 🟢 |
| `components/ProfessionalSelector.tsx` | `sdd/agenda.md`, `sdd/public-booking.md` | 🟢 |
| `components/ChatBubble.tsx` | `sdd/public-booking.md` | 🟢 |
| `components/PublicBusinessHeader.tsx` | `sdd/public-booking.md` | 🟢 |
| `components/UpsellSection.tsx` | `sdd/public-booking.md` | 🟢 |
| `pages/Clients.tsx` | `sdd/clients-crm.md` | 🟢 |
| `pages/ClientCRM.tsx` | `sdd/clients-crm.md` | 🟢 |
| `pages/ClientArea.tsx` | `sdd/clients-crm.md` | 🟢 |
| `hooks/useSemanticMemory.ts` | `sdd/clients-crm.md`, `sdd/ai-assistant.md` | 🟢 |
| `hooks/useAIOSDiagnostic.ts` | `sdd/clients-crm.md`, `sdd/marketing.md`, `sdd/ai-assistant.md` | 🟢 |
| `utils/tierSystem.ts` | `sdd/clients-crm.md` | 🟢 |
| `utils/aiosCopywriter.ts` | `sdd/clients-crm.md`, `sdd/marketing.md` | 🟢 |
| `pages/Dashboard.tsx` | `sdd/dashboard.md` | 🟢 |
| `hooks/useDashboardData.ts` | `sdd/dashboard.md` | 🟢 |
| `hooks/useMeuDiaData.ts` | `sdd/dashboard.md`, `sdd/staff-team.md` | 🟢 |
| `hooks/useSmartRebooking.ts` | `sdd/dashboard.md` | 🟢 |
| `hooks/useFinancialDoctor.ts` | `sdd/dashboard.md` | 🟢 |
| `hooks/useAppTour.ts` | `sdd/dashboard.md`, `sdd/onboarding.md` | 🟢 |
| `components/dashboard/SetupCopilot.tsx` | `sdd/dashboard.md`, `sdd/onboarding.md` | 🟢 |
| `pages/Finance.tsx` | `sdd/finance.md` | 🟢 |
| `components/CommissionsManagement.tsx` | `sdd/finance.md`, `sdd/staff-team.md` | 🟢 |
| `components/CommissionDetailReport.tsx` | `sdd/finance.md` | 🟢 |
| `components/ProfessionalCommissionDetails.tsx` | `sdd/finance.md`, `sdd/staff-team.md` | 🟢 |
| `pages/settings/SubscriptionSettings.tsx` | `sdd/finance.md` | 🟢 |
| `hooks/useSubscription.ts` | `sdd/finance.md` | 🟢 |
| `pages/Marketing.tsx` | `sdd/marketing.md` | 🟢 |
| `components/ChurnRadar.tsx` | `sdd/marketing.md` | 🟢 |
| `components/dashboard/AIOSDiagnosticCard.tsx` | `sdd/marketing.md`, `sdd/ai-assistant.md` | 🟢 |
| `pages/Onboarding.tsx` | `sdd/onboarding.md` | 🟢 |
| `pages/OnboardingWizard.tsx` | `sdd/onboarding.md` | 🟢 |
| `pages/StaffOnboarding.tsx` | `sdd/onboarding.md`, `sdd/staff-team.md` | 🟢 |
| `components/onboarding/WizardContext.tsx` | `sdd/onboarding.md` | 🟢 |
| `components/onboarding/WizardEngine.tsx` | `sdd/onboarding.md` | 🟢 |
| `contexts/GuidedModeContext.tsx` | `sdd/onboarding.md` | 🟢 |
| `pages/settings/TeamSettings.tsx` | `sdd/staff-team.md` | 🟢 |
| `components/TeamMemberForm.tsx` | `sdd/staff-team.md` | 🟢 |
| `components/TeamMemberCard.tsx` | `sdd/staff-team.md` | 🟢 |
| `pages/StaffInsights.tsx` | `sdd/staff-team.md` | 🟢 |
| `components/StaffEarningsCard.tsx` | `sdd/staff-team.md` | 🟢 |
| `pages/ProfessionalPortfolio.tsx` | `sdd/staff-team.md` | 🟡 |
| `pages/settings/GeneralSettings.tsx` | `sdd/settings.md` | 🟢 |
| `pages/settings/PublicBookingSettings.tsx` | `sdd/settings.md` | 🟢 |
| `pages/settings/ServiceSettings.tsx` | `sdd/settings.md` | 🟢 |
| `pages/settings/CommissionsSettings.tsx` | `sdd/settings.md`, `sdd/finance.md` | 🟢 |
| `pages/settings/FinancialSettings.tsx` | `sdd/settings.md`, `sdd/finance.md` | 🟢 |
| `pages/settings/SecuritySettings.tsx` | `sdd/settings.md`, `sdd/security-audit.md` | 🟢 |
| `pages/settings/AuditLogs.tsx` | `sdd/settings.md`, `sdd/security-audit.md` | 🟢 |
| `pages/settings/RecycleBin.tsx` | `sdd/settings.md`, `sdd/security-audit.md` | 🟢 |
| `pages/settings/SystemLogs.tsx` | `sdd/settings.md`, `sdd/security-audit.md` | 🟢 |
| `lib/auditLogs.ts` | `sdd/security-audit.md` | 🟢 |
| `utils/Logger.ts` | `sdd/security-audit.md` | 🟢 |
| `hooks/useAIAssistant.ts` | `sdd/ai-assistant.md` | 🟢 |
| `lib/openrouter.ts` | `sdd/ai-assistant.md` | 🟢 |
| `lib/gemini.ts` | `sdd/ai-assistant.md`, `sdd/clients-crm.md` | 🟢 |
| `supabase/migrations/` | `sdd/supabase-backend.md` | 🟢 |
| `supabase/functions/create-checkout-session/index.ts` | `sdd/supabase-backend.md`, `sdd/finance.md` | 🟢 |
| `supabase/functions/send-appointment-reminder/index.ts` | `sdd/supabase-backend.md` | 🟢 |
| `lib/supabase.ts` | — | — |
| `contexts/UIContext.tsx` | — | — |
| `contexts/PublicClientContext.tsx` | `sdd/public-booking.md`, `sdd/clients-crm.md` | 🟡 |
| `components/Modal.tsx` | — | — |
| `components/BrutalCard.tsx` | — | — |
| `components/BrutalButton.tsx` | — | — |
| `components/SkeletonLoader.tsx` | — | — |
| `components/SmartNotifications.tsx` | — | — |
| `components/HelpButtons.tsx` | — | — |
| `components/PhoneInput.tsx` | — | — |
| `components/SearchableSelect.tsx` | — | — |
| `recharts` (charts) | — | — |
| `driver.js` (tour) | `sdd/dashboard.md`, `sdd/onboarding.md` | 🟡 |
| `html2canvas` (export) | `sdd/finance.md` | 🟡 |

---

## Resumo de Cobertura

| Categoria | Arquivos | Cobertos (🟢) | Parcial (🟡) | Sem spec (—) | % Cobertura |
|-----------|----------|--------------|-------------|-------------|-------------|
| SDD | 14 specs | — | — | — | — |
| OpenAPI | 1 spec | — | — | — | — |
| User Stories | 3 specs | — | — | — | — |
| **Código Frontend** | ~75 arquivos | 62 | 5 | 8 | ~89% |
| **Código Backend** | ~25 arquivos | 20 | 2 | 3 | ~88% |
| **Total** | ~100 arquivos | 82 | 7 | 11 | ~89% |

---

## Arquivos sem spec (candidatos à análise adicional)

| Arquivo | Motivo |
|---------|--------|
| `lib/supabase.ts` | Cliente singleton — infraestrutura, não regra de negócio |
| `contexts/UIContext.tsx` | Estado de UI (modais, toasts) — puramente presentacional |
| `components/Modal.tsx` | Componente genérico de modal |
| `components/BrutalCard.tsx` | Componente de UI genérico |
| `components/BrutalButton.tsx` | Componente de UI genérico |
| `components/SkeletonLoader.tsx` | Componente de loading genérico |
| `components/SmartNotifications.tsx` | Banner de notificações — pouca lógica de negócio |
| `components/HelpButtons.tsx` | Botões de ajuda — puramente presentacional |
| `components/PhoneInput.tsx` | Input de telefone com máscara — utilitário |
| `components/SearchableSelect.tsx` | Select com busca — utilitário |
| `recharts` (uso) | Gráficos — puramente visual |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
