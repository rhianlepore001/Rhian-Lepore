# Inventário M3 — Tokens e dívida

Gerado por `scripts/inventory-tokens.mjs` em 2026-08-02.

## 1 — Todo token definido

| Token (--nome) | Definido em (arquivo:linha) | Valor no escopo raiz | Valor em barber×dark | barber×light | beauty×dark | beauty×light | Categoria | Nº de usos | Arquivos que usam (até 6, depois "+N") |
|---|---|---|---|---|---|---|---|---|---|
| `--bg-gradient` | design-system/tokens.css:161 | var(--gradient-bg) | var(--gradient-bg) | var(--gradient-bg) | var(--gradient-bg) | var(--gradient-bg) | outro | 1 | index.html |
| `--color-accent` | design-system/tokens.css:112 | #C9A24A | #C9A24A | #8B6914 | #A78BFA | #7C3AED | cor | 26 | pages/ClubDemo.tsx, pages/JoinClub.tsx, pages/OnboardingWizard.tsx, components/agenda/AgendaEmptySlotCell.tsx, components/AIAssistantChat.tsx, components/dashboard/MiniSparkline.tsx, +7 |
| `--color-accent-border` | design-system/tokens.css:115 | rgba(201, 162, 74, 0.6) | rgba(201, 162, 74, 0.6) | rgba(139, 105, 20, 0.30) | rgba(167, 139, 250, 0.5) | rgba(124, 58, 237, 0.25) | cor | 38 | pages/ClientCRM.tsx, pages/PublicBooking.tsx, pages/settings/TeamSettings.tsx, components/appointment/ServiceList.tsx, components/AppointmentEditModal.tsx, components/AppointmentWizard.tsx, +12 |
| `--color-accent-dim` | design-system/tokens.css:114 | rgba(201, 162, 74, 0.2) | rgba(201, 162, 74, 0.2) | rgba(139, 105, 20, 0.12) | rgba(167, 139, 250, 0.2) | rgba(124, 58, 237, 0.10) | cor | 25 | components/agenda/AgendaEmptySlotCell.tsx, components/appointment/AppointmentReview.tsx, components/AppointmentWizard.tsx, components/CalendarPicker.tsx, components/dashboard/CriticalEmptySlotsCard.tsx, components/dashboard/modals/AllAppointmentsModal.tsx, +10 |
| `--color-accent-hover` | design-system/tokens.css:113 | #DFC066 | #DFC066 | #A07A2A | #C4B5FD | #6D28D9 | cor | 4 | components/FinanceInsights.tsx, hooks/useBrutalTheme.ts, styles/tailwind.css |
| `--color-bg` | design-system/tokens.css:105 | #12100E | #12100E | #E5E5E5 | #17132A | #EBE5F5 | cor | 164 | pages/Agenda.tsx, pages/ClientArea.tsx, pages/ClientCRM.tsx, pages/Clients.tsx, pages/ClubDemo.tsx, pages/Finance.tsx, +62 |
| `--color-border` | design-system/tokens.css:121 | rgba(255, 245, 230, 0.08) | rgba(255, 245, 230, 0.08) | rgba(0, 0, 0, 0.10) | rgba(200, 180, 255, 0.10) | rgba(124, 58, 237, 0.16) | cor | 91 | pages/ClientCRM.tsx, pages/ClubDemo.tsx, pages/ForgotPassword.tsx, pages/Login.tsx, pages/ProfessionalPortfolio.tsx, pages/QueueJoin.tsx, +34 |
| `--color-border-strong` | design-system/tokens.css:122 | rgba(255, 245, 230, 0.14) | rgba(255, 245, 230, 0.14) | rgba(0, 0, 0, 0.16) | rgba(200, 180, 255, 0.16) | rgba(124, 58, 237, 0.24) | cor | 11 | pages/PublicBooking.tsx, components/ClientBookingCard.tsx, components/CommissionsManagement.tsx, components/GoalHistory.tsx, components/HelpButtons.tsx, components/onboarding/StepSuccess.tsx, +3 |
| `--color-card` | design-system/tokens.css:106 | #1A1816 | #1A1816 | #FFFFFF | #221F35 | #FFFFFF | cor | 58 | pages/Finance.tsx, pages/ForgotPassword.tsx, pages/ProfessionalPortfolio.tsx, pages/PublicBooking.tsx, pages/QueueJoin.tsx, pages/QueueStatus.tsx, +25 |
| `--color-card-elevated` | design-system/tokens.css:107 | #21201C | #21201C | #F4F4F4 | #2A2740 | #F3F0FA | cor | 2 | index.html |
| `--color-card-hover` | design-system/tokens.css:108 | rgba(255, 255, 255, 0.04) | rgba(255, 255, 255, 0.04) | rgba(0, 0, 0, 0.05) | rgba(255, 255, 255, 0.04) | rgba(91, 33, 182, 0.08) | cor | 150 | pages/ClientArea.tsx, pages/ClientCRM.tsx, pages/Clients.tsx, pages/Finance.tsx, pages/Login.tsx, pages/MembersList.tsx, +59 |
| `--color-danger` | design-system/tokens.css:127 | #EF4444 | #EF4444 | #DC2626 | #EF4444 | #DC2626 | cor | 99 | pages/Agenda.tsx, pages/ClientArea.tsx, pages/ClientCRM.tsx, pages/Finance.tsx, pages/ForgotPassword.tsx, pages/Login.tsx, +35 |
| `--color-danger-bg` | design-system/tokens.css:128 | rgba(239, 68, 68, 0.08) | rgba(239, 68, 68, 0.08) | rgba(220, 38, 38, 0.08) | rgba(239, 68, 68, 0.1) | rgba(220, 38, 38, 0.08) | cor | 45 | pages/Agenda.tsx, pages/ClientArea.tsx, pages/ClientCRM.tsx, pages/Finance.tsx, pages/ForgotPassword.tsx, pages/Login.tsx, +23 |
| `--color-danger-border` | design-system/tokens.css:129 | rgba(239, 68, 68, 0.3) | rgba(239, 68, 68, 0.3) | rgba(220, 38, 38, 0.2) | rgba(239, 68, 68, 0.2) | rgba(220, 38, 38, 0.15) | cor | 33 | pages/Agenda.tsx, pages/ClientCRM.tsx, pages/ForgotPassword.tsx, pages/Login.tsx, pages/QueueJoin.tsx, pages/QueueManagement.tsx, +14 |
| `--color-divider` | design-system/tokens.css:110 | rgba(255, 255, 255, 0.08) | rgba(255, 255, 255, 0.08) | rgba(0, 0, 0, 0.10) | rgba(255, 255, 255, 0.08) | rgba(124, 58, 237, 0.14) | cor | 55 | pages/Reports.tsx, pages/settings/AuditLogs.tsx, pages/settings/PublicBookingSettings.tsx, components/agenda/AgendaEmptySlotCell.tsx, components/AIAssistantChat.tsx, components/appointment/AppointmentReview.tsx, +20 |
| `--color-focus-ring` | design-system/tokens.css:126 | rgba(201, 162, 74, 0.25) | rgba(201, 162, 74, 0.25) | rgba(139, 105, 20, 0.45) | rgba(183, 148, 246, 0.25) | rgba(124, 58, 237, 0.40) | cor | 2 | index.html |
| `--color-gold-100` | design-system/tokens.css:25 | #F5EACB | #F5EACB | herda | herda | herda | cor | 0 | — |
| `--color-gold-200` | design-system/tokens.css:26 | #EBD79E | #EBD79E | herda | herda | herda | cor | 0 | — |
| `--color-gold-300` | design-system/tokens.css:27 | #DFC066 | #DFC066 | herda | herda | herda | cor | 0 | — |
| `--color-gold-400` | design-system/tokens.css:28 | #D2AC4E | #D2AC4E | herda | herda | herda | cor | 0 | — |
| `--color-gold-50` | design-system/tokens.css:24 | #FBF6E9 | #FBF6E9 | herda | herda | herda | cor | 0 | — |
| `--color-gold-500` | design-system/tokens.css:29 | #C9A24A | #C9A24A | herda | herda | herda | cor | 0 | — |
| `--color-gold-600` | design-system/tokens.css:30 | #A8842F | #A8842F | herda | herda | herda | cor | 0 | — |
| `--color-gold-700` | design-system/tokens.css:31 | #8B6914 | #8B6914 | herda | herda | herda | cor | 0 | — |
| `--color-gold-800` | design-system/tokens.css:32 | #6B5210 | #6B5210 | herda | herda | herda | cor | 0 | — |
| `--color-gold-900` | design-system/tokens.css:33 | #4A390C | #4A390C | herda | herda | herda | cor | 0 | — |
| `--color-gold-950` | design-system/tokens.css:34 | #2E2408 | #2E2408 | herda | herda | herda | cor | 0 | — |
| `--color-info` | design-system/tokens.css:136 | #60A5FA | #60A5FA | #2563EB | #60A5FA | #2563EB | cor | 29 | pages/Agenda.tsx, pages/ClubDemo.tsx, pages/ForgotPassword.tsx, pages/QueueManagement.tsx, pages/QueueStatus.tsx, pages/settings/AuditLogs.tsx, +10 |
| `--color-info-bg` | design-system/tokens.css:137 | rgba(59, 130, 246, 0.10) | rgba(59, 130, 246, 0.10) | rgba(37, 99, 235, 0.07) | rgba(59, 130, 246, 0.10) | rgba(37, 99, 235, 0.07) | cor | 16 | pages/Agenda.tsx, pages/ForgotPassword.tsx, pages/QueueManagement.tsx, pages/QueueStatus.tsx, pages/settings/AuditLogs.tsx, components/CommissionsManagement.tsx, +3 |
| `--color-info-border` | design-system/tokens.css:138 | rgba(59, 130, 246, 0.25) | rgba(59, 130, 246, 0.25) | rgba(37, 99, 235, 0.22) | rgba(59, 130, 246, 0.25) | rgba(37, 99, 235, 0.22) | cor | 13 | pages/Agenda.tsx, pages/ForgotPassword.tsx, pages/QueueManagement.tsx, pages/QueueStatus.tsx, pages/settings/AuditLogs.tsx, components/CommissionsManagement.tsx, +3 |
| `--color-input-bg` | design-system/tokens.css:123 | rgba(20, 16, 10, 0.5) | rgba(20, 16, 10, 0.5) | rgba(0, 0, 0, 0.04) | rgba(167, 139, 250, 0.06) | rgba(124, 58, 237, 0.05) | cor | 11 | components/AIAssistantChat.tsx, components/appointment/AppointmentReview.tsx, components/appointment/ClientSelection.tsx, components/appointment/ServiceList.tsx, components/appointment/ServiceSearchBar.tsx, components/SearchableSelect.tsx, +2 |
| `--color-input-border` | design-system/tokens.css:124 | rgba(255, 255, 255, 0.06) | rgba(255, 255, 255, 0.06) | rgba(0, 0, 0, 0.14) | rgba(255, 255, 255, 0.1) | rgba(124, 58, 237, 0.18) | cor | 21 | pages/Products.tsx, components/AIAssistantChat.tsx, components/appointment/AppointmentReview.tsx, components/appointment/ClientSelection.tsx, components/appointment/ScheduleSelection.tsx, components/appointment/ServiceList.tsx, +4 |
| `--color-input-focus` | design-system/tokens.css:125 | rgba(201, 162, 74, 0.6) | rgba(201, 162, 74, 0.6) | rgba(139, 105, 20, 0.45) | rgba(183, 148, 246, 0.5) | rgba(124, 58, 237, 0.40) | cor | 29 | pages/Clients.tsx, components/AppointmentWizard.tsx, components/CheckoutModal.tsx, components/ClientAuthModal.tsx, components/CommissionPaymentHistory.tsx, components/CommissionsManagement.tsx, +9 |
| `--color-modal-bg` | design-system/tokens.css:116 | #201D1A | #201D1A | #FFFFFF | #2A2740 | #FFFFFF | cor | 3 | components/AppointmentWizard.tsx, hooks/useBrutalTheme.ts |
| `--color-modal-border` | design-system/tokens.css:117 | rgba(201, 162, 74, 0.15) | rgba(201, 162, 74, 0.15) | rgba(0, 0, 0, 0.08) | rgba(167, 139, 250, 0.15) | rgba(124, 58, 237, 0.12) | cor | 2 | components/AppointmentWizard.tsx, hooks/useBrutalTheme.ts |
| `--color-neutral-0` | design-system/tokens.css:76 | #121212 | #121212 | herda | herda | herda | cor | 0 | — |
| `--color-neutral-100` | design-system/tokens.css:78 | #252525 | #252525 | herda | herda | herda | cor | 0 | — |
| `--color-neutral-200` | design-system/tokens.css:79 | #2A2A2A | #2A2A2A | herda | herda | herda | cor | 0 | — |
| `--color-neutral-300` | design-system/tokens.css:80 | #333333 | #333333 | herda | herda | herda | cor | 0 | — |
| `--color-neutral-400` | design-system/tokens.css:81 | #525252 | #525252 | herda | herda | herda | cor | 0 | — |
| `--color-neutral-50` | design-system/tokens.css:77 | #1E1E1E | #1E1E1E | herda | herda | herda | cor | 0 | — |
| `--color-neutral-500` | design-system/tokens.css:82 | #737373 | #737373 | herda | herda | herda | cor | 0 | — |
| `--color-neutral-600` | design-system/tokens.css:83 | #A0A0A0 | #A0A0A0 | herda | herda | herda | cor | 0 | — |
| `--color-neutral-700` | design-system/tokens.css:84 | #D4D4D4 | #D4D4D4 | herda | herda | herda | cor | 0 | — |
| `--color-neutral-800` | design-system/tokens.css:85 | #EAEAEA | #EAEAEA | herda | herda | herda | cor | 0 | — |
| `--color-neutral-900` | design-system/tokens.css:86 | #FAFAFA | #FAFAFA | herda | herda | herda | cor | 0 | — |
| `--color-orchid-100` | design-system/tokens.css:64 | #EFEBF8 | #EFEBF8 | herda | herda | herda | cor | 0 | — |
| `--color-orchid-200` | design-system/tokens.css:65 | #DDD4EF | #DDD4EF | herda | herda | herda | cor | 0 | — |
| `--color-orchid-300` | design-system/tokens.css:66 | #C3B8DD | #C3B8DD | herda | herda | herda | cor | 0 | — |
| `--color-orchid-400` | design-system/tokens.css:67 | #9C90BC | #9C90BC | herda | herda | herda | cor | 0 | — |
| `--color-orchid-50` | design-system/tokens.css:63 | #F8F6FC | #F8F6FC | herda | herda | herda | cor | 0 | — |
| `--color-orchid-500` | design-system/tokens.css:68 | #7B6E95 | #7B6E95 | herda | herda | herda | cor | 0 | — |
| `--color-orchid-600` | design-system/tokens.css:69 | #5D5178 | #5D5178 | herda | herda | herda | cor | 0 | — |
| `--color-orchid-700` | design-system/tokens.css:70 | #443A5E | #443A5E | herda | herda | herda | cor | 0 | — |
| `--color-orchid-800` | design-system/tokens.css:71 | #2A2740 | #2A2740 | herda | herda | herda | cor | 0 | — |
| `--color-orchid-900` | design-system/tokens.css:72 | #221F35 | #221F35 | herda | herda | herda | cor | 0 | — |
| `--color-orchid-950` | design-system/tokens.css:73 | #17132A | #17132A | herda | herda | herda | cor | 0 | — |
| `--color-overlay` | design-system/tokens.css:111 | rgba(0, 0, 0, 0.72) | rgba(0, 0, 0, 0.72) | rgba(20, 20, 20, 0.55) | rgba(0, 0, 0, 0.72) | rgba(23, 19, 42, 0.55) | cor | 6 | components/QuickActionsModal.tsx, hooks/useBrutalTheme.ts, index.html |
| `--color-sand-100` | design-system/tokens.css:51 | #F2EFE8 | #F2EFE8 | herda | herda | herda | cor | 0 | — |
| `--color-sand-200` | design-system/tokens.css:52 | #E5E0D5 | #E5E0D5 | herda | herda | herda | cor | 0 | — |
| `--color-sand-300` | design-system/tokens.css:53 | #CFC8B8 | #CFC8B8 | herda | herda | herda | cor | 0 | — |
| `--color-sand-400` | design-system/tokens.css:54 | #A89A82 | #A89A82 | herda | herda | herda | cor | 0 | — |
| `--color-sand-50` | design-system/tokens.css:50 | #FAF8F4 | #FAF8F4 | herda | herda | herda | cor | 0 | — |
| `--color-sand-500` | design-system/tokens.css:55 | #8A7F6C | #8A7F6C | herda | herda | herda | cor | 0 | — |
| `--color-sand-600` | design-system/tokens.css:56 | #6B6252 | #6B6252 | herda | herda | herda | cor | 0 | — |
| `--color-sand-700` | design-system/tokens.css:57 | #4A443A | #4A443A | herda | herda | herda | cor | 0 | — |
| `--color-sand-800` | design-system/tokens.css:58 | #2A2620 | #2A2620 | herda | herda | herda | cor | 0 | — |
| `--color-sand-900` | design-system/tokens.css:59 | #1A1816 | #1A1816 | herda | herda | herda | cor | 0 | — |
| `--color-sand-950` | design-system/tokens.css:60 | #12100E | #12100E | herda | herda | herda | cor | 0 | — |
| `--color-success` | design-system/tokens.css:130 | #10B981 | #10B981 | #059669 | #10B981 | #059669 | cor | 79 | pages/Agenda.tsx, pages/ClientCRM.tsx, pages/Clients.tsx, pages/ClubDemo.tsx, pages/Dashboard.tsx, pages/Finance.tsx, +30 |
| `--color-success-bg` | design-system/tokens.css:131 | rgba(16, 185, 129, 0.08) | rgba(16, 185, 129, 0.08) | rgba(5, 150, 105, 0.08) | rgba(16, 185, 129, 0.1) | rgba(5, 150, 105, 0.08) | cor | 36 | pages/Agenda.tsx, pages/ClientCRM.tsx, pages/Clients.tsx, pages/ClubDemo.tsx, pages/Finance.tsx, pages/ForgotPassword.tsx, +14 |
| `--color-success-border` | design-system/tokens.css:132 | rgba(16, 185, 129, 0.2) | rgba(16, 185, 129, 0.2) | rgba(5, 150, 105, 0.15) | rgba(16, 185, 129, 0.2) | rgba(5, 150, 105, 0.12) | cor | 30 | pages/Agenda.tsx, pages/ClientCRM.tsx, pages/Finance.tsx, pages/ForgotPassword.tsx, pages/QueueManagement.tsx, pages/QueueStatus.tsx, +10 |
| `--color-surface` | design-system/tokens.css:109 | #21201C | #21201C | #D8D8D8 | #2A2740 | #DDD4EF | cor | 11 | components/AIAssistantChat.tsx, components/AppointmentEditModal.tsx, components/dashboard/CancellationRateCard.tsx, components/dashboard/OccupancyRateCard.tsx, components/HelpButtons.tsx, components/MoreOptionsDrawer.tsx, +1 |
| `--color-text` | design-system/tokens.css:118 | #F0EBE0 | #F0EBE0 | #1A1610 | #EEE8FF | #1A1225 | cor | 190 | pages/ClientCRM.tsx, pages/ClubDemo.tsx, pages/Finance.tsx, pages/ForgotPassword.tsx, pages/JoinClub.tsx, pages/Login.tsx, +44 |
| `--color-text-muted` | design-system/tokens.css:120 | #8F8574 | #8F8574 | #6E6B64 | #9C90BC | #6B5E86 | cor | 231 | pages/ClientArea.tsx, pages/ClientCRM.tsx, pages/ClubDemo.tsx, pages/Finance.tsx, pages/ForgotPassword.tsx, pages/Legal.tsx, +49 |
| `--color-text-secondary` | design-system/tokens.css:119 | #A89A82 | #A89A82 | #55524C | #B5A9D0 | #4A3D65 | cor | 21 | pages/ClubDemo.tsx, pages/Legal.tsx, pages/ProfessionalPortfolio.tsx, pages/QueueJoin.tsx, pages/Register.tsx, components/AIAssistantChat.tsx, +7 |
| `--color-violet-100` | design-system/tokens.css:38 | #EDE9FE | #EDE9FE | herda | herda | herda | cor | 0 | — |
| `--color-violet-200` | design-system/tokens.css:39 | #DDD6FE | #DDD6FE | herda | herda | herda | cor | 0 | — |
| `--color-violet-300` | design-system/tokens.css:40 | #C4B5FD | #C4B5FD | herda | herda | herda | cor | 0 | — |
| `--color-violet-400` | design-system/tokens.css:41 | #A78BFA | #A78BFA | herda | herda | herda | cor | 0 | — |
| `--color-violet-50` | design-system/tokens.css:37 | #F5F3FF | #F5F3FF | herda | herda | herda | cor | 0 | — |
| `--color-violet-500` | design-system/tokens.css:42 | #8B5CF6 | #8B5CF6 | herda | herda | herda | cor | 0 | — |
| `--color-violet-600` | design-system/tokens.css:43 | #7C3AED | #7C3AED | herda | herda | herda | cor | 0 | — |
| `--color-violet-700` | design-system/tokens.css:44 | #6D28D9 | #6D28D9 | herda | herda | herda | cor | 0 | — |
| `--color-violet-800` | design-system/tokens.css:45 | #5B21B6 | #5B21B6 | herda | herda | herda | cor | 0 | — |
| `--color-violet-900` | design-system/tokens.css:46 | #4C1D95 | #4C1D95 | herda | herda | herda | cor | 0 | — |
| `--color-violet-950` | design-system/tokens.css:47 | #2E1065 | #2E1065 | herda | herda | herda | cor | 0 | — |
| `--color-warning` | design-system/tokens.css:133 | #F59E0B | #F59E0B | #B45309 | #F59E0B | #B45309 | cor | 47 | pages/ClientArea.tsx, pages/ClientCRM.tsx, pages/ClubDemo.tsx, pages/JoinClub.tsx, pages/MembersList.tsx, pages/Products.tsx, +15 |
| `--color-warning-bg` | design-system/tokens.css:134 | rgba(245, 158, 11, 0.08) | rgba(245, 158, 11, 0.08) | rgba(217, 119, 6, 0.08) | rgba(245, 158, 11, 0.1) | rgba(217, 119, 6, 0.08) | cor | 14 | pages/ClientArea.tsx, pages/ClientCRM.tsx, pages/ClubDemo.tsx, pages/JoinClub.tsx, pages/QueueManagement.tsx, pages/settings/AuditLogs.tsx, +3 |
| `--color-warning-border` | design-system/tokens.css:135 | rgba(245, 158, 11, 0.2) | rgba(245, 158, 11, 0.2) | rgba(217, 119, 6, 0.15) | rgba(245, 158, 11, 0.2) | rgba(217, 119, 6, 0.12) | cor | 14 | pages/ClientArea.tsx, pages/ClientCRM.tsx, pages/ClubDemo.tsx, pages/JoinClub.tsx, pages/QueueManagement.tsx, pages/settings/AuditLogs.tsx, +2 |
| `--duration-base` | design-system/tokens.css:95 | 200ms | 200ms | herda | herda | herda | motion | 0 | — |
| `--duration-fast` | design-system/tokens.css:94 | 150ms | 150ms | herda | herda | herda | motion | 0 | — |
| `--duration-slow` | design-system/tokens.css:96 | 300ms | 300ms | herda | herda | herda | motion | 0 | — |
| `--ease-out` | design-system/tokens.css:97 | cubic-bezier(0.16, 1, 0.3, 1) | cubic-bezier(0.16, 1, 0.3, 1) | herda | herda | herda | motion | 0 | — |
| `--elevation-0` | design-system/tokens.css:149 | none | none | none | none | none | sombra | 0 | — |
| `--elevation-1` | design-system/tokens.css:150 | 0 4px 12px -4px rgba(0, 0, 0, 0.5) | 0 4px 12px -4px rgba(0, 0, 0, 0.5) | 0 3px 10px -3px rgba(80, 64, 24, 0.14) | 0 4px 12px -4px rgba(0, 0, 0, 0.5) | 0 3px 10px -3px rgba(76, 29, 149, 0.13) | sombra | 0 | — |
| `--elevation-2` | design-system/tokens.css:151 | var(--shadow-card) | var(--shadow-card) | var(--shadow-card) | var(--shadow-card) | var(--shadow-card) | sombra | 2 | components/ChatBubble.tsx, components/ClientBookingCard.tsx |
| `--elevation-3` | design-system/tokens.css:152 | 0 24px 64px -16px rgba(0, 0, 0, 0.75), inset 0 0 0 1px rgba(255, 245, 230, 0.12) | 0 24px 64px -16px rgba(0, 0, 0, 0.75), inset 0 0 0 1px rgba(255, 245, 230, 0.12) | var(--shadow-modal) | 0 24px 64px -16px rgba(0, 0, 0, 0.72), inset 0 0 0 1px rgba(200, 180, 255, 0.14) | var(--shadow-modal) | sombra | 6 | pages/Login.tsx, pages/Register.tsx, pages/StaffOnboarding.tsx |
| `--font-body` | design-system/tokens.css:90 | 'Inter', sans-serif | 'Inter', sans-serif | herda | herda | herda | tipografia | 0 | — |
| `--font-heading` | design-system/tokens.css:89 | 'Chivo', sans-serif | 'Chivo', sans-serif | herda | herda | herda | tipografia | 0 | — |
| `--font-mono` | design-system/tokens.css:91 | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace | herda | herda | herda | tipografia | 0 | — |
| `--gradient-bg` | design-system/tokens.css:160 | radial-gradient(circle at 10% 90%, rgba(194, 155, 64, 0.08) 0%, transparent 50%), radial-gradient(circle at 90% 10%, rgba(194, 155, 64, 0.05) 0%, transparent 40%), var(--color-bg) | radial-gradient(circle at 10% 90%, rgba(194, 155, 64, 0.08) 0%, transparent 50%), radial-gradient(circle at 90% 10%, rgba(194, 155, 64, 0.05) 0%, transparent 40%), var(--color-bg) | radial-gradient(circle at 15% 85%, rgba(139, 105, 20, 0.08) 0%, transparent 50%), radial-gradient(circle at 85% 15%, rgba(139, 105, 20, 0.05) 0%, transparent 40%), var(--color-bg) | radial-gradient(circle at 10% 90%, rgba(167, 139, 250, 0.10) 0%, transparent 50%), radial-gradient(circle at 90% 10%, rgba(139, 92, 246, 0.06) 0%, transparent 40%), var(--color-bg) | radial-gradient(circle at 15% 85%, rgba(91, 33, 182, 0.08) 0%, transparent 50%), radial-gradient(circle at 85% 10%, rgba(139, 92, 246, 0.05) 0%, transparent 40%), var(--color-bg) | outro | 4 | design-system/tokens.css |
| `--gradient-card` | design-system/tokens.css:159 | linear-gradient(135deg, #12100E 0%, #1A1816 50%, #12100E 100%) | linear-gradient(135deg, #12100E 0%, #1A1816 50%, #12100E 100%) | linear-gradient(135deg, #FFFFFF 0%, #F5F3EE 100%) | linear-gradient(135deg, #17132A 0%, #221F35 50%, #17132A 100%) | linear-gradient(135deg, #FFFFFF 0%, #F3F0FA 100%) | outro | 0 | — |
| `--particle-color` | design-system/tokens.css:162 | rgba(194, 155, 64, 0.20) | rgba(194, 155, 64, 0.20) | rgba(139, 105, 20, 0.08) | rgba(167, 139, 250, 0.25) | rgba(91, 33, 182, 0.06) | outro | 15 | index.html |
| `--shadow-brutal` | design-system/tokens.css:155 | 8px 8px 0 0 #000000 | 8px 8px 0 0 #000000 | 6px 6px 0 0 rgba(139, 105, 20, 0.30) | 8px 8px 0 0 #000000 | 6px 6px 0 0 rgba(91, 33, 182, 0.25) | sombra | 3 | pages/ForgotPassword.tsx, pages/UpdatePassword.tsx, index.html |
| `--shadow-brutal-md` | design-system/tokens.css:157 | 4px 4px 0 0 #000000 | 4px 4px 0 0 #000000 | 4px 4px 0 0 rgba(139, 105, 20, 0.26) | 4px 4px 0 0 #000000 | 4px 4px 0 0 rgba(91, 33, 182, 0.22) | sombra | 1 | index.html |
| `--shadow-brutal-sm` | design-system/tokens.css:156 | 2px 2px 0 0 #000000 | 2px 2px 0 0 #000000 | 2px 2px 0 0 rgba(139, 105, 20, 0.22) | 2px 2px 0 0 #000000 | 2px 2px 0 0 rgba(91, 33, 182, 0.18) | sombra | 1 | index.html |
| `--shadow-btn-primary` | design-system/tokens.css:145 | 0 4px 20px rgba(194, 155, 64, 0.25) | 0 4px 20px rgba(194, 155, 64, 0.25) | 0 4px 16px rgba(139, 105, 20, 0.25) | 0 4px 20px rgba(183, 148, 246, 0.3) | 0 4px 16px rgba(91, 33, 182, 0.28) | sombra | 2 | hooks/useBrutalTheme.ts |
| `--shadow-card` | design-system/tokens.css:140 | 0 12px 40px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 245, 230, 0.12) | 0 12px 40px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 245, 230, 0.12) | 0 8px 24px -8px rgba(100, 80, 30, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06) | 0 12px 40px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(200, 180, 255, 0.14) | 0 8px 24px -8px rgba(91, 33, 182, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05) | sombra | 8 | pages/QueueManagement.tsx, components/ClientBookingCard.tsx, hooks/useBrutalTheme.ts, design-system/tokens.css |
| `--shadow-card-accent` | design-system/tokens.css:143 | 0 0 10px rgba(194, 155, 64, 0.4), 0 0 20px rgba(194, 155, 64, 0.2) | 0 0 10px rgba(194, 155, 64, 0.4), 0 0 20px rgba(194, 155, 64, 0.2) | 0 6px 24px rgba(139, 105, 20, 0.20), 0 2px 8px rgba(0, 0, 0, 0.06) | 0 0 10px rgba(183, 148, 246, 0.5), 0 0 20px rgba(183, 148, 246, 0.3) | 0 6px 24px rgba(91, 33, 182, 0.22), 0 2px 8px rgba(0, 0, 0, 0.06) | sombra | 12 | pages/Agenda.tsx, pages/QueueJoin.tsx, pages/StaffInsights.tsx, components/appointment/ServiceList.tsx, components/OnboardingLayout.tsx, hooks/useBrutalTheme.ts |
| `--shadow-card-glow` | design-system/tokens.css:144 | 0 16px 36px -12px rgba(0,0,0,0.6), 0 8px 16px -8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(194, 155, 64, 0.15) | 0 16px 36px -12px rgba(0,0,0,0.6), 0 8px 16px -8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(194, 155, 64, 0.15) | 0 12px 32px rgba(139, 105, 20, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08) | 0 16px 36px -12px rgba(0,0,0,0.6), 0 8px 16px -8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(167, 139, 250, 0.15) | 0 12px 32px rgba(91, 33, 182, 0.18), 0 4px 12px rgba(0, 0, 0, 0.06) | sombra | 3 | hooks/useBrutalTheme.ts |
| `--shadow-card-hover` | design-system/tokens.css:142 | 0 8px 24px rgba(194, 155, 64, 0.08), 0 4px 8px rgba(0, 0, 0, 0.4) | 0 8px 24px rgba(194, 155, 64, 0.08), 0 4px 8px rgba(0, 0, 0, 0.4) | 0 8px 24px rgba(139, 105, 20, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06) | 0 0 12px rgba(167, 139, 250, 0.12), 0 8px 24px rgba(0, 0, 0, 0.4) | 0 8px 24px rgba(91, 33, 182, 0.14), 0 4px 8px rgba(0, 0, 0, 0.05) | sombra | 1 | hooks/useBrutalTheme.ts |
| `--shadow-card-mobile` | design-system/tokens.css:141 | 0 4px 12px rgba(0, 0, 0, 0.5) | 0 4px 12px rgba(0, 0, 0, 0.5) | 0 4px 12px rgba(100, 80, 30, 0.12) | 0 4px 12px rgba(0, 0, 0, 0.5) | 0 4px 12px rgba(91, 33, 182, 0.10) | sombra | 0 | — |
| `--shadow-modal` | design-system/tokens.css:146 | 0 12px 40px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 245, 230, 0.12) | 0 12px 40px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 245, 230, 0.12) | 0 24px 64px -16px rgba(100, 80, 30, 0.18), 0 8px 20px rgba(0, 0, 0, 0.08) | 0 12px 40px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(200, 180, 255, 0.14) | 0 24px 64px -16px rgba(91, 33, 182, 0.15), 0 8px 20px rgba(0, 0, 0, 0.06) | sombra | 6 | pages/Finance.tsx, hooks/useBrutalTheme.ts, design-system/tokens.css |
| `--z-drawer` | design-system/tokens.css:19 | 60 | 60 | herda | herda | herda | z-index | 0 | — |
| `--z-dropdown` | design-system/tokens.css:17 | 40 | 40 | herda | herda | herda | z-index | 0 | — |
| `--z-modal` | design-system/tokens.css:20 | 80 | 80 | herda | herda | herda | z-index | 14 | pages/Agenda.tsx, pages/PublicBooking.tsx, components/AddAuditEntryModal.tsx, components/AppointmentEditModal.tsx, components/AppointmentWizard.tsx, components/BugAnnotateModal.tsx, +5 |
| `--z-sticky` | design-system/tokens.css:18 | 50 | 50 | herda | herda | herda | z-index | 0 | — |
| `--z-toast` | design-system/tokens.css:21 | 90 | 90 | herda | herda | herda | z-index | 1 | components/ui/Toast.tsx |

## 2 — Tokens definidos e nunca usados (órfãos)

- `--color-gold-100`, design-system/tokens.css:25
- `--color-gold-200`, design-system/tokens.css:26
- `--color-gold-300`, design-system/tokens.css:27
- `--color-gold-400`, design-system/tokens.css:28
- `--color-gold-50`, design-system/tokens.css:24
- `--color-gold-500`, design-system/tokens.css:29
- `--color-gold-600`, design-system/tokens.css:30
- `--color-gold-700`, design-system/tokens.css:31
- `--color-gold-800`, design-system/tokens.css:32
- `--color-gold-900`, design-system/tokens.css:33
- `--color-gold-950`, design-system/tokens.css:34
- `--color-neutral-0`, design-system/tokens.css:76
- `--color-neutral-100`, design-system/tokens.css:78
- `--color-neutral-200`, design-system/tokens.css:79
- `--color-neutral-300`, design-system/tokens.css:80
- `--color-neutral-400`, design-system/tokens.css:81
- `--color-neutral-50`, design-system/tokens.css:77
- `--color-neutral-500`, design-system/tokens.css:82
- `--color-neutral-600`, design-system/tokens.css:83
- `--color-neutral-700`, design-system/tokens.css:84
- `--color-neutral-800`, design-system/tokens.css:85
- `--color-neutral-900`, design-system/tokens.css:86
- `--color-orchid-100`, design-system/tokens.css:64
- `--color-orchid-200`, design-system/tokens.css:65
- `--color-orchid-300`, design-system/tokens.css:66
- `--color-orchid-400`, design-system/tokens.css:67
- `--color-orchid-50`, design-system/tokens.css:63
- `--color-orchid-500`, design-system/tokens.css:68
- `--color-orchid-600`, design-system/tokens.css:69
- `--color-orchid-700`, design-system/tokens.css:70
- `--color-orchid-800`, design-system/tokens.css:71
- `--color-orchid-900`, design-system/tokens.css:72
- `--color-orchid-950`, design-system/tokens.css:73
- `--color-sand-100`, design-system/tokens.css:51
- `--color-sand-200`, design-system/tokens.css:52
- `--color-sand-300`, design-system/tokens.css:53
- `--color-sand-400`, design-system/tokens.css:54
- `--color-sand-50`, design-system/tokens.css:50
- `--color-sand-500`, design-system/tokens.css:55
- `--color-sand-600`, design-system/tokens.css:56
- `--color-sand-700`, design-system/tokens.css:57
- `--color-sand-800`, design-system/tokens.css:58
- `--color-sand-900`, design-system/tokens.css:59
- `--color-sand-950`, design-system/tokens.css:60
- `--color-violet-100`, design-system/tokens.css:38
- `--color-violet-200`, design-system/tokens.css:39
- `--color-violet-300`, design-system/tokens.css:40
- `--color-violet-400`, design-system/tokens.css:41
- `--color-violet-50`, design-system/tokens.css:37
- `--color-violet-500`, design-system/tokens.css:42
- `--color-violet-600`, design-system/tokens.css:43
- `--color-violet-700`, design-system/tokens.css:44
- `--color-violet-800`, design-system/tokens.css:45
- `--color-violet-900`, design-system/tokens.css:46
- `--color-violet-950`, design-system/tokens.css:47
- `--duration-base`, design-system/tokens.css:95
- `--duration-fast`, design-system/tokens.css:94
- `--duration-slow`, design-system/tokens.css:96
- `--ease-out`, design-system/tokens.css:97
- `--elevation-0`, design-system/tokens.css:149
- `--elevation-1`, design-system/tokens.css:150
- `--font-body`, design-system/tokens.css:90
- `--font-heading`, design-system/tokens.css:89
- `--font-mono`, design-system/tokens.css:91
- `--gradient-card`, design-system/tokens.css:159
- `--shadow-card-mobile`, design-system/tokens.css:141
- `--z-drawer`, design-system/tokens.css:19
- `--z-dropdown`, design-system/tokens.css:17
- `--z-sticky`, design-system/tokens.css:18

## 3 — Tokens usados e nunca definidos (referência quebrada)

- `--header-top`, components/Header.tsx:69
- `--header-top`, components/SettingsLayout.tsx:140
- `--header-top`, components/SettingsLayout.tsx:141
- `--header-top`, components/Sidebar.tsx:61

## 4 — Valores HARDCODED fora do sistema

### Cores hex / rgb / rgba / hsl

| Arquivo | Linhas | Valor literal encontrado | Token equivalente que já existe (ou "não existe token equivalente") |
|---|---|---|---|
| components/BugAnnotateModal.tsx | 203 | `rgba(0,0,0,0.25)` | não existe token equivalente |
| components/ClientWhatsAppFAB.tsx | 80, 89 | `#25D366` | não existe token equivalente |
| components/ClientWhatsAppFAB.tsx | 80, 89 | `#1ebe5a` | não existe token equivalente |
| components/dashboard/DataMaturityBadge.tsx | 29 | `rgba(255,255,255,0.05)` | não existe token equivalente |
| components/onboarding/StepTeam.tsx | 64 | `#8a6d2a` | não existe token equivalente |
| components/onboarding/WizardPointer.tsx | 25, 36, 47, 58, 136 | `#F59E0B` | --color-warning |
| components/onboarding/WizardPointer.tsx | 136 | `rgba(0,0,0,0.75)` | não existe token equivalente |
| components/OnboardingLayout.tsx | 41 | `rgba(167,139,250,0.04)` | não existe token equivalente |
| components/OnboardingLayout.tsx | 41 | `rgba(194,155,64,0.04)` | não existe token equivalente |
| hooks/useAppTour.ts | 38, 82, 85, 88, 91 | `#1e1e1e` | não existe token equivalente |
| hooks/useAppTour.ts | 38, 82, 85, 88, 91 | `#0f0f0f` | não existe token equivalente |
| hooks/useAppTour.ts | 39 | `#ffffff` | não existe token equivalente |
| hooks/useAppTour.ts | 40 | `#333` | não existe token equivalente |
| hooks/useAppTour.ts | 40 | `rgba(255, 255, 255, 0.1)` | não existe token equivalente |
| hooks/useAppTour.ts | 43 | `rgba(0,0,0,0.6)` | não existe token equivalente |
| hooks/useAppTour.ts | 51, 63 | `#eba6f0` | não existe token equivalente |
| hooks/useAppTour.ts | 51, 63 | `#c4a06f` | não existe token equivalente |
| hooks/useAppTour.ts | 59 | `#d4d4d4` | não existe token equivalente |
| hooks/useAppTour.ts | 64 | `#000000` | não existe token equivalente |
| hooks/useDynamicBranding.ts | 19 | `#121212` | --color-neutral-0 |
| hooks/useDynamicBranding.ts | 20 | `#F5F1E8` | não existe token equivalente |
| hooks/useDynamicBranding.ts | 29 | `#1F1B2E` | não existe token equivalente |
| hooks/useDynamicBranding.ts | 30 | `#F7F5FF` | não existe token equivalente |
| hooks/useThemeTokens.ts | 97 | `#121212` | --color-neutral-0 |
| hooks/useThemeTokens.ts | 98 | `#1E1E1E` | --color-neutral-50 |
| hooks/useThemeTokens.ts | 99 | `#252525` | --color-neutral-100 |
| hooks/useThemeTokens.ts | 100 | `#C29B40` | não existe token equivalente |
| hooks/useThemeTokens.ts | 101 | `#D4AF50` | não existe token equivalente |
| hooks/useThemeTokens.ts | 102 | `#EAEAEA` | não existe token equivalente |
| hooks/useThemeTokens.ts | 103 | `#A0A0A0` | não existe token equivalente |
| hooks/useThemeTokens.ts | 104 | `#525252` | não existe token equivalente |
| hooks/useThemeTokens.ts | 105 | `rgba(255, 255, 255, 0.05)` | não existe token equivalente |
| hooks/useThemeTokens.ts | 106 | `rgba(255, 255, 255, 0.08)` | não existe token equivalente |
| hooks/useThemeTokens.ts | 107 | `rgba(0, 0, 0, 0.7)` | não existe token equivalente |
| hooks/useThemeTokens.ts | 108 | `rgba(0, 0, 0, 0.3)` | não existe token equivalente |
| hooks/useThemeTokens.ts | 109 | `rgba(255, 255, 255, 0.06)` | não existe token equivalente |
| hooks/useThemeTokens.ts | 110 | `rgba(194, 155, 64, 0.6)` | não existe token equivalente |
| hooks/useThemeTokens.ts | 111 | `#EF4444` | --color-danger |
| hooks/useThemeTokens.ts | 112 | `#10B981` | --color-success |
| hooks/useThemeTokens.ts | 113 | `#F59E0B` | --color-warning |
| pages/Finance.tsx | 136 | `rgba(255,255,255,0.06)` | não existe token equivalente |
| pages/Finance.tsx | 136, 139 | `rgba(0,0,0,0.08)` | não existe token equivalente |
| pages/Finance.tsx | 139 | `rgba(255,255,255,0.1)` | não existe token equivalente |
| pages/Login.tsx | 83, 106, 139, 176 | `#0A0A0A` | não existe token equivalente |
| pages/Login.tsx | 214 | `#1A162A` | não existe token equivalente |
| pages/Login.tsx | 214 | `#111111` | não existe token equivalente |
| pages/Login.tsx | 249 | `#1C1C1C` | não existe token equivalente |
| pages/PublicBooking.tsx | 157 | `#fff` | não existe token equivalente |
| pages/PublicBooking.tsx | 158 | `#000` | não existe token equivalente |
| pages/PublicBooking.tsx | 323 | `#121212` | --color-neutral-0 |
| pages/Register.tsx | 129, 241 | `#1C1C1C` | não existe token equivalente |
| pages/Register.tsx | 232 | `#161616` | não existe token equivalente |

**Subtotal Cores hex / rgb / rgba / hsl:** 73 ocorrências

### Cores utilitárias Tailwind (paleta padrão)

| Arquivo | Linhas | Valor literal encontrado | Token equivalente que já existe (ou "não existe token equivalente") |
|---|---|---|---|
| components/dashboard/SetupCopilot.tsx | 245 | `bg-emerald-500/10` | não existe token equivalente |
| components/membership/MembershipBadge.tsx | 14 | `bg-slate-400/20` | não existe token equivalente |
| components/membership/MembershipBadge.tsx | 14 | `text-slate-200` | não existe token equivalente |
| components/membership/MembershipBadge.tsx | 15 | `bg-orange-700/20` | não existe token equivalente |
| components/membership/MembershipBadge.tsx | 15 | `text-orange-300` | não existe token equivalente |
| components/membership/PlanCard.tsx | 18 | `from-yellow-500/30` | não existe token equivalente |
| components/membership/PlanCard.tsx | 18 | `to-amber-600/10` | não existe token equivalente |
| components/membership/PlanCard.tsx | 20 | `ring-yellow-500/40` | não existe token equivalente |
| components/membership/PlanCard.tsx | 23 | `from-slate-400/30` | não existe token equivalente |
| components/membership/PlanCard.tsx | 23 | `to-slate-600/10` | não existe token equivalente |
| components/membership/PlanCard.tsx | 25 | `ring-slate-400/40` | não existe token equivalente |
| components/membership/PlanCard.tsx | 28 | `from-orange-700/30` | não existe token equivalente |
| components/membership/PlanCard.tsx | 28 | `to-orange-900/10` | não existe token equivalente |
| components/membership/PlanCard.tsx | 30 | `ring-orange-700/40` | não existe token equivalente |
| components/MonthlyHistory.tsx | 98 | `divide-neutral-800` | não existe token equivalente |
| components/onboarding/ActivationBanner.tsx | 38 | `from-green-400` | não existe token equivalente |
| components/onboarding/ActivationBanner.tsx | 38 | `to-green-600` | não existe token equivalente |
| components/onboarding/ActivationBanner.tsx | 38 | `shadow-green-500/20` | não existe token equivalente |
| components/onboarding/WizardEngine.tsx | 36 | `border-amber-400` | não existe token equivalente |
| components/onboarding/WizardPointer.tsx | 188 | `border-amber-400` | não existe token equivalente |
| components/onboarding/WizardPointer.tsx | 214 | `text-amber-300` | não existe token equivalente |
| components/PublicBusinessHeader.tsx | 74 | `from-neutral-900` | não existe token equivalente |
| components/PublicBusinessHeader.tsx | 74 | `via-neutral-800` | não existe token equivalente |
| components/PublicBusinessHeader.tsx | 179 | `fill-amber-400` | não existe token equivalente |
| components/PublicBusinessHeader.tsx | 200 | `from-purple-500` | não existe token equivalente |
| components/PublicBusinessHeader.tsx | 200 | `to-pink-500` | não existe token equivalente |
| components/SmartNotifications.tsx | 11 | `bg-orange-400/10` | não existe token equivalente |
| components/SmartNotifications.tsx | 12 | `bg-blue-400/10` | não existe token equivalente |
| components/SmartNotifications.tsx | 13 | `text-purple-400` | não existe token equivalente |
| components/SmartNotifications.tsx | 13 | `bg-purple-400/10` | não existe token equivalente |
| components/SmartNotifications.tsx | 14 | `bg-green-400/10` | não existe token equivalente |
| components/SmartNotifications.tsx | 15 | `bg-yellow-400/10` | não existe token equivalente |
| components/TeamMemberForm.tsx | 175 | `bg-emerald-500/10` | não existe token equivalente |
| components/TeamMemberForm.tsx | 175 | `text-emerald-400` | não existe token equivalente |
| components/TeamMemberForm.tsx | 175 | `border-emerald-500/30` | não existe token equivalente |
| components/TrialBanner.tsx | 29 | `bg-neutral-100` | não existe token equivalente |
| components/TrialBanner.tsx | 54 | `bg-yellow-400` | não existe token equivalente |
| hooks/useContentCalendar.ts | 21 | `from-amber-600` | não existe token equivalente |
| hooks/useContentCalendar.ts | 21 | `to-orange-800` | não existe token equivalente |
| hooks/useContentCalendar.ts | 22 | `from-violet-600` | não existe token equivalente |
| hooks/useContentCalendar.ts | 22, 27 | `to-purple-800` | não existe token equivalente |
| hooks/useContentCalendar.ts | 23 | `from-emerald-600` | não existe token equivalente |
| hooks/useContentCalendar.ts | 23 | `to-teal-800` | não existe token equivalente |
| hooks/useContentCalendar.ts | 24 | `from-rose-600` | não existe token equivalente |
| hooks/useContentCalendar.ts | 24 | `to-pink-800` | não existe token equivalente |
| hooks/useContentCalendar.ts | 25 | `from-blue-600` | não existe token equivalente |
| hooks/useContentCalendar.ts | 25 | `to-indigo-800` | não existe token equivalente |
| hooks/useContentCalendar.ts | 26 | `from-cyan-600` | não existe token equivalente |
| hooks/useContentCalendar.ts | 26 | `to-sky-800` | não existe token equivalente |
| hooks/useContentCalendar.ts | 27 | `from-fuchsia-600` | não existe token equivalente |
| hooks/useContentCalendar.ts | 28 | `from-lime-600` | não existe token equivalente |
| hooks/useContentCalendar.ts | 28 | `to-green-800` | não existe token equivalente |
| pages/ClientCRM.tsx | 526 | `to-neutral-900` | não existe token equivalente |
| pages/ClubDemo.tsx | 142 | `from-yellow-500/30` | não existe token equivalente |
| pages/ClubDemo.tsx | 142 | `to-amber-600/10` | não existe token equivalente |
| pages/ClubDemo.tsx | 349, 430 | `from-yellow-500/20` | não existe token equivalente |
| pages/ClubDemo.tsx | 349, 430 | `via-amber-500/10` | não existe token equivalente |
| pages/ClubDemo.tsx | 349, 430 | `to-orange-500/5` | não existe token equivalente |
| pages/ForgotPassword.tsx | 40 | `from-blue-500/5` | não existe token equivalente |
| pages/ForgotPassword.tsx | 88 | `border-blue-500` | não existe token equivalente |
| pages/ForgotPassword.tsx | 96 | `bg-blue-600` | não existe token equivalente |
| pages/ForgotPassword.tsx | 123 | `bg-neutral-200` | não existe token equivalente |
| pages/ProfessionalPortfolio.tsx | 79 | `from-neutral-900` | não existe token equivalente |
| pages/ProfessionalPortfolio.tsx | 79 | `via-neutral-900/90` | não existe token equivalente |
| pages/ProfessionalPortfolio.tsx | 88 | `from-purple-900/40` | não existe token equivalente |
| pages/ProfessionalPortfolio.tsx | 88 | `from-yellow-900/20` | não existe token equivalente |
| pages/ProfessionalPortfolio.tsx | 90 | `from-neutral-950` | não existe token equivalente |
| pages/ProfessionalPortfolio.tsx | 90 | `via-neutral-950/60` | não existe token equivalente |
| pages/QueueJoin.tsx | 145 | `bg-blue-600/10` | não existe token equivalente |
| pages/QueueJoin.tsx | 154 | `from-neutral-950` | não existe token equivalente |
| pages/QueueJoin.tsx | 184, 236 | `placeholder-neutral-500` | não existe token equivalente |
| pages/QueueJoin.tsx | 184, 236 | `border-neutral-400` | não existe token equivalente |
| pages/QueueJoin.tsx | 184 | `ring-neutral-400/60` | não existe token equivalente |
| pages/QueueStatus.tsx | 178 | `bg-blue-600/10` | não existe token equivalente |
| pages/settings/AuditLogs.tsx | 86 | `bg-orange-500/10` | não existe token equivalente |
| pages/settings/AuditLogs.tsx | 86 | `text-orange-500` | não existe token equivalente |
| pages/settings/AuditLogs.tsx | 86 | `border-orange-500/20` | não existe token equivalente |
| pages/settings/AuditLogs.tsx | 88 | `text-yellow-600` | não existe token equivalente |
| pages/settings/MembershipPlansSettings.tsx | 18 | `from-yellow-500/30` | não existe token equivalente |
| pages/settings/MembershipPlansSettings.tsx | 18 | `to-amber-600/10` | não existe token equivalente |
| pages/settings/MembershipPlansSettings.tsx | 19 | `from-slate-400/30` | não existe token equivalente |
| pages/settings/MembershipPlansSettings.tsx | 19 | `to-slate-600/10` | não existe token equivalente |
| pages/settings/MembershipPlansSettings.tsx | 20 | `from-orange-700/30` | não existe token equivalente |
| pages/settings/MembershipPlansSettings.tsx | 20 | `to-orange-900/10` | não existe token equivalente |
| pages/settings/RecycleBin.tsx | 62, 92, 203 | `text-orange-500` | não existe token equivalente |
| pages/settings/RecycleBin.tsx | 90 | `border-orange-500/30` | não existe token equivalente |
| pages/settings/RecycleBin.tsx | 90 | `bg-orange-500/5` | não existe token equivalente |
| pages/settings/RecycleBin.tsx | 135 | `divide-neutral-800` | não existe token equivalente |
| pages/settings/SecuritySettings.tsx | 63 | `bg-orange-500/5` | não existe token equivalente |
| pages/settings/SecuritySettings.tsx | 63 | `border-orange-500/10` | não existe token equivalente |
| pages/settings/TeamSettings.tsx | 74 | `bg-emerald-500/10` | não existe token equivalente |
| pages/settings/TeamSettings.tsx | 74 | `border-emerald-500/30` | não existe token equivalente |
| pages/UpdatePassword.tsx | 133 | `from-green-500/5` | não existe token equivalente |
| pages/UpdatePassword.tsx | 202 | `bg-neutral-200` | não existe token equivalente |

**Subtotal Cores utilitárias Tailwind (paleta padrão):** 102 ocorrências

### Tamanhos de fonte arbitrários

| Arquivo | Linhas | Valor literal encontrado | Token equivalente que já existe (ou "não existe token equivalente") |
|---|---|---|---|
| hooks/useAppTour.ts | 48 | `font-size: 20px !important` | não existe token equivalente |
| hooks/useAppTour.ts | 57 | `font-size: 14px !important` | não existe token equivalente |
| hooks/useAppTour.ts | 69 | `font-size: 13px !important` | não existe token equivalente |

**Subtotal Tamanhos de fonte arbitrários:** 3 ocorrências

### Espaçamentos arbitrários

| Arquivo | Linhas | Valor literal encontrado | Token equivalente que já existe (ou "não existe token equivalente") |
|---|---|---|---|
| components/ChatBubble.tsx | 106 | `pl-[52px]` | não existe token equivalente |
| components/Layout.tsx | 28 | `pt-[104px]` | não existe token equivalente |
| components/Layout.tsx | 28 | `pt-[120px]` | não existe token equivalente |

**Subtotal Espaçamentos arbitrários:** 3 ocorrências

### Raios

| Arquivo | Linhas | Valor literal encontrado | Token equivalente que já existe (ou "não existe token equivalente") |
|---|---|---|---|
| components/BottomMobileNav.tsx | 30 | `rounded-[28px]` | não existe token equivalente |
| components/CommissionPaymentHistory.tsx | 194 | `rounded-[32px]` | não existe token equivalente |
| components/ProfessionalCommissionDetails.tsx | 320 | `rounded-[32px]` | não existe token equivalente |
| components/SkeletonLoader.tsx | 23 | `rounded-[24px]` | não existe token equivalente |
| hooks/useAppTour.ts | 41 | `border-radius: 16px !important` | não existe token equivalente |
| hooks/useAppTour.ts | 66 | `border-radius: 8px !important` | não existe token equivalente |

**Subtotal Raios:** 6 ocorrências

### Sombras

| Arquivo | Linhas | Valor literal encontrado | Token equivalente que já existe (ou "não existe token equivalente") |
|---|---|---|---|
| components/agenda/AgendaEmptySlotCell.tsx | 42 | `shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]` | não existe token equivalente |
| components/AIAssistantChat.tsx | 53 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/AIAssistantChat.tsx | 65 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/appointment/AppointmentReview.tsx | 183 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/appointment/ServiceList.tsx | 116, 170 | `shadow-[var(--shadow-card-accent)]` | não existe token equivalente |
| components/booking/BookingModeToggle.tsx | 21, 32 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/BrandIdentitySection.tsx | 82 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/ChatBubble.tsx | 68, 85 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/ChatBubble.tsx | 82 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/ChatBubble.tsx | 84 | `shadow-[var(--elevation-2)]` | não existe token equivalente |
| components/ClientBookingCard.tsx | 127 | `shadow-[var(--shadow-card)]` | não existe token equivalente |
| components/ClientBookingCard.tsx | 129 | `shadow-[var(--elevation-2)]` | não existe token equivalente |
| components/ClientWhatsAppFAB.tsx | 48 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/ClientWhatsAppFAB.tsx | 80, 89 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/dashboard/ActionCenter.tsx | 109 | `shadow-[0_0_8px_currentColor]` | não existe token equivalente |
| components/DevBugButton.tsx | 68 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/DevBugButton.tsx | 68 | `shadow-[var(--color-danger)]` | não existe token equivalente |
| components/ErrorBoundary.tsx | 22 | `shadow-[8px_8px_0px_0px_rgba(220,38,38,0.5)]` | não existe token equivalente |
| components/Header.tsx | 123 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/HelpButtons.tsx | 98 | `shadow-[0_20px_50px_rgba(0,0,0,0.5)]` | não existe token equivalente |
| components/HelpButtons.tsx | 162 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/MoreOptionsDrawer.tsx | 154 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/onboarding/ActivationBanner.tsx | 30 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/onboarding/ActivationBanner.tsx | 38 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/onboarding/StandaloneWizardPointer.tsx | 137 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/onboarding/StandaloneWizardPointer.tsx | 172 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/onboarding/StepMonthlyGoal.tsx | 78 | `shadow-[0_0_10px_rgba(167,139,250,0.2)]` | não existe token equivalente |
| components/onboarding/StepServices.tsx | 74 | `shadow-sm` | --elevation-1 / --shadow-card-mobile |
| components/onboarding/StepTeam.tsx | 63 | `shadow-[0_0_15px_rgba(167,139,250,0.3)]` | não existe token equivalente |
| components/onboarding/StepTeam.tsx | 64 | `shadow-[0_4px_0_0_#8a6d2a]` | não existe token equivalente |
| components/onboarding/WizardEngine.tsx | 142 | `shadow-sm` | --elevation-1 / --shadow-card-mobile |
| components/OnboardingLayout.tsx | 104 | `shadow-[var(--shadow-card-accent)]` | não existe token equivalente |
| components/OnboardingLayout.tsx | 105 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/PhoneInput.tsx | 147 | `shadow-xl` | --elevation-3 / --shadow-modal |
| components/ProfessionalCommissionDetails.tsx | 301, 376 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/PublicBusinessHeader.tsx | 127, 230, 235 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/QuickActionsModal.tsx | 73, 74 | `shadow-[0_0_12px_rgba(52,211,153,0.15)]` | não existe token equivalente |
| components/SaveFooter.tsx | 72 | `shadow-lg` | --elevation-2 / --shadow-card |
| components/Screw.tsx | 10 | `shadow-sm` | --elevation-1 / --shadow-card-mobile |
| components/SearchableSelect.tsx | 115 | `shadow-xl` | --elevation-3 / --shadow-modal |
| components/ServiceModal.tsx | 236 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| components/SettingsSwitch.tsx | 47 | `shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]` | não existe token equivalente |
| components/TimeGrid.tsx | 66 | `shadow-lg` | --elevation-2 / --shadow-card |
| hooks/useAppTour.ts | 43 | `box-shadow: 0 20px 50px rgba(0,0,0,0.6) !important` | não existe token equivalente |
| hooks/useBrutalTheme.ts | 170, 299 | `shadow-[var(--shadow-card-accent)]` | não existe token equivalente |
| hooks/useBrutalTheme.ts | 171, 256, 300 | `shadow-[var(--shadow-card-glow)]` | não existe token equivalente |
| hooks/useBrutalTheme.ts | 252, 298 | `shadow-[var(--shadow-card)]` | não existe token equivalente |
| hooks/useBrutalTheme.ts | 253 | `shadow-[var(--shadow-card-hover)]` | não existe token equivalente |
| hooks/useBrutalTheme.ts | 254, 255, 331 | `shadow-[var(--shadow-modal)]` | não existe token equivalente |
| hooks/useBrutalTheme.ts | 257, 302 | `shadow-[var(--shadow-btn-primary)]` | não existe token equivalente |
| pages/Agenda.tsx | 1257, 1285, 1309, 1312 | `shadow-[var(--shadow-card-accent)]` | não existe token equivalente |
| pages/Agenda.tsx | 1585 | `shadow-sm` | --elevation-1 / --shadow-card-mobile |
| pages/ClientArea.tsx | 314 | `shadow-lg` | --elevation-2 / --shadow-card |
| pages/ClientArea.tsx | 460 | `shadow-md` | --elevation-2 / --shadow-card |
| pages/ClientArea.tsx | 481, 584 | `shadow-sm` | --elevation-1 / --shadow-card-mobile |
| pages/ClientCRM.tsx | 552 | `shadow-lg` | --elevation-2 / --shadow-card |
| pages/ForgotPassword.tsx | 49 | `shadow-[var(--shadow-brutal)]` | não existe token equivalente |
| pages/Login.tsx | 208, 209 | `shadow-[var(--elevation-3)]` | não existe token equivalente |
| pages/ProfessionalPortfolio.tsx | 98 | `shadow-[0_0_30px_rgba(0,0,0,0.5)]` | não existe token equivalente |
| pages/QueueJoin.tsx | 157, 170, 176 | `shadow-xl` | --elevation-3 / --shadow-modal |
| pages/QueueJoin.tsx | 250, 299 | `shadow-[var(--shadow-card-accent)]` | não existe token equivalente |
| pages/QueueManagement.tsx | 245 | `shadow-[var(--shadow-card)]` | não existe token equivalente |
| pages/QueueStatus.tsx | 190 | `shadow-2xl` | --elevation-3 / --shadow-modal |
| pages/Register.tsx | 129, 226, 227 | `shadow-[var(--elevation-3)]` | não existe token equivalente |
| pages/StaffInsights.tsx | 145 | `shadow-[var(--shadow-card-accent)]` | não existe token equivalente |
| pages/StaffOnboarding.tsx | 53 | `shadow-[var(--elevation-3)]` | não existe token equivalente |
| pages/UpdatePassword.tsx | 136 | `shadow-[var(--shadow-brutal)]` | não existe token equivalente |

**Subtotal Sombras:** 92 ocorrências

### Larguras de borda arbitrárias

| Arquivo | Linhas | Valor literal encontrado | Token equivalente que já existe (ou "não existe token equivalente") |
|---|---|---|---|
| components/HelpButtons.tsx | 112 | `border-[6px]` | não existe token equivalente |

**Subtotal Larguras de borda arbitrárias:** 1 ocorrências

### z-[N] arbitrário

| Arquivo | Linhas | Valor literal encontrado | Token equivalente que já existe (ou "não existe token equivalente") |
|---|---|---|---|
| components/AIAssistantChat.tsx | 53 | `z-[60]` | --z-drawer |
| components/AIAssistantChat.tsx | 65 | `z-[59]` | --z-drawer |
| components/MoreOptionsDrawer.tsx | 136 | `z-[60]` | --z-drawer |
| components/onboarding/ActivationBanner.tsx | 29 | `z-[10000]` | não existe token equivalente |
| components/onboarding/StandaloneWizardPointer.tsx | 137, 172 | `z-[9999]` | não existe token equivalente |
| components/onboarding/WizardEngine.tsx | 102 | `z-[9997]` | não existe token equivalente |
| components/onboarding/WizardEngine.tsx | 105 | `z-[1]` | --z-dropdown |
| components/onboarding/WizardEngine.tsx | 115, 154 | `z-[60]` | --z-drawer |
| components/onboarding/WizardOverlay.tsx | 22 | `z-[9996]` | não existe token equivalente |
| components/onboarding/WizardPointer.tsx | 188, 202 | `z-[9999]` | não existe token equivalente |
| components/SettingsLayout.tsx | 152 | `z-[60]` | --z-drawer |
| components/SettingsLayout.tsx | 157 | `z-[70]` | --z-modal |
| components/TrialBanner.tsx | 24, 54, 69 | `z-[60]` | --z-drawer |
| pages/Dashboard.tsx | 140 | `z-[90]` | --z-toast |
| pages/PublicBooking.tsx | 689 | `z-[1]` | --z-dropdown |
| pages/PublicBooking.tsx | 721, 1073, 1719 | `z-[60]` | --z-drawer |

**Subtotal z-[N] arbitrário:** 23 ocorrências

### Contagem por página/componente (ordenada maior → menor)

- hooks/useAppTour.ts — 26 ocorrências (Cores hex / rgb / rgba / hsl: 20; Tamanhos de fonte arbitrários: 3; Raios: 2; Sombras: 1)
- hooks/useThemeTokens.ts — 17 ocorrências (Cores hex / rgb / rgba / hsl: 17)
- hooks/useContentCalendar.ts — 16 ocorrências (Cores utilitárias Tailwind (paleta padrão): 16)
- hooks/useBrutalTheme.ts — 13 ocorrências (Sombras: 13)
- pages/QueueJoin.tsx — 12 ocorrências (Cores utilitárias Tailwind (paleta padrão): 7; Sombras: 5)
- components/onboarding/WizardPointer.tsx — 10 ocorrências (Cores hex / rgb / rgba / hsl: 6; Cores utilitárias Tailwind (paleta padrão): 2; z-[N] arbitrário: 2)
- pages/Login.tsx — 9 ocorrências (Cores hex / rgb / rgba / hsl: 7; Sombras: 2)
- components/membership/PlanCard.tsx — 9 ocorrências (Cores utilitárias Tailwind (paleta padrão): 9)
- pages/ClubDemo.tsx — 8 ocorrências (Cores utilitárias Tailwind (paleta padrão): 8)
- components/PublicBusinessHeader.tsx — 8 ocorrências (Cores utilitárias Tailwind (paleta padrão): 5; Sombras: 3)
- pages/PublicBooking.tsx — 7 ocorrências (Cores hex / rgb / rgba / hsl: 3; z-[N] arbitrário: 4)
- components/ClientWhatsAppFAB.tsx — 7 ocorrências (Cores hex / rgb / rgba / hsl: 4; Sombras: 3)
- pages/ProfessionalPortfolio.tsx — 7 ocorrências (Cores utilitárias Tailwind (paleta padrão): 6; Sombras: 1)
- pages/Register.tsx — 6 ocorrências (Cores hex / rgb / rgba / hsl: 3; Sombras: 3)
- pages/settings/MembershipPlansSettings.tsx — 6 ocorrências (Cores utilitárias Tailwind (paleta padrão): 6)
- pages/settings/RecycleBin.tsx — 6 ocorrências (Cores utilitárias Tailwind (paleta padrão): 6)
- components/onboarding/ActivationBanner.tsx — 6 ocorrências (Cores utilitárias Tailwind (paleta padrão): 3; Sombras: 2; z-[N] arbitrário: 1)
- components/onboarding/WizardEngine.tsx — 6 ocorrências (Cores utilitárias Tailwind (paleta padrão): 1; Sombras: 1; z-[N] arbitrário: 4)
- components/SmartNotifications.tsx — 6 ocorrências (Cores utilitárias Tailwind (paleta padrão): 6)
- pages/ForgotPassword.tsx — 5 ocorrências (Cores utilitárias Tailwind (paleta padrão): 4; Sombras: 1)
- components/TrialBanner.tsx — 5 ocorrências (Cores utilitárias Tailwind (paleta padrão): 2; z-[N] arbitrário: 3)
- components/ChatBubble.tsx — 5 ocorrências (Espaçamentos arbitrários: 1; Sombras: 4)
- pages/Agenda.tsx — 5 ocorrências (Sombras: 5)
- pages/Finance.tsx — 4 ocorrências (Cores hex / rgb / rgba / hsl: 4)
- components/OnboardingLayout.tsx — 4 ocorrências (Cores hex / rgb / rgba / hsl: 2; Sombras: 2)
- hooks/useDynamicBranding.ts — 4 ocorrências (Cores hex / rgb / rgba / hsl: 4)
- pages/settings/AuditLogs.tsx — 4 ocorrências (Cores utilitárias Tailwind (paleta padrão): 4)
- components/membership/MembershipBadge.tsx — 4 ocorrências (Cores utilitárias Tailwind (paleta padrão): 4)
- pages/ClientArea.tsx — 4 ocorrências (Sombras: 4)
- components/AIAssistantChat.tsx — 4 ocorrências (Sombras: 2; z-[N] arbitrário: 2)
- components/onboarding/StandaloneWizardPointer.tsx — 4 ocorrências (Sombras: 2; z-[N] arbitrário: 2)
- components/onboarding/StepTeam.tsx — 3 ocorrências (Cores hex / rgb / rgba / hsl: 1; Sombras: 2)
- pages/UpdatePassword.tsx — 3 ocorrências (Cores utilitárias Tailwind (paleta padrão): 2; Sombras: 1)
- components/TeamMemberForm.tsx — 3 ocorrências (Cores utilitárias Tailwind (paleta padrão): 3)
- components/ProfessionalCommissionDetails.tsx — 3 ocorrências (Raios: 1; Sombras: 2)
- components/HelpButtons.tsx — 3 ocorrências (Sombras: 2; Larguras de borda arbitrárias: 1)
- pages/ClientCRM.tsx — 2 ocorrências (Cores utilitárias Tailwind (paleta padrão): 1; Sombras: 1)
- pages/QueueStatus.tsx — 2 ocorrências (Cores utilitárias Tailwind (paleta padrão): 1; Sombras: 1)
- pages/settings/SecuritySettings.tsx — 2 ocorrências (Cores utilitárias Tailwind (paleta padrão): 2)
- pages/settings/TeamSettings.tsx — 2 ocorrências (Cores utilitárias Tailwind (paleta padrão): 2)
- components/Layout.tsx — 2 ocorrências (Espaçamentos arbitrários: 2)
- components/appointment/ServiceList.tsx — 2 ocorrências (Sombras: 2)
- components/booking/BookingModeToggle.tsx — 2 ocorrências (Sombras: 2)
- components/ClientBookingCard.tsx — 2 ocorrências (Sombras: 2)
- components/DevBugButton.tsx — 2 ocorrências (Sombras: 2)
- components/MoreOptionsDrawer.tsx — 2 ocorrências (Sombras: 1; z-[N] arbitrário: 1)
- components/QuickActionsModal.tsx — 2 ocorrências (Sombras: 2)
- components/SettingsLayout.tsx — 2 ocorrências (z-[N] arbitrário: 2)
- components/BugAnnotateModal.tsx — 1 ocorrências (Cores hex / rgb / rgba / hsl: 1)
- components/dashboard/DataMaturityBadge.tsx — 1 ocorrências (Cores hex / rgb / rgba / hsl: 1)
- components/dashboard/SetupCopilot.tsx — 1 ocorrências (Cores utilitárias Tailwind (paleta padrão): 1)
- components/MonthlyHistory.tsx — 1 ocorrências (Cores utilitárias Tailwind (paleta padrão): 1)
- components/BottomMobileNav.tsx — 1 ocorrências (Raios: 1)
- components/CommissionPaymentHistory.tsx — 1 ocorrências (Raios: 1)
- components/SkeletonLoader.tsx — 1 ocorrências (Raios: 1)
- pages/QueueManagement.tsx — 1 ocorrências (Sombras: 1)
- pages/StaffInsights.tsx — 1 ocorrências (Sombras: 1)
- pages/StaffOnboarding.tsx — 1 ocorrências (Sombras: 1)
- components/agenda/AgendaEmptySlotCell.tsx — 1 ocorrências (Sombras: 1)
- components/appointment/AppointmentReview.tsx — 1 ocorrências (Sombras: 1)
- components/BrandIdentitySection.tsx — 1 ocorrências (Sombras: 1)
- components/dashboard/ActionCenter.tsx — 1 ocorrências (Sombras: 1)
- components/ErrorBoundary.tsx — 1 ocorrências (Sombras: 1)
- components/Header.tsx — 1 ocorrências (Sombras: 1)
- components/onboarding/StepMonthlyGoal.tsx — 1 ocorrências (Sombras: 1)
- components/onboarding/StepServices.tsx — 1 ocorrências (Sombras: 1)
- components/PhoneInput.tsx — 1 ocorrências (Sombras: 1)
- components/SaveFooter.tsx — 1 ocorrências (Sombras: 1)
- components/Screw.tsx — 1 ocorrências (Sombras: 1)
- components/SearchableSelect.tsx — 1 ocorrências (Sombras: 1)
- components/ServiceModal.tsx — 1 ocorrências (Sombras: 1)
- components/SettingsSwitch.tsx — 1 ocorrências (Sombras: 1)
- components/TimeGrid.tsx — 1 ocorrências (Sombras: 1)
- pages/Dashboard.tsx — 1 ocorrências (z-[N] arbitrário: 1)
- components/onboarding/WizardOverlay.tsx — 1 ocorrências (z-[N] arbitrário: 1)

## 5 — Classe Tailwind interpolada dinamicamente

Padrões de busca: utilitário-${...} (text|bg|border|…-${), ${var}-(50|100|…|950), ${variant}:(bg|text|…)-, hover:${, focus:${; excluídos ${colors|classes|accent|…}.

- nenhuma

## 6 — Estilo condicionado a flag JS de tema

- pages/Agenda.tsx:1331, decide: `<Card variant="outlined" className={`${isBeauty ? 'border-beauty-neon/35' : 'border-accent-gold/35'} ${accent.bgDim}`}>`, token: --color-accent (beauty)
- pages/Agenda.tsx:1764, decide: `<span className={`text-xl font-bold font-mono ${isBeauty ? colors.text : accent.text}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:267, decide: `<Loader2 className={`w-8 h-8 animate-spin ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- pages/ClientArea.tsx:288, decide: `className={`inline-flex items-center gap-2 text-xs font-medium transition-colors ${isBeauty ? 'text-theme-textSecondary hover:text-[var(--color-text-m`, token: não existe token equivalente
- pages/ClientArea.tsx:314, decide: `<div className={`rounded-2xl p-6 ${isBeauty ? 'bg-theme-card shadow-lg border border-theme-border' : 'bg-theme-surface border border-theme-border'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:318, decide: `<Phone className={`w-8 h-8 mx-auto mb-2 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- pages/ClientArea.tsx:322, decide: `<p className={`text-xs mt-1 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:328, decide: `<label className={`text-xs font-medium block mb-2 ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:361, decide: `<User className={`w-8 h-8 mx-auto mb-2 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- pages/ClientArea.tsx:365, decide: `<p className={`text-xs mt-1 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:370, decide: `<div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${isBeauty ? 'bg-theme-surface text-[var(--color-text-muted)]' : 'bg-t`, token: não existe token equivalente
- pages/ClientArea.tsx:376, decide: `<User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- pages/ClientArea.tsx:394, decide: `${isBeauty ? 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)]' : 'bg-theme-card text-[var(--color-bg)] hover:bg-[var(--color-card-`, token: não existe token equivalente
- pages/ClientArea.tsx:403, decide: `<p className={`text-center text-xs ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:405, decide: `<Link to={`/book/${slug}`} className={`font-semibold underline ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:421, decide: `className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${isBeauty ? 'text-theme-textSecondary hover:text-[var(--color-text`, token: não existe token equivalente
- pages/ClientArea.tsx:442, decide: `<div className={`relative overflow-hidden rounded-2xl p-6 ${isBeauty ? 'bg-theme-surface text-theme-text' : 'bg-theme-surface border border-theme-bord`, token: não existe token equivalente
- pages/ClientArea.tsx:446, decide: `<p className={`text-xs uppercase tracking-widest font-semibold mb-1 ${isBeauty ? 'text-theme-text' : 'text-[var(--color-text-muted)]'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:452, decide: `<p className={`text-xs mt-1 ${isBeauty ? 'text-theme-text' : 'text-theme-textSecondary'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:460, decide: `className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 ${isBeauty ? 'b`, token: não existe token equivalente
- pages/ClientArea.tsx:468, decide: `<div className={`flex gap-1 p-1 rounded-xl ${isBeauty ? 'bg-theme-surface/60' : 'bg-theme-surface border border-theme-border'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:492, decide: `<span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-black ${isBeauty ? 'bg-theme-surface text-theme-text' : 'b`, token: não existe token equivalente
- pages/ClientArea.tsx:502, decide: `<Loader2 className={`w-6 h-6 animate-spin ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- pages/ClientArea.tsx:513, decide: `<p className={`text-xs mt-0.5 ${isBeauty ? 'text-[var(--color-warning)]' : 'text-[var(--color-warning)]/70'}`}>`, token: não existe token equivalente
- pages/ClientArea.tsx:572, decide: `className={`w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${isBeauty ? 'bg-theme-surface text-[var(--color-text`, token: não existe token equivalente
- pages/ClientArea.tsx:584, decide: `<div className={`rounded-2xl p-6 space-y-5 ${isBeauty ? 'bg-theme-card border border-theme-border shadow-sm' : 'bg-theme-surface border border-theme-b`, token: não existe token equivalente
- pages/ClientArea.tsx:603, decide: `<User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- pages/ClientArea.tsx:613, decide: `<Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- pages/ClientArea.tsx:625, decide: `className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${isBeauty ? 'bg-theme-surface text-[var(--color-t`, token: não existe token equivalente
- pages/ClientArea.tsx:632, decide: `className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 ${isBeauty ? 'bg-theme-surface tex`, token: não existe token equivalente
- pages/ClientArea.tsx:640, decide: `<ProfileRow icon={<User className="w-4 h-4" />} label="Nome" value={sessionClient.name} isBeauty={isBeauty} />`, token: não existe token equivalente
- pages/ClientArea.tsx:641, decide: `<ProfileRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={sessionClient.phone} isBeauty={isBeauty} />`, token: não existe token equivalente
- pages/ClientArea.tsx:642, decide: `{sessionClient.email && <ProfileRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={sessionClient.email} isBeauty={isBeauty} />}`, token: não existe token equivalente
- pages/ClientArea.tsx:682, decide: `<div className={`py-16 flex flex-col items-center gap-4 rounded-2xl ${isBeauty ? 'bg-theme-card/60 border border-theme-border' : 'bg-theme-surface/60 `, token: não existe token equivalente
- pages/ClientArea.tsx:685, decide: `<p className={`font-semibold text-sm ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>{title}</p>`, token: não existe token equivalente
- pages/ClientArea.tsx:686, decide: `<p className={`text-xs mt-1 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>{description}</p>`, token: não existe token equivalente
- pages/ClientArea.tsx:691, decide: `className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isBeauty ? 'bg-theme-surface text-theme-text hover:bg-[`, token: não existe token equivalente
- pages/ClientArea.tsx:707, decide: `<div className={isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}>{icon}</div>`, token: não existe token equivalente
- pages/ClientArea.tsx:709, decide: `<p className={`text-xs uppercase tracking-wider font-medium ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>{label}</p>`, token: não existe token equivalente
- pages/ClientCRM.tsx:474, decide: `<RefreshCcw className="w-3 h-3" /> {isBeauty ? 'Repetir Serviço' : 'Repetir Estilo'}`, token: não existe token equivalente
- pages/ClientCRM.tsx:503, decide: `<Card title={isBeauty ? "Notas do Profissional" : "Notas do Barbeiro"} className="h-full">`, token: não existe token equivalente
- pages/ClientCRM.tsx:536, decide: `<span className={`${isBeauty ? 'bg-beauty-neon/20 text-beauty-neon border-beauty-neon' : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] bor`, token: --color-accent (beauty)
- pages/Finance.tsx:855, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Tip`, token: --color-accent (beauty)
- pages/Finance.tsx:880, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Des`, token: --color-accent (beauty)
- pages/Finance.tsx:898, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Sta`, token: --color-accent (beauty)
- pages/Finance.tsx:914, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Ven`, token: --color-accent (beauty)
- pages/Finance.tsx:931, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Val`, token: --color-accent (beauty)
- pages/Finance.tsx:951, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Dat`, token: --color-accent (beauty)
- pages/Finance.tsx:964, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Hor`, token: --color-accent (beauty)
- pages/Finance.tsx:980, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Ser`, token: --color-accent (beauty)
- pages/Finance.tsx:999, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Cli`, token: --color-accent (beauty)
- pages/Finance.tsx:1018, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70 font-sans font-medium' : 'text-theme-textSecondary'}`}>Pro`, token: --color-accent (beauty)
- pages/Finance.tsx:1060, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70' : 'text-theme-textSecondary'}`}>Tipo de Transação</label>`, token: --color-accent (beauty)
- pages/Finance.tsx:1078, decide: `<label className={`font-mono text-xs uppercase mb-2 block ${isBeauty ? 'text-beauty-neon/70' : 'text-theme-textSecondary'}`}>Forma de Pagamento</label`, token: --color-accent (beauty)
- pages/Login.tsx:190, decide: `${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}`, token: --color-accent (barber)
- pages/Login.tsx:214, decide: `${isBeauty ? 'bg-[#1A162A]' : 'bg-[#111111]'}`, token: não existe token equivalente
- pages/Login.tsx:217, decide: `<div className={`absolute top-0 left-0 right-0 h-[2px] ${isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40'}`} />`, token: --color-accent (beauty)
- pages/Login.tsx:225, decide: `${isBeauty ? 'text-beauty-neon/50' : 'text-accent-gold/50'}`, token: --color-accent (beauty)
- pages/Login.tsx:233, decide: `${isBeauty ? 'text-beauty-silver/40 font-sans' : 'text-[var(--color-text-muted)] font-mono'}`, token: não existe token equivalente
- pages/Login.tsx:241, decide: `${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`, token: --color-accent (beauty)
- pages/Login.tsx:270, decide: `${isBeauty ? 'text-beauty-silver/40 font-sans' : 'text-[var(--color-text-muted)] font-mono'}`, token: não existe token equivalente
- pages/ProfessionalPortfolio.tsx:64, decide: `const bgClass = isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main';`, token: --color-accent (barber)
- pages/ProfessionalPortfolio.tsx:88, decide: `<div className={`w-full h-full bg-gradient-to-br ${isBeauty ? 'from-purple-900/40' : 'from-yellow-900/20'} to-black`}></div>`, token: --color-accent (beauty)
- pages/PublicBooking.tsx:154, decide: `const accentTextOnAccent = isBeauty ? 'text-[var(--color-text)]' : 'text-[var(--color-bg)]';`, token: não existe token equivalente
- pages/QueueStatus.tsx:125, decide: `color: isBeauty ? 'text-beauty-neon' : 'text-accent-gold',`, token: --color-accent (beauty)
- pages/QueueStatus.tsx:126, decide: `bg: isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10',`, token: --color-accent (beauty)
- pages/QueueStatus.tsx:127, decide: `border: isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20',`, token: --color-accent (beauty)
- pages/QueueStatus.tsx:130, decide: `icon: <Clock className={`w-12 h-12 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'} mb-4`} />`, token: --color-accent (beauty)
- pages/QueueStatus.tsx:193, decide: `<div className={`h-full ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'} animate-pulse w-full`}></div>`, token: --color-accent (beauty)
- pages/Register.tsx:125, decide: `<div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}`}>`, token: --color-accent (barber)
- pages/Register.tsx:126, decide: `<div className={`absolute bottom-0 left-0 w-[400px] h-[400px] ${isBeauty ? 'bg-beauty-neon/[0.04]' : 'bg-accent-gold/[0.04]'} rounded-full blur-[120px`, token: --color-accent (beauty)
- pages/Register.tsx:131, decide: `<div className={`h-[2px] w-full ${isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40'}`} />`, token: --color-accent (beauty)
- pages/Register.tsx:139, decide: `<p className={`text-xs font-mono uppercase tracking-[0.1em] mt-1.5 ${isBeauty ? 'text-beauty-neon/60' : 'text-accent-gold/60'}`}>`, token: --color-accent (beauty)
- pages/Register.tsx:200, decide: `<Link to="/login" className={`font-bold transition-colors ${isBeauty ? 'text-beauty-neon/70 hover:text-beauty-neon' : 'text-accent-gold/70 hover:text-`, token: --color-accent (beauty)
- pages/Register.tsx:218, decide: `<div className={`min-h-screen flex items-center justify-center p-4 py-10 relative overflow-hidden ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}`}>`, token: --color-accent (barber)
- pages/Register.tsx:225, decide: `<div className={`relative overflow-hidden ${isBeauty`, token: não existe token equivalente
- pages/Register.tsx:229, decide: `<div className={`h-[2px] w-full ${isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40'}`} />`, token: --color-accent (beauty)
- pages/Register.tsx:232, decide: `<div className={`px-8 py-6 border-b ${isBeauty ? 'bg-beauty-card/90 backdrop-blur-xl border-[var(--color-border)]' : 'bg-[#161616] border-[var(--color`, token: --color-card / --color-bg
- pages/Register.tsx:235, decide: `<p className={`font-mono text-xs uppercase tracking-[0.1em] mt-1.5 ${isBeauty ? 'text-beauty-neon/60' : 'text-accent-gold/60'}`}>`, token: --color-accent (beauty)
- pages/Register.tsx:241, decide: `<div className={`px-8 py-8 md:px-10 ${isBeauty ? 'bg-beauty-card/80 backdrop-blur-xl' : 'bg-[#1C1C1C]'}`}>`, token: --color-card / --color-bg
- pages/Register.tsx:244, decide: `<div role="alert" className={`mb-6 p-3.5 text-xs rounded-xl border ${isBeauty ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)]/20 te`, token: não existe token equivalente
- pages/Register.tsx:375, decide: `<Link to="/login" className={`font-bold transition-colors ${isBeauty ? 'text-beauty-neon/70 hover:text-beauty-neon' : 'text-accent-gold/70 hover:text-`, token: --color-accent (beauty)
- pages/settings/ServiceSettings.tsx:201, decide: `className={`px-4 py-2 rounded-lg transition-all ${isBeauty ? 'text-beauty-neon/70 hover:text-beauty-neon hover:bg-beauty-neon/10' : 'text-theme-textSe`, token: --color-accent (beauty)
- pages/settings/ServiceSettings.tsx:207, decide: `className={`px-5 py-2.5 font-bold transition-all ${isBeauty`, token: não existe token equivalente
- pages/settings/SubscriptionSettings.tsx:153, decide: `<div className={`absolute top-4 right-[-35px] rotate-45 px-10 py-1 text-xs font-black uppercase tracking-tighter ${isBeauty ? 'bg-beauty-neon text-[va`, token: --color-accent (beauty)
- pages/settings/SubscriptionSettings.tsx:176, decide: `<Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />`, token: --color-accent (beauty)
- components/AppointmentWizard.tsx:465, decide: `<div className={`p-4 border-t ${isBeauty ? 'border-[var(--color-accent-border)] bg-[var(--color-accent-dim)]' : 'border-[var(--color-border)] bg-[var(`, token: não existe token equivalente
- components/ChatBubble.tsx:25, decide: `const borderRadius = isBeauty ? 'rounded-lg' : 'rounded-none';`, token: não existe token equivalente
- components/ChatBubble.tsx:53, decide: `<div className={`px-6 py-4 ${borderRadius} ${isBeauty ? 'bg-theme-surface border border-theme-border' : 'bg-obsidian-card border border-[var(--color-b`, token: --color-accent (barber)
- components/ChatBubble.tsx:54, decide: `<Loader2 className={`w-5 h-5 animate-spin ${isBeauty ? 'text-theme-text' : 'text-obsidian-accent opacity-50'}`} />`, token: --color-accent (barber)
- components/ChatBubble.tsx:68, decide: `<div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 flex items-center justify-center border transition-all duration-500 shadow-lg mb-2 ${isBeauty ? 'bg-`, token: não existe token equivalente
- components/ChatBubble.tsx:84, decide: `? (isBeauty ? 'bg-theme-card border border-theme-border text-theme-text rounded-2xl rounded-bl-none shadow-[var(--elevation-2)]' : 'fragment-obsidian `, token: --color-accent (barber)
- components/ChatBubble.tsx:85, decide: `: (isBeauty ? 'bg-theme-surface text-theme-text rounded-2xl rounded-br-none shadow-lg' : 'bg-accent-gold text-[var(--color-bg)] font-black border-4 bo`, token: --color-accent (barber)
- components/ChatBubble.tsx:91, decide: `? (isBeauty ? 'text-theme-text leading-relaxed font-medium' : 'text-theme-text/90 leading-relaxed font-semibold')`, token: não existe token equivalente
- components/ClientBookingCard.tsx:145, decide: `<Calendar className={`w-4 h-4 shrink-0 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- components/ClientBookingCard.tsx:151, decide: `<Clock className={`w-3 h-3 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- components/ClientBookingCard.tsx:152, decide: `<p className={`text-xs ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>`, token: não existe token equivalente
- components/ClientBookingCard.tsx:169, decide: `<p className={`text-xs uppercase tracking-wider font-medium mb-1.5 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>`, token: não existe token equivalente
- components/ClientBookingCard.tsx:185, decide: `: <span className={`text-xs ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>—</span>`, token: não existe token equivalente
- components/ClientBookingCard.tsx:193, decide: `<User className={`w-4 h-4 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />`, token: não existe token equivalente
- components/ClientBookingCard.tsx:194, decide: `<span className={`text-sm ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>`, token: não existe token equivalente
- components/Header.tsx:130, decide: `{isBeauty ? <Scissors className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}`, token: não existe token equivalente
- components/Header.tsx:233, decide: `<p className={`text-xs ${colors.textSecondary} font-mono leading-tight capitalize`}>{isBeauty ? 'Beauty Professional' : 'Barber'}</p>`, token: não existe token equivalente
- components/HelpButtons.tsx:166, decide: `<Bot className={`w-5 h-5 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />`, token: --color-accent (beauty)
- components/HelpButtons.tsx:179, decide: `? `${isBeauty ? 'bg-beauty-neon text-[var(--color-bg)]' : 'bg-accent-gold text-[var(--color-bg)]'} font-bold``, token: --color-accent (beauty)
- components/HelpButtons.tsx:200, decide: `className={`p-2 rounded-lg ${isBeauty ? 'bg-beauty-neon text-[var(--color-bg)]' : 'bg-accent-gold text-[var(--color-bg)]'} hover:opacity-90 transition`, token: --color-accent (beauty)
- components/MonthlyHistory.tsx:59, decide: `<div className={`${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}/10 border ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'}/30 rounded-lg p`, token: --color-accent (beauty)
- components/MonthlyHistory.tsx:61, decide: `<TrendingUp className={`w-5 h-5 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />`, token: --color-accent (beauty)
- components/MonthlyHistory.tsx:62, decide: `<p className={`text-xs font-mono ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'} uppercase`}>Crescimento Médio</p>`, token: --color-accent (beauty)
- components/MonthlyHistory.tsx:67, decide: `<p className={`text-sm ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'} font-mono`}>`, token: --color-accent (beauty)
- components/MonthlyHistory.tsx:120, decide: `<td className={`p-3 text-right font-mono font-bold ${month.profit >= 0 ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-[var(--color-dan`, token: --color-accent (beauty)
- components/onboarding/StepMonthlyGoal.tsx:55, decide: `<div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isBeauty ? 'bg-beauty-neon/20' : 'bg-accent-gold/20'}`}>`, token: --color-accent (beauty)
- components/onboarding/StepMonthlyGoal.tsx:56, decide: `<Target className={`w-8 h-8 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />`, token: --color-accent (beauty)
- components/onboarding/StepMonthlyGoal.tsx:78, decide: `${isBeauty ? 'rounded-xl focus:border-beauty-neon focus:shadow-[0_0_10px_rgba(167,139,250,0.2)]' : 'rounded-lg focus:border-accent-gold'}`}`, token: --color-accent (beauty)
- components/onboarding/StepMonthlyGoal.tsx:116, decide: `${isBeauty ? 'bg-beauty-neon text-black hover:bg-beauty-neon/90' : 'bg-accent-gold text-black hover:bg-accent-gold/90'}`}`, token: --color-accent (beauty)
- components/onboarding/StepSuccess.tsx:16, decide: `const accentClass = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';`, token: --color-accent (beauty)
- components/onboarding/StepSuccess.tsx:17, decide: `const accentBg = isBeauty ? 'bg-beauty-neon/20' : 'bg-accent-gold/20';`, token: --color-accent (beauty)
- components/OnboardingLayout.tsx:37, decide: `<div className={(isBeauty ? 'min-h-screen bg-beauty-dark flex flex-col' : 'min-h-screen bg-brutal-main flex flex-col') + ' relative'}>`, token: --color-accent (barber)
- components/OnboardingLayout.tsx:56, decide: `className={`h-full transition-all duration-500 ease-out ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`}`, token: --color-accent (beauty)
- components/OnboardingLayout.tsx:73, decide: `? `w-6 h-1.5 ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}``, token: --color-accent (beauty)
- components/OnboardingLayout.tsx:75, decide: `? `w-1.5 h-1.5 ${isBeauty ? 'bg-beauty-neon/60' : 'bg-accent-gold/60'}``, token: --color-accent (beauty)
- components/PaywallModal.tsx:67, decide: `<Sparkles className="w-3 h-3" /> BE {isBeauty ? 'BEAUTY' : 'BARBER'} OS <Sparkles className="w-3 h-3" />`, token: não existe token equivalente
- components/ProfessionalSelector.tsx:27, decide: `const cardBg = isBeauty ? 'bg-[var(--color-card-hover)] border border-[var(--color-border)] rounded-xl' : 'bg-[var(--color-bg)]/40 border-2 border-[va`, token: não existe token equivalente
- components/PublicBusinessHeader.tsx:72, decide: `<div className={`w-full h-full ${isBeauty`, token: não existe token equivalente
- components/PublicBusinessHeader.tsx:265, decide: `<div className={`h-px w-full bg-gradient-to-r from-transparent ${isBeauty ? 'via-beauty-neon/20' : 'via-accent-gold/20'} to-transparent`} />`, token: --color-accent (beauty)
- components/QuickActionsModal.tsx:39, decide: `${isBeauty ? 'bg-gradient-to-br from-beauty-card/95 to-beauty-dark/95 border border-[var(--color-border)] backdrop-blur-2xl' : 'bg-brutal-card/80 bord`, token: --color-accent (barber)
- components/QuickActionsModal.tsx:47, decide: `<button onClick={onClose} className={`p-2 -mr-2 rounded-full transition-colors ${isBeauty ? 'text-[var(--color-text)]/60 hover:text-[var(--color-text)`, token: não existe token equivalente
- components/QuickActionsModal.tsx:61, decide: `<div className={`p-3 rounded-2xl mb-3 ${isBeauty ? 'bg-[var(--color-accent-dim)] text-theme-accent' : 'bg-accent-gold/15 text-accent-gold'}`}>`, token: --color-accent (barber)
- components/ServiceModal.tsx:211, decide: `className={`whitespace-nowrap px-3 py-1.5 text-xs text-[var(--color-text)] transition-all flex items-center gap-2 rounded-xl ${isBeauty`, token: não existe token equivalente
- components/UpsellSection.tsx:29, decide: `const cardBg = isBeauty ? 'bg-[var(--color-card-hover)] border border-[var(--color-border)] rounded-xl' : 'bg-[var(--color-bg)]/40 border-2 border-[va`, token: não existe token equivalente

## 7 — O que o ratchet já conta

Arquivo de regras: `scripts/check-design-debt.mjs`

| Regra | Definição (arquivo:linha) | Baseline total (soma por arquivo) |
|---|---|---|
| fonte-sub-12px (use text-xs) | scripts/check-design-debt.mjs:21 | 0 (soma baseline) |
| text-white hardcoded (use colors.text) | scripts/check-design-debt.mjs:22 | 192 (soma baseline) |
| text-neutral hardcoded (use colors.textSecondary/textMuted) | scripts/check-design-debt.mjs:23 | 181 (soma baseline) |
| modal custom fixed inset-0 (use ui/Modal) | scripts/check-design-debt.mjs:24 | 21 (soma baseline) |
| shadow generico (use tokens shadow-*, MASTER.md §8) | scripts/check-design-debt.mjs:25 | 44 (soma baseline) |
| hover interpolado (quebra no build estatico) | scripts/check-design-debt.mjs:26 | 0 (soma baseline) |
| wa.me com DDI fixo (use buildWhatsAppLink) | scripts/check-design-debt.mjs:27 | 0 (soma baseline) |

Baseline por arquivo (limite máximo por regra+arquivo em `scripts/design-debt-baseline.json`):

- components/AddAuditEntryModal.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/AIAssistantChat.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 2
- components/AISemanticInsights.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 6
- components/AISemanticInsights.tsx — text-white hardcoded (use colors.text): baseline 1
- components/appointment/AppointmentReview.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/appointment/AppointmentReview.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 14
- components/appointment/AppointmentReview.tsx — text-white hardcoded (use colors.text): baseline 10
- components/appointment/CategoryFilter.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 2
- components/appointment/CategoryFilter.tsx — text-white hardcoded (use colors.text): baseline 2
- components/appointment/ClientSelection.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 4
- components/appointment/ClientSelection.tsx — text-white hardcoded (use colors.text): baseline 3
- components/appointment/ScheduleSelection.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 4
- components/appointment/ScheduleSelection.tsx — text-white hardcoded (use colors.text): baseline 10
- components/appointment/ServiceList.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 7
- components/appointment/ServiceList.tsx — text-white hardcoded (use colors.text): baseline 7
- components/appointment/ServiceSearchBar.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 5
- components/appointment/ServiceSearchBar.tsx — text-white hardcoded (use colors.text): baseline 3
- components/AppointmentEditModal.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/AppointmentWizard.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/AppointmentWizard.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 3
- components/booking/BookingModeToggle.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 2
- components/BrandIdentitySection.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/BrandIdentitySection.tsx — text-white hardcoded (use colors.text): baseline 1
- components/BugAnnotateModal.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/BugReportMenu.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/BugReportModal.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/BusinessGalleryManager.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 3
- components/BusinessGalleryManager.tsx — text-white hardcoded (use colors.text): baseline 3
- components/ChatBubble.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 3
- components/ClientWhatsAppFAB.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 3
- components/DevBugButton.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/DevBugButton.tsx — text-white hardcoded (use colors.text): baseline 1
- components/Header.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/HelpButtons.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/HelpButtons.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/HelpButtons.tsx — text-white hardcoded (use colors.text): baseline 7
- components/membership/PixActions.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 1
- components/membership/PixDisplay.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 1
- components/MonthlyHistory.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 1
- components/MonthlyHistory.tsx — text-white hardcoded (use colors.text): baseline 4
- components/MonthYearSelector.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 1
- components/MonthYearSelector.tsx — text-white hardcoded (use colors.text): baseline 3
- components/MoreOptionsDrawer.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/MoreOptionsDrawer.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/onboarding/ActivationBanner.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 2
- components/onboarding/ActivationBanner.tsx — text-white hardcoded (use colors.text): baseline 4
- components/onboarding/StandaloneWizardPointer.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 2
- components/onboarding/StandaloneWizardPointer.tsx — text-white hardcoded (use colors.text): baseline 2
- components/onboarding/StepBusinessHours.tsx — text-white hardcoded (use colors.text): baseline 1
- components/onboarding/StepBusinessInfo.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 1
- components/onboarding/StepMonthlyGoal.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 8
- components/onboarding/StepMonthlyGoal.tsx — text-white hardcoded (use colors.text): baseline 2
- components/onboarding/StepServices.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/onboarding/StepSuccess.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 3
- components/onboarding/StepSuccess.tsx — text-white hardcoded (use colors.text): baseline 2
- components/onboarding/StepTeam.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 7
- components/onboarding/StepTeam.tsx — text-white hardcoded (use colors.text): baseline 2
- components/onboarding/WizardEngine.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 2
- components/onboarding/WizardEngine.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/onboarding/WizardOverlay.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/OnboardingLayout.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/OnboardingLayout.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 2
- components/OnboardingLayout.tsx — text-white hardcoded (use colors.text): baseline 1
- components/PhoneInput.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/PhoneInput.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 1
- components/PhoneInput.tsx — text-white hardcoded (use colors.text): baseline 1
- components/ProfessionalCommissionDetails.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 2
- components/ProfessionalSelector.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 7
- components/ProfessionalSelector.tsx — text-white hardcoded (use colors.text): baseline 5
- components/ProfileModal.tsx — text-white hardcoded (use colors.text): baseline 1
- components/PublicBusinessHeader.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 3
- components/PublicBusinessHeader.tsx — text-white hardcoded (use colors.text): baseline 4
- components/QuickActionsModal.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/QuickActionsModal.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 2
- components/QuickActionsModal.tsx — text-white hardcoded (use colors.text): baseline 5
- components/SaveFooter.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/SaveFooter.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 2
- components/Screw.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/SearchableSelect.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/SearchableSelect.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 5
- components/SearchableSelect.tsx — text-white hardcoded (use colors.text): baseline 5
- components/security/TwoFactorSetup.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 4
- components/security/TwoFactorSetup.tsx — text-white hardcoded (use colors.text): baseline 4
- components/ServiceModal.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/ServiceModal.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/ServiceModal.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 1
- components/ServiceModal.tsx — text-white hardcoded (use colors.text): baseline 2
- components/SettingsLayout.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/Sidebar.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/TabNav.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 1
- components/TabNav.tsx — text-white hardcoded (use colors.text): baseline 1
- components/TeamMemberForm.tsx — text-white hardcoded (use colors.text): baseline 1
- components/TimeGrid.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- components/TrialBanner.tsx — text-white hardcoded (use colors.text): baseline 2
- components/ui/Modal.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- components/UpsellSection.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 4
- components/UpsellSection.tsx — text-white hardcoded (use colors.text): baseline 2
- pages/Agenda.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 1
- pages/Agenda.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- pages/ClientArea.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 4
- pages/ClientCRM.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- pages/ClientCRM.tsx — text-white hardcoded (use colors.text): baseline 11
- pages/ClubDemo.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 12
- pages/ClubDemo.tsx — text-white hardcoded (use colors.text): baseline 11
- pages/Finance.tsx — text-white hardcoded (use colors.text): baseline 9
- pages/ForgotPassword.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 5
- pages/ForgotPassword.tsx — text-white hardcoded (use colors.text): baseline 5
- pages/JoinClub.tsx — text-white hardcoded (use colors.text): baseline 1
- pages/Login.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 4
- pages/Login.tsx — text-white hardcoded (use colors.text): baseline 14
- pages/MembersList.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 2
- pages/Placeholder.tsx — text-white hardcoded (use colors.text): baseline 1
- pages/ProfessionalPortfolio.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 5
- pages/ProfessionalPortfolio.tsx — text-white hardcoded (use colors.text): baseline 4
- pages/PublicBooking.tsx — modal custom fixed inset-0 (use ui/Modal): baseline 4
- pages/PublicBooking.tsx — text-white hardcoded (use colors.text): baseline 1
- pages/QueueJoin.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 3
- pages/QueueJoin.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 15
- pages/QueueJoin.tsx — text-white hardcoded (use colors.text): baseline 7
- pages/QueueStatus.tsx — shadow generico (use tokens shadow-*, MASTER.md §8): baseline 1
- pages/QueueStatus.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 7
- pages/QueueStatus.tsx — text-white hardcoded (use colors.text): baseline 5
- pages/Register.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 9
- pages/Register.tsx — text-white hardcoded (use colors.text): baseline 4
- pages/settings/MembershipPlansSettings.tsx — text-white hardcoded (use colors.text): baseline 2
- pages/settings/ServiceSettings.tsx — text-white hardcoded (use colors.text): baseline 3
- pages/StaffInsights.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 16
- pages/StaffInsights.tsx — text-white hardcoded (use colors.text): baseline 7
- pages/UpdatePassword.tsx — text-neutral hardcoded (use colors.textSecondary/textMuted): baseline 6
- pages/UpdatePassword.tsx — text-white hardcoded (use colors.text): baseline 5

## 8 — Bridge !important no index.html e overrides globais

- index.html:63-68, sobrescreve: THEME OVERRIDES BRIDGE (DUAL MODE) — text-white, text-neutral-*, motivo: Mapeia classes hardcoded de Dark Mode para cores Light Mode quando data-mode=light; evita refatorar 50+ arquivos (comentário index.html:63-67)
- index.html:74-79, sobrescreve: border-neutral-800/700, border-white/10/5 → rgba divider, motivo: bridge light mode
- index.html:82-91, sobrescreve: bg-neutral-900/800, hover:bg-neutral-800, hover:bg-white/5/10, motivo: bridge light mode — cards e superfícies
- index.html:94-106, sobrescreve: bg-brutal-*, bg-obsidian-*, bg-beauty-*, motivo: bridge light mode — temas barber/beauty
- index.html:109-116, sobrescreve: input.bg-neutral-800, .bg-black/20, motivo: bridge light mode — inputs
- index.html:119-122, sobrescreve: input::placeholder, textarea::placeholder, motivo: bridge light mode — placeholder
- index.html:127-175, sobrescreve: BRIDGE ESTENDIDA fase 2 — bg-black, bg-neutral-950, bg-beauty-dark/*, bg-brutal-main/*, bg-black/*, stone/zinc, motivo: cobre cores não mapeadas na fase 1 (comentário index.html:124)
- index.html:188-195, sobrescreve: hover:bg-black/*, hover:bg-neutral-900/700, stone/zinc hover, motivo: bridge light mode — hover states
- index.html:198-208, sobrescreve: border-black/*, stone/zinc/neutral borders, motivo: bridge light mode — bordas
- index.html:211-218, sobrescreve: text-neutral/stone/zinc 100/200, motivo: bridge light mode — texto claro → texto principal escuro
- index.html:221-224, sobrescreve: bg-brutal-card-elevated, bg-beauty-elevated, motivo: bridge light mode — cards elevados
- index.html:227-231, sobrescreve: ring-white/10/5, ring-black/10, motivo: bridge light mode — ring foco
- index.html:234-250, sobrescreve: gradientes from-black, from-neutral-900/950, to-*, motivo: bridge light mode — neutralizar gradientes escuros
- index.html:253-261, sobrescreve: data-public-theme obsidian/silk background + color, motivo: Previne flash branco/escuro na rota pública — aplicado ANTES do React montar (comentário index.html:252)
- index.html:265-272, sobrescreve: body.public-booking-root, .beauty-theme, motivo: Classes aplicadas via JS no useEffect do PublicBooking (comentário index.html:264)
- index.html:278-328, sobrescreve: OVERRIDE HARD-CODED DARK COLORS barber dark — bg-white/*, bg-neutral-900/800/950, hover:bg-neutral-*, motivo: Ajuste fino de opacidades white overlay e neutrals para barber dark (comentário index.html:277)
- index.html:331-338, sobrescreve: .shadow-brutal*, .bg-card, .text-muted (consomem tokens), motivo: Utilitárias dual-mode (não override de dívida)
- index.html:472-475, sobrescreve: ::placeholder color/opacity, motivo: Placeholder styling — never confuse with actual text (comentário index.html:471)
- index.html:792-829, sobrescreve: @media (prefers-reduced-motion: reduce) — animation/transition none, motivo: DS Lock §2 / UI-027: disable entrance animations (comentário index.html:793)
- styles/tailwind.css:189-196, sobrescreve: border-color default rgba(255,255,255,0.1) em *, motivo: Compat v3 — border/divide sem cor explícita eram gray-200 no CDN v3 (comentário styles/tailwind.css:186-188)
- styles/tailwind.css:159-161, sobrescreve: .text-text-primary/secondary/muted com hex legado (#EAEAEA, #A0A0A0, #525252), motivo: Paleta legada text-text-* — dívida documentada (comentário styles/tailwind.css:155-157)

---

## Resumo

- Contagem total hardcoded por categoria:
  - Cores hex / rgb / rgba / hsl: 73
  - Cores utilitárias Tailwind (paleta padrão): 102
  - Tamanhos de fonte arbitrários: 3
  - Espaçamentos arbitrários: 3
  - Raios: 6
  - Sombras: 92
  - Larguras de borda arbitrárias: 1
  - z-[N] arbitrário: 23
- Total geral: 303
- Top 5 arquivos com mais dívida:
  - hooks/useAppTour.ts — 26
  - hooks/useThemeTokens.ts — 17
  - hooks/useContentCalendar.ts — 16
  - hooks/useBrutalTheme.ts — 13
  - pages/QueueJoin.tsx — 12
- Lacunas não determinadas:
  1. Token equivalente para valores rgba/hsl arbitrários — mapeamento parcial apenas para hex canônicos
  2. Usos de tokens em arquivos fora de pages/components/contexts/hooks (ex.: lib/, index.html) contabilizados em Seção 1 mas não em Seção 4
  3. Tokens legados em styles/tailwind.css @theme não incluídos em Seção 1 (fonte única declarada: design-system/tokens.css)
