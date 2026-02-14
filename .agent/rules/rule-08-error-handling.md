# LEI 08: Tratamento de Erros com Contexto

## MOTIVO
Evitar debugging às cegas por falta de stack trace, correlation IDs ou mensagens genéricas.

## GATILHO
Ativado ao criar ou modificar blocos try/catch, handlers de exceção ou middleware de erro.

## PRINCÍPIOS OBRIGATÓRIOS

### Zero Swallow
Nunca capture exceções sem logar ou re-lançar. `except: pass` e `catch(e) {}` são estritamente proibidos.

### Correlation ID
Toda requisição HTTP deve carregar um `X-Request-ID` que propaga entre serviços e aparece em todos os logs relacionados.

### Separação de Audiência
Mensagens de erro para usuário final devem ser amigáveis. Logs técnicos devem conter stack trace completo, variáveis de contexto e timestamp ISO8601.

### Fail Fast
Valide inputs no início da função. Não processe dados inválidos para falhar depois.

## EXEMPLO ERRADO
```python
async def process_payment(payment_id: str):
    try:
        result = await stripe.charges.create(...)
        return result
    except Exception:
        pass  # Erro silencioso!
    
    try:
        data = json.loads(response.text)
    except:
        return {"error": "Algo deu errado"}  # Mensagem inútil!
```

## EXEMPLO CORRETO
```python
import structlog
from uuid import uuid4

logger = structlog.get_logger()

class PaymentError(Exception):
    def __init__(self, message: str, payment_id: str, original_error: Exception = None):
        self.message = message
        self.payment_id = payment_id
        self.original_error = original_error
        super().__init__(message)

async def process_payment(payment_id: str, request_id: str = None):
    request_id = request_id or str(uuid4())
    log = logger.bind(request_id=request_id, payment_id=payment_id)
    
    try:
        log.info("payment.processing.started")
        result = await stripe.charges.create(...)
        log.info("payment.processing.success", amount=result.amount)
        return result
        
    except stripe.error.CardError as e:
        log.error(
            "payment.processing.card_declined",
            error_code=e.code,
            decline_code=e.decline_code,
            exc_info=True
        )
        raise PaymentError(
            message="Cartão recusado. Verifique os dados ou tente outro cartão.",
            payment_id=payment_id,
            original_error=e
        )
```
