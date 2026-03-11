# Mapa de Rotas — Test Coverage

## Rotas Públicas (9)
| Rota | Componente | Prioridade |
|------|-----------|-----------|
| `#/login` | Login | P0 |
| `#/register` | Register | P0 |
| `#/forgot-password` | ForgotPassword | P1 |
| `#/update-password` | UpdatePassword | P1 |
| `#/book/:slug` | PublicBooking | P0 |
| `#/queue/:slug` | QueueJoin | P1 |
| `#/queue-status/:id` | QueueStatus | P1 |
| `#/pro/:slug` | ProfessionalPortfolio | P2 |
| `#/minha-area/:slug` | ClientArea | P2 |

## Rotas Autenticadas (17+)
| Rota | Componente | Acesso | Prioridade |
|------|-----------|--------|-----------|
| `#/` | Dashboard | All | P0 |
| `#/agenda` | Agenda | All | P0 |
| `#/clientes` | Clients | All | P0 |
| `#/clientes/:id` | ClientCRM | All | P1 |
| `#/financeiro` | Finance | All | P0 |
| `#/marketing` | Marketing | Owner | P1 |
| `#/insights` | Reports | Owner | P1 |
| `#/fila` | QueueManagement | Owner | P1 |
| `#/onboarding` | OnboardingWizard | Auth | P0 |
| `#/configuracoes/geral` | GeneralSettings | Owner | P1 |
| `#/configuracoes/agendamento` | PublicBookingSettings | Owner | P1 |
| `#/configuracoes/equipe` | TeamSettings | Owner | P1 |
| `#/configuracoes/servicos` | ServiceSettings | All | P1 |
| `#/configuracoes/comissoes` | CommissionsSettings | Owner | P2 |
| `#/configuracoes/assinatura` | SubscriptionSettings | Owner | P2 |
| `#/configuracoes/auditoria` | AuditLogs | Owner | P2 |
| `#/configuracoes/lixeira` | RecycleBin | Owner | P2 |
| `#/configuracoes/seguranca` | SecuritySettings | Owner | P2 |
| `#/configuracoes/erros` | SystemLogs | Owner | P2 |

## Modais (13)
| Modal | Trigger | Prioridade |
|-------|---------|-----------|
| AppointmentEditModal | Agenda click | P0 |
| ServiceModal | Settings → Serviços | P0 |
| ClientAuthModal | Public booking | P1 |
| CampaignModal | Marketing | P1 |
| QuickActionsModal | Dashboard | P1 |
| ProfileModal | User menu | P1 |
| PaywallModal | Tier limit | P2 |
| AllAppointmentsModal | Dashboard | P2 |
| GoalSettingsModal | Dashboard | P2 |
| GoalHistoryModal | Dashboard | P2 |
| MonthlyProfitModal | Finance | P2 |
| AIOSStrategyModal | Dashboard | P2 |
| Modal (generic) | Various | P2 |

## Prioridade
- **P0**: Fluxos críticos de negócio (testar primeiro)
- **P1**: Funcionalidades importantes (testar em seguida)
- **P2**: Features secundárias (testar por último)
