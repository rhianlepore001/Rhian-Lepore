# Varredura Impeccable + Playwright — AgendiX

**Branch:** `cursor/impeccable-e2e-sweep-4706`  
**Data:** 2026-08-05  
**Método:** 4 sub-agentes Composer (cores, copy, layout, bugs) + forense Playwright (owner/staff/público × mobile 390 / desktop 1440)  
**Critérios:** skill Impeccable (heurísticas Nielsen, anti-slop, touch ≥44, tokens DS) + PRODUCT.md / DESIGN.md

---

## Evidência visual BEFORE (produção)

Capturas em `/opt/cursor/artifacts/impeccable-sweep/BEFORE/`.

| Sintoma | Tela | Severidade |
|---|---|---|
| Ícone `+` empilhado sobre “Profissional” no CTA | Equipe mobile | P0 |
| FAB `w-full` esmagando labels Clientes/Financeiro | Dashboard/Agenda mobile | P0 |
| “Agenda de hoje” vazando sob a bottom nav | Dashboard mobile | P1 |
| Tabs de settings cortadas + fade agressivo | Settings rail | P1 |
| `%` ícone + `0%` = aparência “% 0%”; label “Master” | TeamMemberCard | P1 |
| Input + “Salvar Dia” em row sem wrap | Comissões | P1 |
| Alvos &lt;44px no header (voltar, perfil, ajuda) | Chrome global | P0/P1 |

---

## Síntese dos sub-agentes

| Agente | Achados | Destaque |
|---|---:|---|
| Cores hardcoded | 210 em 55 arquivos | Login/Register/Queue; prop `beauty-neon`/`accent-gold` |
| Microcopy/jargão | 36 + 14 overflow | Erros Supabase crus; 2FA/TOTP/webhook; CTAs longos |
| Layout/botões | 24 | Header &lt;44; Button truncate; FAB; Agenda dias apertados |
| Bugs funcionais | 22 | Saves que mentem (perfil/slug/meta); Finance silencioso |

---

## Correções desta PR (escopo focado, evidência visual)

1. `components/ui/Button.tsx` — truncate não engole ícone+texto  
2. `pages/settings/TeamSettings.tsx` — CTA via `icon=`; label humano  
3. `components/BottomMobileNav.tsx` — FAB `shrink-0` (remove `w-full`); labels legíveis; `on-accent`  
4. `components/Layout.tsx` — `pb-36` quando nav móvel ativa  
5. `components/SettingsLayout.tsx` — tabs `min-h-[44px]`, fade bilateral, voltar 44px  
6. `components/TeamMemberCard.tsx` — remove `%` duplicado e “Master”  
7. `components/Header.tsx` + `BugReportButton.tsx` — hit areas ≥44px; copy pt-BR  
8. `pages/settings/CommissionsSettings.tsx` — stack mobile no dia de acerto  

---

## Backlog (não nesta PR)

- Tokenizar Login/Register/QueueJoin (HC P0)  
- Substituir `alert`/`confirm` por ConfirmModal/toast  
- Erros de rede com ErrorState (Finance, PublicLinkCard, ProfileModal)  
- Agenda: CTAs `py-1.5` e grade de dias &lt;44  
- Prop `accentColor` legado → `useBrutalTheme()`  

---

## Como reproduzir

```bash
# BEFORE (produção)
node --env-file=.env.local scripts/impeccable-forensic-sweep.mjs before https://rhian-lepore.vercel.app

# AFTER (local com esta branch)
npm run dev
node --env-file=.env.local scripts/impeccable-forensic-sweep.mjs after http://localhost:3000
```
