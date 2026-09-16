# Crítica visual — AgendiX

Preencha **depois** de `npm run visual:critique`. Olhe os PNGs em `artifacts/visual-critique/`, não só o código.

| Campo | Valor |
|---|---|
| Data | |
| Base URL | |
| Commit | |
| Auth | storageState / credenciais env / só público |
| Viewports | desktop 1280×800 · mobile 390×844 |
| PNGs | `artifacts/visual-critique/{desktop,mobile}/` |
| MANIFEST | `artifacts/visual-critique/MANIFEST.json` |

Produto: SaaS de gestão para barbearias e salões (BR+PT). HashRouter (`/#/rota`). Temas `barber` (dark industrial) e `beauty` (claro elegante). Trial **real: 20 dias** — não sugerir mudar o prazo.

Não construa landing de marketing nesta crítica. Não commite PNGs (podem ter PII). Não invente feature que o produto não tem.

---

## Score 1–10

1 = amador/quebrado · 5 = SaaS funcional de dev · 8 = parece desenhado · 10 = Linear/Stripe no rigor, Fresha/Booksy no ofício.

| Superfície | PNG | Nota | Uma frase |
|---|---|---|---|
| Login / gateway | `login-gateway`, `login-form` | /10 | |
| Landing `/` | `landing` ou SKIPPED | /10 ou n/a | |
| Book público | `book` ou SKIPPED | /10 ou n/a | |
| Agenda | `agenda` ou SKIPPED | /10 ou n/a | |
| CRM (`/#/clientes`) | `crm` ou SKIPPED | /10 ou n/a | |
| Financeiro | `financeiro` ou SKIPPED | /10 ou n/a | |
| Clube | `clube` ou SKIPPED | /10 ou n/a | |
| Fila | `fila` ou SKIPPED | /10 ou n/a | |
| **Média** | | **/10** | |

---

## Blockers (P0)

Tela que não funciona, dado errado, PII vazando entre tenants, contraste ilegível, copy em inglês em superfície pública, claim falso de trial/feature.

- [ ] Nenhum P0
- P0: *(rota · PNG · o que quebra · evidência)*

---

## AI-slop

Marque o que **aparece nos PNGs**. Cada sim vira achado com PNG.

| Check | Desktop | Mobile | Evidência (arquivo PNG) |
|---|---|---|---|
| Hero genérico / Unsplash óbvio / stock de barbeiro | | | |
| Gradiente decorativo sem função | | | |
| Cards idênticos (ícone + título + 2 linhas) | | | |
| Copy lorem, placeholder, "em breve", inglês leftover | | | |
| Emoji enfeite ou ícone sem propósito | | | |
| "IA" / "smart" / "powered by" sem substância visível | | | |
| Layout 1–3px torto, raios/sombras misturados | | | |
| Paleta fora dos tokens (cinza frio no barber, neon leftover) | | | |
| Empty state que só informa e não oferece ação | | | |
| Dashboard genérico (4 KPIs iguais, sparkline clichê) | | | |

Anti-referências do produto (`PRODUCT.md`): planilha Excel com cor; dashboard SaaS genérico; glassmorphism de enfeite; tema light lavado; booking que força conversa.

---

## Honestidade de claims

Fonte da verdade: trial = **20 dias** (`constants.ts` `TRIAL_DAYS`, `pages/Login.tsx` "Criar conta — 20 dias grátis", `AuthContext`, `pages/Legal.tsx`). **Não alterar o prazo.** Feature prometida tem que existir na UI capturada.

Cole aqui as linhas de `artifacts/visual-critique/claims.json` (gerado na captura) e confronte:

| Claim na UI | Onde (PNG / rota) | Verdade no produto? | Veredito |
|---|---|---|---|
| 20 dias grátis | login-gateway / landing | sim, 20 dias | ok / inflado / falso |
| 14 dias / outro prazo | | | |
| Lista de features (agenda, fila, CRM, financeiro, clube, IA) | | cada uma existe de verdade? | |
| "O sistema que trabalha enquanto você atende" | gateway | entrega isso na 1ª tela logada? | |

Regras:

- "14 dias" ou "10 dias" contra config de 20 = **claim falso**.
- Feature no marketing/gateway que some no produto logado = **desonesto**.
- IA é pós-MVP: vender IA na captura pública sem a feature na jornada = **desonesto**.

---

## Achados

Para cada um: severidade P0/P1/P2/P3 · superfície · viewport · PNG · o que o olho vê · por que parece amador · correção em 1 linha. Sem adjetivo solto ("feio") sem evidência.

### P0
-

### P1
-

### P2
-

### P3
-

---

## Mobile 390×844 (prioritário)

O barbeiro usa o celular entre um corte e outro. Olhe `mobile/*.png`:

- [ ] Info crítica visível sem scroll
- [ ] Thumb zone (ação primária na metade inferior)
- [ ] Bottom nav não cobre CTA
- [ ] Sidebar de desktop **não** aparece no mobile (bug conhecido em MEMORY.md)
- [ ] Modal vira sheet; inputs não escondem o teclado
- [ ] Alvos ≥ 44×44

---

## O que pular / o que não fazer

- Não construir a landing de marketing.
- Não mudar trial de 20 dias.
- Não commitar `artifacts/visual-critique/` nem storageState (`e2e/.auth/`).
- Telas autenticadas SKIPPED sem `DEMO_*` / `E2E_OWNER_*` / storageState: registre o gap; não invente o layout de memória.

Próximo passo depois desta folha: issues/PRs de UI com evidência PNG, ou a varredura longa em `docs/ux-pro/SUPER-PROMPT.md` se o problema for sistêmico.
