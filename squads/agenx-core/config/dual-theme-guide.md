# AgenX — Guia do Dual Theme (Brutal / Beauty)

## Visão Geral

O AgenX tem dois temas visuais distintos:
- **Brutal** → Barbearias (dark, bold, dourado, masculino)
- **Beauty** → Salões de beleza (dark glass, neon pink/lilac, feminino/elegante)

**A prop `isBeauty: boolean` é o gatilho único para toda diferenciação visual.**

---

## Como Detectar o Tema Atual

```typescript
// Em qualquer componente/página autenticada:
const { userType } = useAuth();
const isBeauty = userType === 'beauty';

// Em componentes que recebem isBeauty via prop:
interface Props {
  isBeauty: boolean;
}
```

---

## Mapa Completo de Classes por Tema

### Cores de Destaque
```typescript
const accentText    = isBeauty ? 'text-beauty-neon'    : 'text-accent-gold';
const accentBg      = isBeauty ? 'bg-beauty-neon'      : 'bg-accent-gold';
const accentBorder  = isBeauty ? 'border-beauty-neon'  : 'border-accent-gold';
const accentBorder20 = isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20';
const accentRing    = isBeauty ? 'ring-beauty-neon'    : 'ring-accent-gold';
```

### Sombras
```typescript
const shadowStrong  = isBeauty ? 'shadow-neon'           : 'shadow-gold-strong';
const shadowPremium = isBeauty ? 'shadow-promax-glass'   : 'shadow-promax-depth';
const shadowLite    = isBeauty ? 'shadow-lite-glass'     : 'shadow-lite-gold';
```

### Gradientes de Background
```typescript
const gradientBg = isBeauty
  ? 'bg-gradient-to-br from-beauty-neon/10 via-purple-900/20 to-black'
  : 'bg-gradient-to-br from-accent-gold/10 via-neutral-900 to-black';
```

### Botão Primário
```typescript
const btnPrimary = isBeauty
  ? `bg-beauty-neon text-black ${shadowNeon}`
  : `bg-accent-gold text-black ${shadowGold}`;
```

---

## Exemplo Completo de Componente

```tsx
interface DashboardTodayCardProps {
  isBeauty: boolean;
  appointments: number;
  revenue: number;
  goalProgress: number;
}

export const DashboardTodayCard: React.FC<DashboardTodayCardProps> = ({
  isBeauty,
  appointments,
  revenue,
  goalProgress
}) => {
  const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentBg   = isBeauty ? 'bg-beauty-neon'   : 'bg-accent-gold';

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
      <h2 className={`text-2xl font-heading ${accentText}`}>
        Hoje
      </h2>
      <div
        className={`h-2 rounded-full ${accentBg} mt-3`}
        style={{ width: `${goalProgress}%` }}
      />
    </div>
  );
};
```

---

## Testando Dual Theme

**Todo novo componente deve ser testado nos dois temas.**

Checklist mínimo:
- [ ] `isBeauty={true}` → elementos com `text-beauty-neon` / `bg-beauty-neon`
- [ ] `isBeauty={false}` → elementos com `text-accent-gold` / `bg-accent-gold`
- [ ] Sem cores hardcoded que quebram um dos temas
- [ ] Sem classes `text-pink-*` ou `text-yellow-*` diretas (usar variáveis)

---

## Variáveis CSS Customizadas (index.css)

```css
/* Barbeiro (Brutal) */
--color-accent-gold: #D4AF37;
--color-accent-gold-light: #F0D060;

/* Salão (Beauty) */
--color-beauty-neon: #FF00FF;  /* ou similar — verificar index.css */
--color-beauty-secondary: #A855F7;
```

> **Verificar valores exatos em `index.css` antes de usar valores hardcoded.**
