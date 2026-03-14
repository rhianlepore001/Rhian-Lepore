# PROJECT_MEMORY.md

## 2026-03-14 (Parte 2) — Infraestrutura: Migração RAG 2.0 para OpenRouter
- **Evento**: Transição do provedor de embeddings de Google Gemini nativo para OpenRouter.
- **O que foi feito**:
  1. Modificação do `indexer.py` para utilizar a API do OpenRouter (`google/gemini-embedding-001`).
  2. Substituição do SDK `google.generativeai` por chamadas HTTP `requests` para maior flexibilidade.
  3. Manutenção da compatibilidade de 768 dimensões para preservar a integridade do banco de dados vetorial no Supabase.
  4. Atualização de requisitos e variáveis de ambiente no `SKILL.md` (uso de `OPENROUTER_API_KEY`).
- **Motivo**: Permitir o uso de chaves do OpenRouter conforme solicitado pelo usuário, mantendo a estrutura robusta do sistema.
- **Status**: Implementado e configurado.
- **Próximo Foco**: Validar sincronização manual `/sync-memory` com a nova chave.

## 2026-03-14 — Fix: Integridade e Fuso Horário na Edição de Agendamentos
- **Evento**: Correção de bugs no fluxo de edição ("pulo" de horário e duplicação).
- **O que foi feito**:
  1. Implementação da RPC `get_booking_by_id` para busca segura de reservas pendentes/confirmadas.
  2. Adição da coluna `original_appointment_time` na tabela `public_bookings` para servir como âncora de edição.
  3. **Identidade do Problema de Fuso Horário**: Identificado desvio de +3h entre usuários em Portugal e estabelecimentos no Brasil.
  4. **Decisão do Usuário**: A pedido do usuário, a correção de fuso horário via parsing manual foi **descartada** e revertida. O sistema mantém o fuso horário geográfico real (comportamento padrão do navegador `new Date()`) para o ambiente de testes.
  5. **Integridade de Dados**: O Agenda.tsx agora usa `original_appointment_time` para atualizar o agendamento correto, prevenindo duplicatas ao salvar edições.
- **Status**: Concluído e Sincronizado.
- **Arquivos Chave**: `pages/PublicBooking.tsx`, `pages/Agenda.tsx`, `utils/date.ts` (revertido).

## 2026-03-12 — Refactoring: Edição de Agendamentos Online
- **Evento**: Conclusão da melhoria do fluxo de edição de agendamentos pelo cliente na plataforma pública.
- **O que foi feito**:
  1. Suporte completo para edição de data, serviço ou ambos na `PublicBooking.tsx`.
  2. Implementação das etapas de diálogo `edit_options` e `edit_confirm`.
  3. Adição da configuração `allow_client_rescheduling` lida do backend que controla o botão Editar na `ClientArea.tsx`.
  4. Adaptação fluída do `handleSubmit` não gerando mais IDs novos.
- **Status**: Concluído e testado. Type-check e Lint (PASS).
- **Próximo Foco**: UX review / Marketing (depende do request do usuário).
- **Arquivos Chave**: `pages/PublicBooking.tsx`, `pages/ClientArea.tsx`, `components/ClientBookingCard.tsx`

## 2026-03-06 — Fix RPCs Públicas (Public Booking)
- **Evento**: Correção de 3 RPCs quebrando o fluxo de agendamento público
- **O que foi feito**:
  1. GRANT `anon` para `get_public_client_by_phone(UUID, TEXT)` — resolvia 404
  2. GRANT `anon` para `get_active_booking_by_phone(TEXT, UUID)` — resolvia 404
  3. Recriação de `get_client_bookings_history` com cast `p_business_id::TEXT` — resolvia 400 (coluna `business_id` em `public_bookings` é TEXT, não UUID)
- **Descoberta importante**: `public_bookings.business_id` é TEXT, `public_bookings.service_ids` é UUID[].
- **Status**: Migrações aplicadas e GRANTs verificados via Supabase MCP.
- **Próximo Foco**: Teste manual no navegador para validar o fluxo completo.
- **Arquivos Chave**: `supabase/migrations/20260306_fix_public_rpc_grants.sql`

## 2026-03-04 — Refatoração Área Pública e Área de Membros
- **Evento**: Conclusão da US-014 (Melhorias no Public Booking e Client Area)
- **O que foi feito**:
  1. Execução manual automatizada via Supabase MCP da RPC `get_client_bookings_history` para popular o histórico do cliente.
  2. Implementação do CTA de WhatsApp no agendamento (`ClientBookingCard.tsx`) para status "pending".
  3. Transformação do link "Ver Minha Área" em um CTA destacado na finalização do agendamento de chat (`PublicBooking.tsx`).
  4. Melhoria UX Geral do Contact Form: Movido de dentro da bolha do chat para um Bottom Sheet Fixo Overlay.
  5. Correção do erro "Estabelecimento não encontrado" (filtragem `business_slug`).
  6. Correção de falha silenciosa no `PublicBooking.tsx` onde a ausência de retorno da query de agendamento não lançava erro e resultava em tela branca.
  7. Correção de URLs de CTA na área do cliente (de `/book/:slug` para `/booking/:slug`) e a adição do botão de "Novo Agendamento" global na dashboard.
- **Status**: Concluído e testado. Type-check com erro residual pré-existente (BrutalCard).
- **Próximo Foco**: Ficar à disposição para novas tarefas de agendamento ou financeiro.
## 2026-03-04 — Insights Avançados (Reports.tsx)
- **Evento**: Finalização da página de Insights/Relatórios
- **O que foi feito**:
  1. Criada migração `supabase/migrations/20260304_client_insights_rpc.sql` com RPC `get_client_insights`
  2. `pages/Reports.tsx` atualizado: 4º KPI (Taxa de Retenção), gráfico de Crescimento de Clientes (AreaChart 6 meses), lista Top Clientes do Mês
  3. Chamadas paralelas via `Promise.all([get_dashboard_insights, get_client_insights])`
  4. Story US-015 marcada como `deleted` (era AIOS session report, não frontend)
- **Status**: Completo. Lint PASS. TypeScript error pré-existente em BrutalCard.test.tsx (não relacionado)
- **Próximo Foco**: Rodar migração no Supabase e testar visualmente

## 2026-03-02 (Parte 3)
- **Evento**: Relatório de Sessão Inicial (Análise + IA).
- **O que foi feito**: 
  1. Identificação de débito técnico e sujeira de versão (54 arquivos untracked, repositórios de agentes redundantes). 
  2. Commita-se a limpeza de higiene (`chore: repository hygiene and agent consolidation`).
  3. Migração dos scripts de debug e diagnóstico do BD feitos em PowerShell (`fase1_diagnostico.ps1`, `fase2_*.ps1`) para scripts Node.js (`diagnose-db.js`, `debug-finance-data.js`, `debug-test-months.js`) dentro de `.aiox-core/scripts/`.
- **Status**: Insights #1 e #2 do Relatório de Sessão Aplicados (Limpeza do Git e padronização da Automação Node). 
- **Próximo Foco**: (Insight #3) Pareamento do desenvolvimento das lógicas de finanças com Testes QA (TestSprite).
- **Arquivos Chave**: `.aiox-core/scripts/diagnose-db.js`, `scripts/*`.
