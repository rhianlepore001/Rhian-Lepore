# PLAN-mvp-analise - Análise Estratégica & Próximos Passos (MVP)

> **Status:** ✅ Planejado | **Responsável:** Project Planner Agent | **Data:** 16/02/2026

## 1. Análise "Sem Filtro" (Opinião Profissional)

Você perguntou se "estamos inventando". Minha resposta técnica e de mercado é: **Não. Estamos sobrevivendo.**

### O Cenário
Lançar um "agendador" em 2026 é suicídio comercial para um solofounder. Existem 50 opções gratuitas.
O que fizemos (Pivotar para **"Gerador de Lucro"**) é a **ÚNICA** chance real de cobrar R$ 97,00+ por mês.

### O Verdito do MVP Atual
- **O que está bom:** O visual (Dashboard) vende a promessa. O cliente vê "Lucro Recuperado" e entende o valor na hora.
- **O Risco (A "Invenção"):** Estamos mostrando números que *ainda não existem* (Mock Data). O risco não é a ideia, é a execução técnica. Se o cliente clicar em "Recuperar" e nada acontecer, a confiança morre.
- **Corte de Escopo:** Esqueça "IA Avançada" agora. O MVP não precisa de inteligência artificial, precisa de **Automação Burra** (ex: Se > 30 dias sem visita -> Mandar Zap). Funciona igual e custa zero de desenvolvimento complexo.

---

## 2. Gap Analysis (O que falta para ser real?)

Hoje temos uma **Casca de Ferrari com motor de Fusca de brinquedo**.

| Funcionalidade Visual (Frontend) | Status Backend (Realidade) | O que fazer AGORA? |
| :--- | :--- | :--- |
| **Card "Lucro Recuperado"** | ❌ Mockado (Falso) | Criar tabela `recovery_actions` para somar valor real. |
| **Botão "Recuperar Cliente"** | ❌ `console.log` | Gerar link `wa.me/?text=Volta...` com dados do cliente. |
| **Lista "Oportunidades"** | ❌ Mockado | Query SQL: `SELECT * FROM appointments WHERE date < NOW() - 30 days`. |
| **Gráfico de Meta** | ✅ Parcial | Conectar com a tabela `profiles.monthly_goal`. |

---

## 3. Roadmap "Pé no Chão" (Próximas 24h de Dev)

Para transformar essa "ideia" em "produto vendável", precisamos sair do mock.

### Passo 1: O Motor de Recuperação (Backend) - PRIORITY ZERO 🔴
Não adianta ter dashboard bonito se o dado é falso.
- [ ] Criar tabela simples no Supabase para rastrear "Última Visita".
- [ ] Criar RPC function `get_lost_clients()` que retorna quem não vem há 30, 45, 60 dias.

### Passo 2: A "Arma" do Cliente (WhatsApp Link) 🟡
- [ ] No card "Oportunidade", o botão deve abrir o WhatsApp Web/App com a mensagem JÁ ESCRITA.
- [ ] **Sem API paga agora.** Use o link nativo do WhatsApp (`wa.me`). É grátis e funciona para MVP.

### Passo 3: O "Caixa" (Pricing Lock) 🟢
- [ ] Implementar a lógica: "Você já recuperou 3 clientes de graça. Quer recuperar mais 50? Assine o PRO."
- [ ] Isso valida se eles pagam pelo resultado.

---

## 4. Conclusão

Estamos no caminho certo de **Negócio**. Agora precisamos ser rigorosos na **Engenharia**.
Pare de desenhar telas novas. Vamos fazer o botão "Recuperar" funcionar de verdade.

**Recomendação Imediata:** Aprovar a **Fase 3** do `task.md` e focar 100% em Backend/Supabase agora.
