# Landing Anchor — AgendiX Interactive Experience

**Status:** assets visuais gerados e comprimidos; aguardando validação visual do dono antes do uso público e da implementação
**Criado:** 2026-08-18
**Atualizado:** 2026-08-26
**Fontes:** `research/pesquisa_mercado_agendix.md` (coleta 18/08/2026) + inventário visual de `research/*.jpg|png`

---

## 1. Veredito crítico da pesquisa (o que é confiável)

- **Bloco A (concorrentes):** confiável — URLs específicas, dados verificáveis. Usar como base de padrões e gaps.
- **Bloco B (referências premium):** confiável nas diretrizes técnicas (vídeo leve, `muted loop playsinline`, poster estático, sem scroll-jacking). Alinhado com a SPEC.
- **Bloco C (YouTube):** **frágil** — URLs genéricas (youtube.com sem ID de vídeo) e canais não verificáveis. As frases são plausíveis e boas como **inspiração de tom de copy**, mas **nunca** citar na landing como depoimento real. Regra: Bloco C alimenta headlines/FAQ por ressonância, não por citação.

## 2. O que a pesquisa muda na copy da landing (cruzamento com o produto real)

Gaps que nenhum concorrente ocupa e o AgendiX **entrega de verdade** (verificar antes de publicar):

1. **Pix direto no bolso do profissional, zero intermediação** (Clube de Assinatura — SPEC-clube-assinatura-mvp1). Contra-ataque direto ao modelo Fresha (20% no 1º agendamento) e à dor "plataforma segura meu dinheiro 30 dias".
2. **Cliente agenda pelo link sem baixar app** (`/#/book/:slug` já existe). Dor real: "cliente idoso desiste de baixar aplicativo".
3. **Fila digital + venda de balcão no celular** (`/#/queue/:slug`, `pages/Products.tsx`). Nenhum concorrente BR comunica isso.
4. **Área do cliente com a marca do estabelecimento** (`ClientArea` já consome tema). Contra "parecer diretório de terceiros".
5. **Sem cobrança por profissional adicional** (se confirmado no pricing real) — contra Booksy (US$ 20/profissional) e a dor "o sistema vira meu sócio".

**Comparativo de trials do mercado (para posicionar os nossos 20 dias):** Trinks 5d · Fresha 7d · Booksy/ModoGestor 14d · Vagaro 30d. **20 dias é forte e comunicável**: "Mais que o dobro do Trinks, sem pedir cartão." (validar claims comparativos antes de publicar — usar só se juridicamente seguro).

## 3. Inventário de assets existentes em `research/`

| Arquivo | Veredito | Uso |
|---|---|---|
| `vip_subscription_club_*.jpg` | ✅ Aprovado | Feature card do Clube de Assinatura nas duas trilhas |
| `hero_app_barber_*.jpg` | ⚠️ Referência de clima | NÃO usar direto (texto de tela com erros de IA, verde fora do DS) |
| `barber_in_action_*.jpg` | ⚠️ Referência de casting/clima | NÃO usar direto (celular com UI em inglês, "10.90 AM") |
| `salon_owner_dashboard_*.jpg` | ❌ Reprovado (substituído pela v2) | Tablet exibia marca errada ("EGLECCA FLOW") |
| `reception_pos_pix_*.jpg` | ❌ Reprovado (substituído pela v2) | Marcas de terceiros visíveis (Uppercut, Reuzel, American Crew) |
| `agendix_ref_beauty_salon_owner_v2.png` | ⚠️ Pendente validação do dono | Regenerada via Higgsfield (GPT Image 2, 7 créditos): dona de salão + tablet com glow violeta abstrato, **sem texto/marca**, paleta DS beauty. Substitui `salon_owner_dashboard` |
| `agendix_ref_barber_counter_pix_v2.png` | ⚠️ Pendente validação do dono | Regenerada via Higgsfield (GPT Image 2, 7 créditos): balcão barber + tablet com glow dourado de confirmação, **produtos genéricos sem marca**, paleta DS barber. Substitui `reception_pos_pix` |
| `agendix_real_*.png` / `agendix_beauty_*.png` | ✅ Validar e usar | Screenshots/mockups do produto — base dos overlays de UI na landing. **Validar visualmente 1 a 1 antes de publicar** (UI mostrada = UI real) |

**Nota (23 Ago 2026):** as 2 imagens v2 foram geradas com prompt travado (sem texto, sem logos, sem marcas de terceiros, paletas do DS), mas ainda não foram inspecionadas visualmente — IA pode introduzir artefatos. Validar antes de qualquer uso público. Créditos Higgsfield restantes após as imagens: 56 (de 70).

### Captura final estratégica — modo claro

Conjunto reduzido escolhido para orientar a landing, em vez de usar toda a coleção de prints:

`e2e/screenshots/landing-refs/light-beauty-strategic/`

- `desktop-dashboard.png` / `mobile-dashboard.png` — hierarquia do painel, agenda e CTA principal.
- `desktop-financeiro.png` / `mobile-financeiro.png` — KPIs de receita, despesas, lucro e meios de pagamento.
- `desktop-comissoes.png` / `mobile-comissoes.png` — configuração de acerto mensal e comissão por profissional.
- `desktop-fila-digital.png` / `mobile-fila-digital.png` — fila em tempo real, estados vazios e QR Code.

**Uso:** referência de composição e base para overlays/screen recordings reais. Os prints estão em modo claro e tema beauty para manter uma família visual consistente. Não publicar diretamente: exibem nomes da conta de teste e valores em euro; antes da landing, anonimizar dados e usar conteúdo demonstrativo aprovado. Estados vazios são referência de UI, não prova de produto.

## 4. Decisão profissional: formato dos vídeos (LP ≠ anúncio)

A pesquisa propôs 3 vídeos de 15-30s com narração e cenas de dor. **Formato errado para landing page.** Na LP, o padrão vencedor (Linear/Booksy/Fresha/Stripe — Bloco B) é:

- **Loop de atmosfera 4-6s**, `muted loop playsinline preload="none"`, **sem texto gerado por IA**, **sem rosto em close**, **sem marcas de terceiros**, câmera lenta (slow push-in/orbit), composição centrada (serve 16:9 desktop e crop mobile via `object-fit: cover`).
- **O produto aparece de verdade via overlay em React** (screenshots reais em device frames CSS sobre o vídeo) — o "Motion UI overlay" da própria pesquisa. A captura estratégica validada está em `e2e/screenshots/landing-refs/light-beauty-strategic/`. Texto em tela é HTML, nunca gerado no vídeo.
- **Demo profunda = screen recording real do app** (gravado, zero crédito Higgsfield), não vídeo IA. É o que converte e o que a pesquisa lista como clichê a evitar ("vídeo institucional sem mostrar o produto real").
- **Os vídeos narrativos de 30s** (dor → solução → Pix → fechamento) ficam para **fase de ads** (tráfego pago), com roteiros da pesquisa já aproveitáveis. Fora do escopo desta etapa.

**Paleta travada no DS** (não na pesquisa): barber `#C29B40` sobre `#12100E`; beauty `#B794F6` sobre `#17132A`. Sem "roxo elétrico", sem "verde Pix" como cor de marca, sem "ouro rosa".

## 5. Prompts Higgsfield prontos (3 loops de atmosfera)

Regras embutidas em todos: sem texto/letras/logos na cena, sem rostos em close, loop-friendly (movimento lento e contínuo), 16:9, composição centrada.

### LOOP 1 — Hero neutro (craft, sem nicho)

```
Cinematic macro close-up of a craftsman's hands at work in a premium grooming
studio: warm towel being folded, steel scissors catching a warm rim light,
soft steam rising. Dark moody background, deep charcoal tones (#12100E),
single warm amber key light, shallow depth of field, slow and steady push-in
camera movement, floating dust particles in the light beam. No faces, no text,
no logos, no screens. Elegant, timeless, gender-neutral craft atmosphere.
Seamless ambient loop, 5 seconds, 16:9, photorealistic.
```

### LOOP 2 — Trilha Barbearia (dark gold)

```
Slow cinematic dolly through an upscale empty barbershop at night: dark wood
panels, worn leather barber chairs, brass and gold details glowing under warm
edison bulbs, a subtle out-of-focus amber neon glow in the background
(abstract light, no readable letters). Gentle light haze, floating dust,
rich shadows, deep obsidian and warm gold palette (#12100E / #C29B40).
No people, no text, no logos, no phone screens. Smooth continuous slow
camera motion, seamless ambient loop, 5 seconds, 16:9, photorealistic.
```

### LOOP 3 — Trilha Salão (violeta elegante)

```
Slow graceful dolly through a serene luxury beauty salon in soft morning
light: elegant styling stations with large mirrors, sheer linen curtains
moving gently in a breeze, green plants, champagne and nude tones with
subtle violet accent lighting (#17132A / #B794F6), soft glow reflections
on polished surfaces. Calm, organized, editorial atmosphere. No people,
no text, no logos, no screens. Smooth continuous slow camera motion,
seamless ambient loop, 5 seconds, 16:9, photorealistic.
```

## 6. Spec técnica de export (pipeline ffmpeg, pós-geração)

Budgets da SPEC: mobile ≤ 1,2MB / desktop ≤ 2,5MB / poster ≤ 300KB. Sempre sem áudio (`-an`), `faststart` no MP4.

```bash
# WebM VP9 — mobile 720p
ffmpeg -i loop.mp4 -vf scale=1280:-2 -an -c:v libvpx-vp9 -crf 36 -b:v 600k out-720.webm
# WebM VP9 — desktop 1080p
ffmpeg -i loop.mp4 -vf scale=1920:-2 -an -c:v libvpx-vp9 -crf 34 -b:v 1200k out-1080.webm
# MP4 H.264 fallback (Safari antigo)
ffmpeg -i loop.mp4 -vf scale=1280:-2 -an -c:v libx264 -crf 30 -preset slow -movflags +faststart out-720.mp4
# Poster (frame central) — WebP
ffmpeg -i loop.mp4 -ss 2.5 -frames:v 1 -c:v libwebp -quality 82 out-poster.webp
```

Saída em `public/landing/videos/` (fora do precache PWA — SPEC Decisão 6). Se o loop não fechar perfeito, crossfade de 0,5s no ffmpeg (`xfade`) antes de exportar.

### Loops gerados — 23 Ago 2026

Os 3 loops foram gerados no **Kling 3.0 Turbo** (7,5 créditos por geração; 22,5 créditos no total), sem áudio, em 1280×720 e aproximadamente 5 segundos. Os arquivos brutos ficam fora de `public/` em `research/higgsfield-loops/` para não aumentar o bundle do site.

| Loop | WebM mobile | MP4 fallback | Poster | Estado |
|---|---:|---:|---:|---|
| Hero craft | `loop-hero-720.webm` (325 KB) | `loop-hero-720.mp4` (366 KB) | `loop-hero-poster.webp` (47 KB) | ⚠️ Validar visualmente |
| Barbearia | `loop-barber-720.webm` (306 KB) | `loop-barber-720.mp4` (285 KB) | `loop-barber-poster.webp` (54 KB) | ⚠️ Validar visualmente |
| Salão | `loop-beauty-720.webm` (293 KB) | `loop-beauty-720.mp4` (268 KB) | `loop-beauty-poster.webp` (34 KB) | ⚠️ Validar visualmente |

Todos os derivados estão abaixo dos budgets da SPEC (mobile ≤ 1,2 MB; desktop/fallback ≤ 2,5 MB; poster ≤ 300 KB). Créditos Higgsfield restantes: **33,5 de 70**.

## 7. Checklist de aprovação do dono

- [ ] Aprova o formato "loop de atmosfera + overlay de UI real" (sem vídeo narrativo na LP)
- [ ] Aprova os 3 prompts (§5) ou pede ajuste de clima/paleta
- [ ] Confirma que os 5 gaps de copy (§2) são entregues pelo produto hoje
- [ ] Confirma pricing: cobrança por profissional adicional existe ou não? (afeta gap #5)
- [ ] Autoriza gasto de créditos: 3 gerações de 5s (1 por loop) + 1-2 retries de contingência
```

---

## 8. Após aprovação

1. ✅ Gerar os 3 loops no Kling 3.0 Turbo (7,5 créditos cada; 22,5 no total).
2. ✅ Rodar pipeline ffmpeg (§6) → `public/landing/videos/`.
3. Validar visualmente cada loop (sem texto gerado, sem artefato de IA, paleta no DS).
4. Implementar landing (SPEC-landing-interativa-nichos) com overlays de UI real.
5. Roteiros de ads 30s da pesquisa (Vídeos 1-3 originais) ficam arquivados aqui para a fase de tráfego pago.
