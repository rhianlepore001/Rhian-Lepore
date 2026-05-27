# ADR-001 — Autenticação via Supabase Auth (descartando Clerk)

> Status: Aceito
> Data: 2026-05-06 (retroativo — commit `302c4d6`)
> Confiança: 🟢 Confirmado

## Contexto

O projeto inicialmente considerou a migração para Clerk como provedor de autenticação, mas a decisão foi revertida.

## Decisão

Manter **Supabase Auth** como único provedor de autenticação. A migração para Clerk foi descartada e documentada.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Clerk** | UI de login pronta, MFA built-in, gestão de sessões robusta | Custo adicional, dependência externa, necessidade de sincronização de usuários com Supabase |
| **Supabase Auth** (escolhido) | Gratuito no tier inicial, integração nativa com PostgreSQL/RLS, Edge Functions no mesmo ecossistema | UI de login customizada necessária, MFA requer implementação manual |

## Consequências

- **Positivas:** RLS funciona nativamente com `auth.uid()`, sem sincronização de IDs. Menor complexidade de infraestrutura.
- **Negativas:** Time investiu em implementar MFA manual (TOTP), reset de senha customizado e rate limiting próprio.
- **Riscos:** Vendor lock-in no ecossistema Supabase, mas mitigado pela natureza open-source do projeto.

---

# ADR-002 — HashRouter em vez de BrowserRouter

> Status: Aceito
> Data: 2026-05-06 (retroativo — inferido de AGENTS.md e App.tsx)
> Confiança: 🟢 Confirmado

## Contexto

A aplicação é uma SPA deployada em hospedagem estática (Vercel/Netlify). Rotas tradicionais (`/rota`) exigiriam configuração de rewrite rules no servidor.

## Decisão

Usar **HashRouter** (`/#/rota`) para todas as rotas da aplicação.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **BrowserRouter** | URLs limpas, melhor para SEO | Requer redirect rules no servidor, problemas com refresh em deploy estático |
| **HashRouter** (escolhido) | Funciona em qualquer hospedagem estática sem configuração de servidor | URLs com `#`, pior para SEO (aceitável para SPA interna) |

## Consequências

- **Positivas:** Deploy simplificado. Nenhuma configuração de servidor necessária. Links de compartilhamento funcionam imediatamente.
- **Negativas:** URLs menos amigáveis. Dificuldade de integração com analytics baseados em path. Public booking links usam hash.
- **Restrição:** Todos os links internos DEVEM usar `/#/rota`, nunca `/rota`.

---

# ADR-003 — Dual-Mode Theme (Barber vs Beauty)

> Status: Aceito
> Data: 2026-05-06 (retroativo — commits `df9735c`, `142e7ab`)
> Confiança: 🟢 Confirmado

## Contexto

O produto inicialmente era focado em barbearias, mas expandiu para salões de beleza. Cada segmento tem identidade visual distinta (tons de ouro/preto vs tons de roxo/neon).

## Decisão

Implementar **dual-mode theme** onde `user_type` (`'barber'` | `'beauty'`) determina todo o design system: cores, tipografia, ícones e linguagem.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Temas separados** (dois apps) | UX totalmente customizada por segmento | Duplicação de código, manutenção dobrada |
| **Tema único customizável** | Flexibilidade total para o usuário | Complexidade de configuração, decisão por paralisia |
| **Dual-mode** (escolhido) | Duas experiências distintas com código compartilhado | Risco de condicionais espalhadas pelo código |

## Consequências

- **Positivas:** Código compartilhado reduz manutenção. Dois produtos visuais distintos com um codebase.
- **Negativas:** Props `isBeauty`/`forceTheme` espalhadas por ~40% dos componentes. Risco de inconsistência visual.
- **Mitigação:** Tokens centralizados em `useBrutalTheme()` e `DesignSystemProvider`. Audit de design system realizado (commit `c043c0e`).

---

# ADR-004 — Checkout de Atendimento com Taxa de Maquininha

> Status: Aceito
> Data: 2026-05-06 (retrativo — commits `d6bc212` a `c9112cb`)
> Confiança: 🟢 Confirmado

## Contexto

O sistema inicial não registrava forma de pagamento nem taxas de maquininha no momento do checkout. Profissionais precisavam calcular comissões manualmente.

## Decisão

Adicionar schema de checkout com campos: `payment_method`, `received_by`, `machine_fee_applied`, `machine_fee_percent`, `machine_fee_amount`. Criar RPC `complete_appointment` v2.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Registro manual em notas** | Simples | Sem rastreabilidade, sem relatórios |
| **Integração com POS externo** | Recursos avançados de pagamento | Dependência de hardware/software terceiro |
| **Checkout interno** (escolhido) | Dados estruturados, comissões automáticas, relatórios por método de pagamento | Complexidade adicional no schema e UI |

## Consequências

- **Positivas:** Comissões calculadas automaticamente com desconto da taxa de maquininha. Relatórios por método de pagamento (Pix, dinheiro, cartão).
- **Negativas:** Schema mais complexo. Várias versões da RPC (`complete_appointment` v1→v2) indicam evolução rápida e possível dívida técnica.
- **Risco:** Configuração de taxa é por estabelecimento (`business_settings`), não por transação — se o usuário mudar a taxa, histórico não é afetado (bom).

---

# ADR-005 — Sistema de Fila Digital com QR Code

> Status: Aceito
> Data: 2026-05-06 (retroativo — inferido de QueueManagement.tsx e QueueJoin.tsx)
> Confiança: 🟢 Confirmado

## Contexto

Clientes sem agendamento préximo chegam ao estabelecimento e precisam aguardar atendimento. Sistema precisa funcionar em tempo real e ser acessível via celular.

## Decisão

Implementar **fila digital** com QR code gerado por profissional (ou geral). Cliente escaneia, preenche nome/telefone e entra na fila. Owner gerencia status em tempo real.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Fila física (senha de papel)** | Zero tecnologia | Desorganização, sem dados para CRM |
| **Agendamento obrigatório** | Previsibilidade total | Perda de clientes walk-in |
| **Fila digital** (escolhido) | Dados capturados automaticamente, integração com CRM, tempo de espera estimado | Requer celular do cliente, depende de conectividade |

## Consequências

- **Positivas:** Todo cliente da fila vira lead no CRM. Atendimentos finalizados geram `appointments` + `finance_records` automaticamente.
- **Negativas:** Estado da fila é volátil (filtrado por dia). Se o owner não finalizar corretamente, dados podem se perder.
- **Nota:** QR code é gerado via API externa (`api.qrserver.com`), não localmente.

---

# ADR-006 — Staff Herda Dados do Owner (Anti-Flicker Pattern)

> Status: Aceito
> Data: 2026-05-06 (retroativo — commits `36347c3`, `e6b77a2`)
> Confiança: 🟢 Confirmado

## Contexto

Staff logando no sistema via convite do owner. Inicialmente, o `userType` do staff era definido a partir do próprio perfil, causando flicker de tema (alternância barber/beauty) até que os dados do owner fossem carregados.

## Decisão

Staff **herda** `user_type`, `business_name` e `subscription_status` do owner em **chamada única** durante o fetch do perfil. O `userType` do próprio staff nunca é setado no estado global.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Cada staff define seu próprio tema** | Personalização | Inconsistência de marca, flicker resolvido mas problema novo |
| **Herança com múltiplas chamadas** | Código mais simples | Flicker de tema visível ao usuário |
| **Herança com chamada única** (escolhido) | Zero flicker, identidade visual consistente | Acoplamento forte entre perfis de owner e staff |

## Consequências

- **Positivas:** UX fluida. Tema correto desde o primeiro render.
- **Negativas:** Se o owner mudar de barbearia para salão, todos os staff herdam imediatamente — pode ser desejado ou não.
- **Risco:** Fallback complexo (`if ownerProfile else fallback`) indica edge case não totalmente resolvido.

---

# ADR-007 — Rate Limiting no Login via RPC (Token Bucket)

> Status: Aceito
> Data: 2026-05-06 (retroativo — AuthContext.tsx)
> Confiança: 🟢 Confirmado

## Contexto

Sistema de autenticação exposto na internet. Necessidade de proteção contra brute force sem bloquear usuários legítimos em caso de falha do sistema de rate limiting.

## Decisão

Implementar rate limiting **server-side** via RPC `check_login_rate_limit` com abordagem **token bucket**. Em caso de falha da RPC, o sistema permite o login (fail open).

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Rate limiting client-side** | Simples | Fácil de burlar |
| **Supabase built-in rate limiting** | Nativo, confiável | Não configurável por regras de negócio |
| **RPC customizado** (escolhido) | Controle total sobre mensagens, thresholds, bloqueio temporário | Requer manutenção da função, fail open pode ser explorado |

## Consequências

- **Positivas:** Mensagem amigável em português. Threshold configurável no banco.
- **Negativas:** Fail open significa que se a RPC falhar (ex: rede instável), atacante pode continuar tentando.
- **Nota:** Mensagem hardcoded de "1 minuto" — threshold fixo no frontend, pode divergir do backend.

---

# ADR-008 — Semantic Memory RAG com Gemini Embeddings

> Status: Aceito
> Data: 2026-05-06 (retroativo — Scout summary ai-assistant)
> Confiança: 🟢 Confirmado

## Contexto

Assistente de IA precisa de contexto histórico sobre clientes e estabelecimento para respostas personalizadas. Simples chat history não é suficiente para memória de longo prazo.

## Decisão

Implementar **RAG (Retrieval-Augmented Generation)** com embeddings 768d via `text-embedding-004` (Gemini). Similaridade com threshold 0.92. Tabela `client_memories` com vetores pgvector.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Chat history completo** | Simples | Custo alto de tokens, context window limitado |
| **Resumo periódico (summary)** | Eficiente em tokens | Perda de detalhes, latência para gerar resumos |
| **RAG com embeddings** (escolhido) | Busca semântica precisa, memória persistente, escalável | Complexidade de infraestrutura (pgvector), custo de embedding API |

## Consequências

- **Positivas:** Respostas contextualizadas por cliente. Memória persistente entre sessões.
- **Negativas:** Dependência de Gemini API. 6+ migrações SQL indicam evolução complexa do schema vetorial.
- **Risco:** Threshold 0.92 pode ser muito rígido para algumas consultas. Não há fallback documentado para quando RAG retorna vazio.

---

# ADR-009 — Guided Onboarding com Driver.js

> Status: Aceito
> Data: 2026-05-06 (retroativo — Scout summary onboarding)
> Confiança: 🟢 Confirmado

## Contexto

Usuários novos (barbeiros/beauty profissionais) muitas vezes não são técnicos. O wizard de 5 passos não é suficiente para mostrar onde encontrar funcionalidades após o setup.

## Decisão

Implementar **SetupCopilot** pós-wizard usando `driver.js` para spotlight em elementos específicos da UI. Progresso rastreado em `sessionStorage`. 6 milestones fixos.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Vídeo tutorial** | Rica em informação | Produção cara, usuários pulam |
| **Tooltips estáticos** | Simples | Fácil de ignorar, não guia passo a passo |
| **Guided tour interativo** (escolhido) | Contextual, na própria UI, progresso salvo | Dependência de `driver.js`, IDs de elementos podem quebrar com refatoração |

## Consequências

- **Positivas:** Onboarding contínuo após wizard. Usuário aprende usando o sistema real.
- **Negativas:** `sessionStorage` é volátil — se o usuário fechar o navegador, progresso do tour é perdido (mas milestones do wizard persistem no banco).
- **Risco:** IDs de elementos (`btn-add-service`, etc.) são hardcoded. Refatoração de componentes pode quebrar o tour.

---

# ADR-010 — Data Maturity Score Progressivo

> Status: Aceito
> Data: 2026-05-06 (retroativo — useDashboardData.ts)
> Confiança: 🟢 Confirmado

## Contexto

Dashboard mostra recomendações e banners contextuais baseados no estágio do negócio. Um usuário com 0 agendamentos não deve ver analytics avançados.

## Decisão

Implementar **Data Maturity Score** (0-100) calculado no backend via RPC `get_dashboard_stats`. Baseado em: total de agendamentos, agendamentos no mês, atendimentos completados, bookings públicos ativos, dias desde o registro.

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Mostrar tudo sempre** | Simples | Overwhelm para novos usuários, UI poluída |
| **Feature flags manuais** | Controle granular | Requer configuração ativa do usuário |
| **Score progressivo** (escolhido) | Adaptativo, guia natural de descoberta | Fórmula opaca, usuário não sabe como aumentar o score |

## Consequências

- **Positivas:** UI adaptativa. Novos usuários veem apenas o essencial. Usuários avançados veem insights completos.
- **Negativas:** Fórmula de cálculo não é transparente para o usuário. Pode parecer arbitrário.
- **Nota:** Score é usado para mostrar/ocultar banners e recomendações, não para bloquear funcionalidades.

---

*Fim dos ADRs retroativos.*
