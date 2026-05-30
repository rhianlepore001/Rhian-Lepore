# Fase 7 - Dashboard

## Objetivo

Consolidar o servico e os hooks de dashboard no paradigma alvo, garantindo que os KPIs e estatisticas consumam types Zod, services puras e hooks TanStack Query com cache e invalidacao consistentes.

## Entregue previamente (antes desta fase)

O dashboard ja estava parcialmente migrado:

- `types/dashboard.ts` com schemas Zod canonicos (`dashboardStatsSchema`, `dataMaturitySchema`, `profitMetricsDataSchema`, `financialDoctorDataSchema`, `actionItemSchema`, `dashboardAppointmentSchema`, `goalHistoryItemSchema`)
- `services/dashboard.ts` com funcoes puras chamando Supabase e fazendo parse Zod na saida
- `hooks/useDashboardData.ts` com TanStack Query (`useQuery`, `useMutation`) e chaves estaveis `['dashboard', ...]`
- `hooks/useMeuDiaData.ts` com TanStack Query para agenda do dia por profissional

## Status

O dashboard ja estava migrado no paradigma alvo. Nenhuma mudanca em tipo, service ou hook foi necessaria.

## Criterios Reversa cobertos

- BR-MIGRAR-056: Data Maturity Score via RPC documentada e consumida no service

## Pendencias de validacao real

- Confirmar que KPIs e estatisticas carregam corretamente em staging
- Validar performance (< 2s desktop) nas telas de Dashboard e Meu Dia