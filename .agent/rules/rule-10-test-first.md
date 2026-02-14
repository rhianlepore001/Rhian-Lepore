# LEI 10: Testes Antes da Implementação

## MOTIVO
Garantir que o código gerado atenda aos requisitos definidos e não apenas "pareça funcionar".

## GATILHO
Ativado quando o usuário pedir nova feature, endpoint ou função de negócio.

## WORKFLOW OBRIGATÓRIO

1. **Red**: Escreva testes que definem o comportamento esperado. Eles DEVEM falhar inicialmente.
2. **Green**: Implemente o código mínimo necessário para os testes passarem.
3. **Refactor**: Melhore a estrutura mantendo os testes verdes.

## COBERTURA MÍNIMA

- **Funções de negócio**: 80% de cobertura
- **Edge cases obrigatórios**: null/undefined, array vazio, strings vazias, limites numéricos
- **Casos de erro**: pelo menos 1 teste de exceção por função que pode falhar

## EXEMPLO

```python
# 1. PRIMEIRO: Escreva os testes
# tests/test_discount.py
import pytest
from app.services.pricing import calculate_discount, InvalidCouponError

class TestCalculateDiscount:
    def test_valid_coupon_applies_discount(self):
        assert calculate_discount(100.0, "SAVE10") == 90.0
    
    def test_no_coupon_returns_original_price(self):
        assert calculate_discount(100.0, None) == 100.0
    
    def test_invalid_coupon_raises_error(self):
        with pytest.raises(InvalidCouponError):
            calculate_discount(100.0, "FAKE123")
    
    def test_negative_price_raises_error(self):
        with pytest.raises(ValueError):
            calculate_discount(-50.0, "SAVE10")

# 2. DEPOIS: Implemente para passar os testes
# app/services/pricing.py
def calculate_discount(price: float, coupon_code: str | None) -> float:
    if price < 0:
        raise ValueError("Preço não pode ser negativo")
    
    if not coupon_code:
        return price
    
    coupon = COUPONS.get(coupon_code.upper())
    if not coupon:
        raise InvalidCouponError(f"Cupom inválido: {coupon_code}")
    
    return price * (1 - coupon["discount"])
```
