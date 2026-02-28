# LEI 02: Performance e Assincronismo no Ecossistema Node/Edge

## MOTIVO
Garantir que as rotas e server actions rodem de forma eficiente e sem bloqueios (blocking I/O) no ambiente Serverless/Edge da Vercel.

## GATILHO
Ativado sempre que o agente for criar ou modificar arquivos de rotas API (`/api/*/route.ts`), Server Actions ou integrações externas.

## DIRETRIZES TÉCNICAS

### Async First no TypeScript
Toda comunicação com Supabase, APIs externas (OpenAI, Anthropic) DEVE usar `.then()` implícito via `async/await`. O Node.js/Edge runtime é assíncrono por natureza.

### Tempo Limite na Vercel (Timeouts)
Rotas API na Vercel (Hobby/Pro plan) têm limites rígidos de tempo (ex: 10 a 60 segundos). Nunca introduza atrasos artificiais (`await new Promise(r => setTimeout(r, 2000))`) em funções que bloqueiam a resposta ao usuário.

### Processamento em Background
**NUNCA SUGIRA CELERY, REDIS OU WORKERS PYTHON.** Next.js na Vercel NÃO suporta workers standalone tradicionais.
Para tarefas longas assíncronas (geração de relatórios, envio de e-mail em massa), as únicas ferramentas permitidas são:
1. **Inngest** / **Trigger.dev** (serviços externos de background jobs via webhooks).
2. **Vercel Functions / Cron Jobs** com `waitUntil` (se aplicável localmente no escopo do handler).

## EXEMPLO ERRADO
```typescript
// app/api/process/route.ts
export async function POST(req: Request) {
  // Mau uso de timeout bloqueante que vai causar erro de Timeout na Vercel
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Não use fetch síncronos disfarçados (ex: chamadas encadeadas longas)
  const res = await fetch("https://api-lenta.com/data");
  return Response.json(await res.json());
}
```

## EXEMPLO CORRETO
```typescript
// app/api/process/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Comunicação assíncrona limpa
    const response = await fetch("https://api-rapida.com/data", {
      signal: AbortSignal.timeout(5000) // Timeout seguro de 5s
    });
    
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Falha na comunicação externa" }, { status: 504 });
  }
}
```
