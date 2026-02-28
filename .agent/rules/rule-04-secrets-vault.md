# LEI 04: Cofre de Segredos e Environment Vars (Next.js)

## MOTIVO
Variáveis de ambiente podem vazar acidentalmente para logs de build na Vercel ou via Network tab se expostas incorretamente no Next.js. Além disso, chaves valiosas nunca devem ser estocadas cruas no DB.

## GATILHO
Ativado ao manipular API keys, integração com Stripe, OpenAI, ou configurar novas env vars.

## REGRAS DE IMPLEMENTAÇÃO

### Regra do Prefixo NEXT_PUBLIC_
Variáveis iniciadas com `NEXT_PUBLIC_` são empacotadas para o navegador (Frontend). **NUNCA** coloque secrets (chaves OpenAI, Stripe Secret Key, Supabase Service Role) com este prefixo.
Variáveis sensíveis DEVEM ser chamadas sem o prefixo (ex: `OPENAI_API_KEY`) e só podem ser importadas em Server Components, Server Actions ou Route Handlers.

### Criptografia em Repouso no DB Supabase
Se a plataforma pedir integrações onde usuários embutem suas próprias chaves das APIs, elas não devem ficar plaintext na tabela `integrations`. Elas devem ser encriptadas na aplicação (criptografia simétrica) ou usar o **Supabase Vault** (recomendado se já ativo no projeto).

### Sanitização Absoluta de Logs
É banido fazer `console.log(process.env)` ou `console.error({ env: process.env })`. Os servidores Vercel salvarão isso e poderão expor as chaves através do Vercel Dashboard logger.

## EXEMPLO ERRADO
```typescript
// app/components/ChatButton.tsx
"use client" // Componente cliente
// VAZANDO CHAVE DA OPENAI PRA RUA! NEXT_PUBLIC PERMITE EXIBIR NO CÓDIGO FONTE JS DO NAVEGADOR
const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY; 

export default function ChatButton() {
  const callAI = async () => { /* ... fetch direto com a chave ... */ }
  return <button onClick={callAI}>Falar com IA</button>
}
```

## EXEMPLO CORRETO
```typescript
// app/actions/chat.ts
"use server" // Roda somente no backend Vercel

export async function askAIAction(prompt: string) {
  // Chamado com segurança. process.env.OPENAI_API_KEY só existe no server
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* ... */ })
  })
  return response.json()
}

// app/components/ChatButton.tsx
"use client"
import { askAIAction } from '@/app/actions/chat'

export default function ChatButton() {
  const callAI = async () => { await askAIAction("Oi!") }
  return <button onClick={callAI}>Falar com IA</button>
}
```
