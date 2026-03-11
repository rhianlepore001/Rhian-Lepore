# Dual Theme Checklist — Brutal vs Beauty

> Rápido. Execute por componente novo ou modificado.

## Props
- [ ] Componente aceita `isBeauty: boolean`
- [ ] Prop propagada para todos os sub-componentes filhos

## Cores de Texto
- [ ] Usa `isBeauty ? 'text-beauty-neon' : 'text-accent-gold'`
- [ ] Sem `text-pink-*` hardcoded
- [ ] Sem `text-yellow-*` hardcoded

## Cores de Background
- [ ] Usa `isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'` para destaque
- [ ] Fundo do card: `bg-neutral-900` (neutro, funciona nos dois temas)

## Bordas
- [ ] Usa `isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20'`
- [ ] Sem cores de borda hardcoded específicas de tema

## Sombras
- [ ] Usa variável de sombra por tema quando necessário
- [ ] `shadow-neon` para Beauty, `shadow-gold-strong` para Brutal

## Teste Visual
- [ ] Screenshot/preview com `userType = 'beauty'`
- [ ] Screenshot/preview com `userType = 'barber'`
- [ ] Contraste legível nos dois temas
- [ ] Hierarquia visual mantida nos dois temas
