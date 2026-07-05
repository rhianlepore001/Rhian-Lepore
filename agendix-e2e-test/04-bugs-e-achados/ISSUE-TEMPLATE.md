# Issue Card — Template de Achado

**Use pra CADA achado dos relatórios parciais e do consolidado.** Um arquivo por achado, nomeado `ISSUE-NNN-*.md`, salvo em `04-bugs-e-achados/`.

---

```markdown
# ISSUE-NNN: [título curto do achado]

**Severidade**: 🔴 P0 | 🟠 P1 | 🟡 P2 | 🟢 P3
**Lente(s)**: [UI visual | copy | fluxo | design system] (pode ser mais de 1)
**Frente(s)**: [dono-onboarding | colaborador-dashboard | cliente-final | e2e-jornada]
**Tela(s)/rota(s)**: [lista de rotas e/ou componentes]
**Arquivo(s)**: [caminho:linha quando aplicável]

## Contexto
[1-2 frases explicando o que é a tela/fluxo e por que esse achado importa]

## Comportamento atual
[Descrição do que tá acontecendo agora — seja bug funcional, visual ruim, copy errada, etc.]

## Comportamento esperado
[O que deveria acontecer. Se for bug funcional, cite o requisito. Se for cosmético, cite o padrão que deveria seguir.]

## Evidência
- Screenshot/vídeo: `assets/ISSUE-NNN-*.png` (ou .mp4)
- Comando/exploit: [se for bug reproduzível, como reproduzir]
- Citação de código: [arquivo:linha]
- Citação de copy: ["texto exato que tá errado"]

## Persona impactada
[Dono | Colaborador mobile | Cliente final] — qual mais sente

## Sugestão de fix
[1-2 frases. Sem código pronto — só direção. Se for simples, pode sugerir a linha de código, mas não o PR inteiro.]

## Esforço estimado
[XS = 1-2h | S = meio dia | M = 1 dia | L = 2-3 dias | XL = 1 sprint]

## Risco de regressão
[Baixo | Médio | Alto] — com justificativa de 1 linha

## Dependências
- [Outros achados/sprints que precisam ser resolvidos antes]
- [Bloqueios externos (Stripe, Supabase, design system)]

## Cross-ref
- Achado similar na auditoria 20260610: [link ou "N/A — novo"]
- Achado similar em concorrente: [link ou "N/A — só nosso"]

## Status
- [ ] Reportado
- [ ] Validado por humano
- [ ] Em sprint
- [ ] Em PR
- [ ] Em produção
- [ ] Verificado pós-deploy

## Histórico
- YYYY-MM-DD: reportado por [agente]
- YYYY-MM-DD: validado por [humano]
- YYYY-MM-DD: adicionado à sprint N
```

---

## Como usar

1. Quando um agente gera um achado no relatório parcial, ele preenche este template.
2. O orquestrador pega esses ISSUE-NNN.md e cruza com os outros.
3. Quando você aprova um achado pra sprint, ele vai pro diretório da sprint como TASK-NNN.
4. Quando o dev termina, marca todos os status.

## Numeração

Use 3 dígitos (001, 002, ...). Sequencial por ordem de descoberta. Não reusar número.
