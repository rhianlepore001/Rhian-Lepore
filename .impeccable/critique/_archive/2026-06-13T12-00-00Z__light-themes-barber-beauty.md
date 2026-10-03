---
target: Barber Light + Beauty Light theme tokens
total_score: 19
p0_count: 3
p1_count: 2
timestamp: 2026-06-13T12-00-00Z
slug: light-themes-barber-beauty
---

# Critique — AgendiX Light Themes (Barber Light + Beauty Light)

**Targets:** `design-system/tokens.css` (barber light + beauty light), `hooks/useBrutalTheme.ts`, `index.html` inline CSS
**Register:** product
**Data:** 2026-06-13

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Status colors OK; accent may compete with danger in light |
| 2 | Match System / Real World | 3 | Warm parchment / lavender make sense for domain |
| 3 | User Control and Freedom | 3 | Dark/light toggle works |
| 4 | Consistency and Standards | 2 | Dark e lights don't feel like same family — identity breaks across modes |
| 5 | Error Prevention | n/a | Token level |
| 6 | Recognition Rather Than Recall | 3 | Hierarchy improved with darker bg + white card |
| 7 | Flexibility and Efficiency | 3 | Extensible system maintained |
| 8 | Aesthetic and Minimalist Design | 2 | Barber Light: bg "papelão dourado" too aggressive. Beauty Light: accent personality shifts from dark |
| 9 | Error Recovery | n/a | Token level |
| 10 | Help and Documentation | n/a | Token level |
| **Total** | | **19/30** | **Acceptable — improved but not sufficient** |

## Anti-Patterns Verdict

**LLM assessment:** Improvements from original are real (Contraste WCAG AA, cor sólida, tinte cromático). But introduced new problems:

1. Barber Light bg `#E8E0D0` is aggressively yellow — reads as craft paper, not warm parchment.
2. Accent personality breaks across modes: dark gold (`#C29B40`) ≠ light brown (`#8B6914`). Dark violet (`#B794F6`) ≠ deep purple (`#5B21B6`).
3. Surface darker than bg inverts visual hierarchy for light mode.
4. Card-elevated ~1.5% luminance gap from card — imperceptible.

## Priority Issues

### [P0] Barber Light bg aggressively yellow — loses sophistication
- `#E8E0D0` has OKLCH ~62% L with ~0.04 chroma — that's a colored surface, not a tinted neutral
- Should pull back to ~90% L with ~0.02 chroma (e.g., `#F0E8D8`)
- Card still separates but bg no longer shouts

### [P0] Accent identity breaks between dark and light
- Barber: dark `#C29B40` (bright gold) → light `#8B6914` (dark brown) — different family
- Beauty: dark `#B794F6` (diffuse violet) → light `#5B21B6` (heavy deep purple) — different feel
- Fix: same hue family, different lightness. Barber light accent ~`#9E7B2A`. Beauty light accent ~`#7C3AED` (original was fine).

### [P0] Surface darker than bg inverts light-mode hierarchy
- Barber: bg `#E8E0D0` → surface `#DDD6C6` (surface = darker, looks sunken)
- Beauty: bg `#EBE5F5` → surface `#DDD4EF` (same issue)
- Either: make surface LIGHTER than bg, or make it intentionally "recessed panel" with text adjustments

### [P1] Card-elevated indistinguishable from card
- Barber: `#FFFFFF` → `#F5F3EE` (~1.5% gap)
- Beauty: `#FFFFFF` → `#F3F0FA` (~1.5% gap)
- Need 3-5% gap or remove token

### [P1] Gradient-bg still timid — 6% opacity barely visible
- On ~90% luminance backgrounds, 6% opacity of accent = nearly invisible
- Increase to 8-10% or remove entirely

## What's Working
1. Card separates from bg (gap exists)
2. text-secondary passes WCAG AA on both themes
3. text-muted replaced alpha with solid color
4. Borders have chromatic tint

## Persona Red Flags
- Casey (Mobile/Sol): `#E8E0D0` in sunlight = yellow glare. Text readable but bg harsh.
- Alex (Power User): Dark → light switch = identity whiplash. Different accent colors feel like different apps.
- Sam (Accessibility): All contrast ratios pass, but visual heaviness of accents is concern.