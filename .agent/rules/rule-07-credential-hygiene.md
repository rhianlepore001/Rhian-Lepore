# LEI 07: Higiene de Credenciais e Autenticação (Next.js)

## MOTIVO
Garantir que os métodos de hash de senha, validação de requisições e armazenamento de tokens (quando você não usar puramente o `@supabase/ssr`) sigam padrões atualizados do Node.js.

## GATILHO
Ativado ao implementar verificações B2B (API Keys), rotas de redefinição de senha ou integrações customizadas sem depender 100% da tabela auth do Supabase.

## CRIPTOGRAFIA OBRIGATÓRIA

### Hash de Senha Customizado
Se estiver gerenciando a própria tabela de usuários em vez do Supabase Auth (desaconselhado, mas possível em B2B complexo), NUNCA grave senhas em texto puro, Base64 ou MD5/SHA1.
**Obrigatório**: Use o pacote `bcrypt` (ou `bcryptjs` caso problema no Vercel Edge build) com cost factor mínimo de 10, ou a Web Crypto API nativa se estrito ao Edge.

### Geração de Tokens Temporários (Redefinição de Senha)
Não use UUIDs previsíveis nem `Math.random()`.
**Obrigatório**: Use `crypto.randomBytes(32).toString('hex')` (Node.js API) ou `crypto.getRandomValues` (Web Crypto API Edge) para gerar tokens de reset. Defina expiração hard-coded no banco (ex: `expires_at = now() + interval '15 minutes'`).

## VERIFICAÇÃO DE ASSINATURA DE WEBHOOKS
Para integração de faturamento (Stripe), a **assinatura do webhook** é estritamente necessária.

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  try {
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    // ... processamento do webhook
    return Response.json({ received: true })
  } catch (err: any) {
    console.error("Webhook stripe erro:", err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
}
```

## EXEMPLO ERRADO
```typescript
// app/actions/auth.ts
import md5 from 'md5' // VAZAMENTO CRIMINAL! MD5 é quebrado.

export async function savePassword(raw: string) {
  const hash = md5(raw) 
  await db.from('users').insert({ pass: hash })
  
  // ERRO GRAVE: Geração de token fraco
  const token = Math.random().toString(36).substring(7) 
  await sendResetEmail(token)
}
```

## EXEMPLO CORRETO
```typescript
// app/actions/auth.ts
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export async function savePassword(raw: string) {
  // SEGURO: Criptografia moderna e salgada
  const salt = await bcrypt.genSalt(12)
  const hash = await bcrypt.hash(raw, salt)
  await db.from('users').insert({ pass: hash })
  
  // SEGURO: Entropia forte
  const token = randomBytes(32).toString('hex')
  await sendResetEmail(token)
}
```
