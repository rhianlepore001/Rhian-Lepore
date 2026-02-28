# LEI 10: Testes Antes da Implementação (Next.js & Supabase)

## MOTIVO
Garantir que os Server Actions críticos de banco de dados e as UIs reativas (Client Components) funcionem como o esperado, usando o padrão TDD do React/TS.

## GATILHO
Ativado quando o usuário pedir nova lógica de faturamento, UI complexa de formulários, chamadas externas ou manipulação densa de banco em Server Actions.

## WORKFLOW OBRIGATÓRIO (TS / Vercel Ecosystem)

1. **Red**: Escreva testes (usando Jest, Vitest ou Playwright).
2. **Green**: Implemente o código da UI ou da Server Action.
3. **Refactor**: Separe lógicas pesadas da UI para uma Server Action puramente testável ou funções mockadas.

## FERRAMENTAS RECOMENDADAS NO ECOSSISTEMA
- **Testes Unitários de Lógica (TS/JS Puros)**: Use `Vitest` (mais rápido) ou `Jest`.
- **Testes de UI/Components**: Use `@testing-library/react` (RTL) simulando os hooks nativos do Next.js (useRouter, etc.).
- **Testes de End-to-End (Vercel)**: Playwright ou Cypress (obrigatório para testar integrações complexas como Stripe e Supabase Auth fluxos completos). 

## EXEMPLO DE LÓGICA DE NEGÓCIO SEPARADA
A melhor forma de testar Server Actions fortemente acopladas a banco de dados Supabase e cookies é NÃO colocar a lógica do cálculo complexo junto com as chamadas de banco. Separe a função matemática pura para um arquivo de utilidades e teste-o exaustivamente.

```typescript
// 1. PRIMEIRO: Escreva os testes
// tests/pricing_calculator.test.ts
import { describe, expect, test } from 'vitest'
import { calculateDiscount } from '@/lib/services/pricing'

describe("Calculate Discount", () => {
    test("valid_coupon_applies_discount", () => {
        expect(calculateDiscount(100.0, "SAVE10")).toBe(90.0)
    })
    
    test("no_coupon_returns_original_price", () => {
        expect(calculateDiscount(100.0, null)).toBe(100.0)
    })
    
    test("negative_price_raises_error", () => {
        expect(() => calculateDiscount(-50.0, "SAVE10")).toThrowError("Preço não pode ser negativo")
    })
})

// 2. DEPOIS: Implemente
// lib/services/pricing.ts
export function calculateDiscount(price: number, couponCode: string | null): number {
    if (price < 0) {
        throw new Error("Preço não pode ser negativo")
    }
    
    if (!couponCode) {
        return price
    }
    
    // Supondo um dicionário estático para este exemplo ou dado já validado:
    const couponDiscount = couponCode === "SAVE10" ? 0.10 : 0;
    if (couponDiscount === 0) {
        throw new Error(`Cupom inválido: ${couponCode}`)
    }
    
    return price * (1 - couponDiscount)
}
```
