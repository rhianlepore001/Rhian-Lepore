# Comparativo de Mercado — 2026

> **Fontes**: comparativo do Barbeiro.app, comparativo do Reservio, comparativo do SMARTMAN, sites oficiais de cada plataforma, App Store e Google Play reviews.
>
> **Cobertura**: AppBarber (detalhado em `01-appbarber.md`), Trinks, Booksy, Simples Agenda (antigo Gendo), Barbeiro.app, Reservio, SMARTMAN, Anolla (PT).

---

## Tabela resumo (matriz de features)

| Feature | Agendix | AppBarber | Trinks | Booksy | Simples Agenda | Barbeiro.app | Reservio |
|---|---|---|---|---|---|---|---|
| **Agendamento on-line 24h** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Agendamento por WhatsApp** | ❌ | parcial | parcial | parcial | ✅ | ✅ (todos os planos) | ❌ |
| **Marketplace de clientes** | ❌ | ❌ | ✅ (forte BR) | ✅ (internacional) | limitado | ❌ | ❌ |
| **Plano gratuito funcional** | ❌ | ❌ (só trial) | ❌ | ❌ | ❌ | ✅ (único) | ✅ (sem limite de tempo) |
| **Gestão de comissões** | ✅ (precisa auditar) | ✅ | ✅ robusto | básico | básico | ✅ flexível | básico |
| **Clube de assinatura pro cliente** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Programa de fidelidade** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | básico |
| **Lista de espera (fila)** | ✅ | ✅ | ✅ | ✅ | básico | ✅ | ✅ |
| **Pagamento on-line** | parcial (PIX) | ✅ | ✅ | ✅ | básico | ✅ | ✅ |
| **Pesquisa de satisfação (NPS)** | ❌ (não tem tabela) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Controle de estoque** | ❌ | ✅ | ✅ | básico | ❌ | ✅ | básico |
| **Relatórios financeiros** | ✅ | ✅ completos | ✅ completos | intermediário | básico | ✅ completos | básico |
| **White-label / app próprio** | ❌ | ✅ (vende) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Módulo fiscal (NF-e)** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Multi-unidade (rede)** | ❌ | parcial | ✅ | ✅ | ❌ | parcial | ✅ |
| **Multi-idioma (PT-PT)** | parcial | ❌ | ❌ | parcial (EN) | ❌ | ❌ | ✅ |
| **IA / insights** | ❌ | ❌ | básico | básico | ❌ | ❌ | básico |

---

## Quem é quem (perfis-alvo)

| Plataforma | Persona primária | Persona secundária | Mercado |
|---|---|---|---|
| **AppBarber** | Dono de barbearia brasileira (1-15 profs) | Profissional PF (MEI) | BR |
| **Trinks** | Dono de salão/barbearia established (5+ profs) | Franquia / multi-unidade | BR |
| **Booksy** | Dono que quer expor pra cliente internacional | Barbearia em região turística | Global |
| **Simples Agenda** | Barbeiro solo / MEI | Barbearia pequena (1-2 profs) | BR |
| **Barbeiro.app** | Dono de barbearia que quer preço baixo + clube | Barbearia que aposta em recorrência | BR |
| **Reservio** | Salão pequeno/médio generalista | Studio (manicure, lash, estética) | Global/BR |
| **SMARTMAN** | Barbeiro iniciante que quer simplicidade | Barbearia de bairro | BR |
| **Anolla** | Salão PT com operação complexa | Rede pequena | PT |

---

## Posicionamento do AgendiX (matriz competitiva)

**Onde o AgendiX está hoje** (visão do `PRODUCT.md` + `DECISIONS.md`):
- Temas: barber (dark industrial) + beauty (light elegante) → **diferencial forte** (maioria tem 1 tema só)
- Premium acessível, personalidade "elegante, confiável, eficiente"
- Multi-tenant + RLS → **fundação sólida**
- Sem marketplace (decisão) → **não compete com Trinks/Booksy por aquisição**
- Sem plano gratuito (com plano gratuito 10 dias) → **decisão de monetização agressiva**
- Sem clube de assinatura pro cliente (em produção) → **gap vs Barbeiro.app** (a desenvolver)

**Onde Agendix **ganha** no papel (vs concorrentes)**:
- Tema duplo (barber + beauty) com consistência cross-tema
- Copy 100% pt-BR sem "potencialize" genérico
- Mobile-first real (não só responsive)

**Onde Agendix **perde** no papel (vs concorrentes)**:
- Sem marketplace (perde aquisição; Trinks/Booksy ganham)
- Sem clube de assinatura em produção (perde recorrência; Barbeiro.app tem)
- Plano gratuito só 10 dias (Barbeiro.app e Reservio têm free permanente — perdem funil de entrada longo)
- Sem WhatsApp nativo (perde canal nº 1 do BR)
- Sem NPS (perde feedback loop)

---

## Implicações pra auditoria

Quando o agente 01/02/03/04/06 rodarem, eles devem **cruzar achados com o que os concorrentes têm**. Exemplos:

- **Agente 06 (domínio)**: se achar que o dono deveria ter "comissão configurável por serviço" (que o Barbeiro.app tem), é P1.
- **Agente 03 (fluxo)**: se o onboarding do Agendix for mais longo que AppBarber (que tem 30 dias grátis), é P1.
- **Agente 02 (copy)**: se aparecer "Schedule" (em inglês) no app, é P0 — concorrente nenhum faz isso.
- **Agente 04 (design system)**: se o tema dual não for consistente cross-tema, é P1 (o PRODUCT.md promete isso como princípio).
- **Agente 01 (UI visual)**: se o app do cliente for visualmente igual ao do dono (mesma complexidade), é P1 — público é outro.

---

## Próximos passos do comparativo

- [ ] Auditar **preço do Agendix** (Stripe checkout) vs tabela acima — qual a proposta de valor monetária?
- [ ] Auditar **onboarding do Agendix** vs trial de 30 dias do AppBarber — qual converte melhor?
- [ ] Auditar **LGPD** do Agendix — exclusão de conta em 1 clique (diferencial vs AppBarber que tem 3 reclamações de 3 anos)
- [ ] Auditar **WhatsApp** — Agendix tem? (vi que tem `useSmartRebooking` e `useSmartNotifications`, mas não sei se é via WhatsApp)
- [ ] Auditar **NPS** — o que Agendix usa? Tabela `nps_responses` não existe, mas pode estar embutida em outro lugar
- [ ] Auditar **clube de assinatura** — feature existe em código?
