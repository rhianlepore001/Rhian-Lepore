# SPEC — Dual Mode Theme (Dark / Light)

> Feature slug: `dual-mode-theme`
> Escopo: Large
> Autor: Antigravity (via TLC skill)
> Data: 2026-04-26

---

## Contexto

O sistema AgendiX possui dois temas de identidade visual:
- **Barber**: brutalista, escuro, dourado
- **Beauty**: elegante, roxo profundo, lavanda

Atualmente ambos operam apenas em **modo escuro**. A infraestrutura CSS de Dual Mode foi parcialmente construída nesta sessão:
- Variáveis CSS no `index.html` com `data-theme` e `data-mode` para os 4 estados
- `useDynamicBranding.ts` já injeta `data-theme` e lê `agendix_color_mode` do localStorage

**O que falta:** o usuário não tem como trocar o modo — não existe toggle, contexto React de tema, nem persistência funcional completa.

---

## Objetivo

Permitir que o usuário alterne entre **Dark Mode** e **Light Mode** dentro do seu tema de identidade (Barber ou Beauty), com persistência no LocalStorage e aplicação imediata sem re-render pesado.

---

## Requisitos

### Funcionais

| ID | Requisito |
|---|---|
| R-01 | O usuário pode alternar entre Dark e Light Mode a partir do Header (mobile e desktop) |
| R-02 | A preferência é salva em `localStorage` com chave `agendix_color_mode` |
| R-03 | Na recarga da página, o modo é restaurado antes do React montar (sem flash) |
| R-04 | O tema visual (barber/beauty) não muda — apenas a variante clara/escura |
| R-05 | A troca de modo deve ser instantânea (≤ 16ms) sem re-render da árvore de componentes |
| R-06 | Em telas autenticadas, o modo é respeitado para os dois temas (Barber Dark, Barber Light, Beauty Dark, Beauty Light) |
| R-07 | Em telas públicas (booking), o modo NÃO é aplicado — essas telas têm tema próprio |

### Não-funcionais

| ID | Requisito |
|---|---|
| R-08 | Zero flash de tema na carga (FOUC prevention via script inline no `<head>`) |
| R-09 | A cor do `<meta name="theme-color">` (barra de status do Android/iOS PWA) deve refletir o modo ativo |
| R-10 | A animação de troca deve usar `transition` CSS existente (já definido no `body`) |

### Fora de escopo

- Toggle por componente individual (ex: um card em modo escuro dentro de página clara)
- Preferência sincronizada entre abas (BroadcastChannel)
- Detecção automática da preferência do sistema (`prefers-color-scheme`) — será uma fase futura

---

## Comportamento esperado por cenário

| Cenário | Comportamento |
|---|---|
| Usuário Barber, primeiro acesso | `data-mode="dark"` (padrão) |
| Usuário Beauty, primeiro acesso | `data-mode="dark"` (padrão) |
| Usuário clica toggle → Light | `data-mode="light"` + salva no localStorage |
| Usuário recarrega | Modo restaurado antes do React montar |
| Usuário faz logout | Modo persiste no localStorage (preferência pessoal) |
| Usuário acessa rota `/booking/*` | Modo ignorado — tema público via `data-public-theme` |

---

## Paletas dos 4 estados (já implementadas em index.html)

| Estado | Fundo | Destaque | Texto Principal |
|---|---|---|---|
| `barber` + `dark` | `#121212` | `#C29B40` (ouro) | `#EAEAEA` |
| `barber` + `light` | `#F5F1E8` (kraft) | `#A07A2A` (ouro escuro) | `#1A1A1A` |
| `beauty` + `dark` | `#1F1B2E` (roxo profundo) | `#A78BFA` (lavanda) | `#EAEAEA` |
| `beauty` + `light` | `#F7F5FF` (lilás pálido) | `#7C3AED` (violeta) | `#1A1225` |

---

## Decisões de Design

### D-TM-001: Onde fica o toggle?
**Decisão**: No `Header`, ao lado dos ícones de notificação, visível em mobile e desktop.
**Motivo**: Acessível em qualquer tela sem abrir menus. Padrão usado por apps como Linear, Notion, GitHub.

### D-TM-002: Ícone do toggle
**Decisão**: Ícone de sol (Light) / lua (Dark), animado com rotação suave (CSS transition).
**Motivo**: Padrão universal compreendido sem legenda.

### D-TM-003: Onde o estado de tema vive no React?
**Decisão**: Context React leve (`ThemeContext`) que **apenas** lê/escreve localStorage e muta o atributo do DOM. **Não** armazena estado em `useState` que causaria re-render.
**Motivo**: R-05 (≤ 16ms). Manipulação direta do DOM é O(1).

### D-TM-004: Anti-FOUC (Flash Of Unstyled Content)
**Decisão**: Script inline no `<head>` do `index.html` (antes do React carregar) que lê localStorage e seta `data-mode` no `<html>`.
**Motivo**: R-08. CSS já está pronto via variáveis — só precisa do atributo correto antes do paint.

---

## Arquitetura de Implementação

```
index.html
  └── <script> inline: lê localStorage → seta data-mode no <html>  [anti-FOUC]

contexts/ThemeContext.tsx       [NOVO]
  └── ThemeProvider + useTheme hook
  └── toggleMode(): muta data-mode no DOM + salva localStorage

hooks/useDynamicBranding.ts     [JÁ ATUALIZADO]
  └── já lê agendix_color_mode e seta data-mode

components/Header.tsx           [MODIFICAR]
  └── ThemeModeToggle button
```

---

## Critérios de Aceitação

- [ ] Acessar o app como Barber → fundo `#121212` (dark padrão)
- [ ] Clicar toggle → fundo muda para `#F5F1E8` instantaneamente
- [ ] Recarregar página → permanece em `#F5F1E8`
- [ ] Acessar como Beauty Dark → fundo `#1F1B2E`
- [ ] Clicar toggle Beauty → fundo muda para `#F7F5FF`
- [ ] Acessar `/booking/*` → fundo correto do tema público (não afetado)
- [ ] PWA: barra de status do Android reflete a cor do modo ativo
