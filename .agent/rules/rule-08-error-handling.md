# LEI 08: Tratamento de Erros e Stack Traces TS/Node

## MOTIVO
O JavaScript/TypeScript é propenso a engolir erros silenciosamente (swallowing). Falhas severas na Vercel frequentemente resultam em `500 Internal Server Error` vazios, tornando o tracking no log da plataforma impossível sem prints precisos e contextuais.

## GATILHO
Ativado ao criar Server Actions, chamadas `fetch` a serviços 3rd-party, endpoints no Next.js App Router e Server Components propensos a falhas de comunicação de dados.

## PRINCÍPIOS OBRIGATÓRIOS

### Zero Swallow
Nunca capture exceções apenas para retornar genéricos ou retornar arrays curtos sem logar. `catch(e) { return [] }` é proibido. Pelo menos logue o verdadeiro erro usando `console.error`. 

### Stack Trace Amigável para o Servidor
Mensagens de erro no Server devem conter o stack. A Vercel captura nativamente os `console.error(error)` globalmente em seus Serverless Function Logs.
No entanto, NUNCA envie o objeto de Error cru ou `error.message` contendo dados de chaves de API/Query de BD diretos para a interface de usuário (Client Components) através de Server Actions. Exiba "Ocorreu um problema ao conectar com o serviço".

### Tratamento de Retorno (Result Pattern)
Evite propagação cega de exceptions (Throw Driven Development).
Prefira funções e Server Actions que retornam tipos em formato objeto (Tuple ou `{ data, error }`).

## EXEMPLO ERRADO
```typescript
// app/actions/payments.ts
"use server"

export async function processPayment(paymentId: string) {
  try {
    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
    })
    
    // FETCH NÃO DÁ THROWS EM EXCEÇÕES DE ERROS HTTP 4xx, 5xx POR PADRÃO! (O ERRO NÚMERO 1 NO JS)
    const json = await res.json()
    return json;
  } catch (e) {
    // ERRO SILENCIOSO (Zero Swallow violado)
    // Se a rede cair, ou houver JSON malformado, retorna undefined silenciosamente
  }
}
```

## EXEMPLO CORRETO
```typescript
// app/actions/payments.ts
"use server"

// Padrão consistente de resposta
export type ActionResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string }

export async function processPayment(paymentId: string): Promise<ActionResponse<any>> {
  try {
    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
    })
    
    // Tratamento de falhas HTTP Nativas
    if (!res.ok) {
      const errorText = await res.text()
      // Log crítico de backend pra Vercel ler:
      console.error(`[Stripe Error] Falha requisição para ${paymentId}: Status ${res.status} Body: ${errorText}`)
      // Mensagem genérica pro usuário
      return { success: false, error: "Falha na comunicação com gateway de pagamento." }
    }
    
    const data = await res.json()
    return { success: true, data }
    
  } catch (error) {
    // Captura erros de parsing JSON e falhas de runtime na rede
    console.error(`[CRITICAL] Falha de infra no pagamento ${paymentId}:`, error)
    return { success: false, error: "Ocorreu um erro interno. Tente mais tarde." }
  }
}
```
