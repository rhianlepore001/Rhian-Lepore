# Findings — Microcopy & Tom B2B

Auditor: ui-copy-auditor

---

### ALTO-001: Vocabulário de erro técnico exposto
- **Severidade:** ALTO
- **Evidência:** `pages/Agenda.tsx:439` — `` `Erro ao concluir agendamento: ${message}` ``; `components/ProfessionalCommissionDetails.tsx:204` — alert com error.message
- **Problema:** Mensagens Supabase/JS chegam ao usuário final
- **Impacto:** Dono não-técnico perde confiança ("Row level security" etc.)
- **Fix:** Mapa de erros → copy humana: "Não foi possível concluir. Verifique sua conexão e tente de novo."
- **Esforço:** Médio

### ALTO-002: CTAs inconsistentes para mesma ação
- **Severidade:** ALTO
- **Evidência:** Clients: `'Cadastrando...'` / `'Cadastrar'`; outros forms: `'Salvar'`, `'Confirmar'`, `'Continuar'`
- **Problema:** Sem vocabulário de ação primária unificado
- **Impacto:** Hesitação em fluxos repetitivos
- **Fix:** DS copy: criar=`Adicionar`, editar=`Salvar alterações`, destruir=`Excluir`, fluxo=`Continuar`
- **Esforço:** Baixo

### MÉDIO-003: Títulos uppercase genéricos
- **Severidade:** MÉDIO
- **Evidência:** `pages/Dashboard.tsx:266` — `"Avisos do Sistema"` uppercase text-xs; padrão em vários widgets
- **Problema:** Tom de admin panel genérico, não salão/barbearia
- **Impacto:** Frio demais para persona empreendedora
- **Fix:** Sentence case: "Avisos importantes" / "Seu dia"
- **Esforço:** Baixo

### MÉDIO-004: Login hardcoded dark — copy de categoria ok, contexto light ausente
- **Severidade:** MÉDIO
- **Evidência:** `pages/Login.tsx:97-132` — cards barber/beauty com copy visual forte; não adapta tom por data-mode
- **Problema:** Escolha de segmento antes do login é clara; pós-login light não reflete escolha
- **Impacto:** Discontinuidade narrativa barber dourado vs beauty roxo
- **Fix:** Manter copy segmento; reforçar identidade via tokens, não texto
- **Esforço:** Baixo

### MÉDIO-005: Empty state Clients sem orientação
- **Severidade:** MÉDIO
- **Evidência:** `pages/Clients.tsx:234` — `"Nenhum cliente ainda."`
- **Problema:** Não diz por quê importa nem próximo passo
- **Impacto:** CRM parece vazio/inútil no dia 1
- **Fix:** "Seus clientes aparecem aqui. Cadastre o primeiro ou importe da agenda."
- **Esforço:** Baixo

### MÉDIO-006: Mistura PT informal e termos EN
- **Severidade:** MÉDIO
- **Evidência:** `pages/Dashboard.tsx:202` — `"Ticket medio"` sem acento; labels "Insights", "Setup" em `SetupCopilot`
- **Problema:** PT-BR inconsistente com anglicismos de produto
- **Impacto:** Mercado BR percebe como tradução parcial
- **Fix:** Guia de voz: PT-BR; EN só para termos de mercado consagrados (CRM ok, Setup → "Configuração inicial")
- **Esforço:** Baixo

### BAIXO-007: index.html title genérico
- **Severidade:** BAIXO
- **Evidência:** `index.html:9` — `"Sistema de Gestão"`
- **Problema:** Aba do browser não reforça marca AgendiX
- **Impacto:** Profissionalismo em multitasking
- **Fix:** "AgendiX — Gestão do seu salão"
- **Esforço:** Baixo
