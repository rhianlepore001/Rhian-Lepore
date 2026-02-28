# LEI 14: Código como Documentação Essencial

## MOTIVO
Comentários exaustivos envelhecem e ficam dessincronizados do sistema Typescript verdadeiro. Códigos mal nomeados dependem desses comentários incorretos para serem compreendidos, atrasando iterações de equipe e auditorias de bugs.

## GATILHO
Ativado ao escrever Server Actions elaboradas, novos componentes complexos (dashboards, listagens, forms), funções matemáticas (cobrança) ou complexas interações de Row Level Security.

## REGRAS DE EXPRESSIVIDADE

### Auto-explicatividade via Tipagem TS
Use inteiramente os recursos do Typescript para inferir o que as coisas fazem. Não adicione JSDoc em tudo se os tipos contarem a história sozinhos. Use interfaces expressivas.

### Coesão e Limite de Tela
Uma Server Action ou Componente `page.tsx` jamais deve ser maior do que 3 vezes a altura da tela (Aprox. 100-150 linhas curtas). Se for maior que isso, isole a lógica UI em components pequenos ou isole as lógicas de negócio puras na lib.

### "Não Explique o QUE, Explique o POR QUÊ"
Nunca use comentários como `// Loop arrays de clientes`.
Reserve comentários exclusivamente para decisões "Bizarras" do código ditadas pela regra de negócio, workarounds da Vercel Edge, etc.

## EXEMPLO ERRADO (Over-commenting)

```typescript
// Componente de botão
// Recebe as props para mostrar e clicar
export function BigButton(props: any) {
  // Flag p/ evitar clicks
  const db_click = false; 

  // Pega id do user na DB 
  const gUID = getid(props.u);
  
  // faz auth e paga
  async function clk() {
    process(gUID);
  }
  
  return <button onClick={clk}>{props.text}</button>
}
```

## EXEMPLO CORRETO (Expressividade TS)

```typescript
import { processPaymentAction } from '@/app/actions/billing'

interface PurchaseButtonProps {
    userId: string;
    label: string;
    isSubmitting?: boolean;
}

export function PurchaseButton({ userId, label, isSubmitting = false }: PurchaseButtonProps) {
    // INFO: Precisamos usar o Server Action isolado aqui pois o checkout 
    // lida com chaves sigilosas de Stripe que não podem vir ao client bundle.
    async function handlePayment() {
        await processPaymentAction(userId)
    }
  
    return (
        <button 
          onClick={handlePayment} 
          disabled={isSubmitting}
          className="bg-blue-600 disabled:bg-gray-400"
        >
          {label}
        </button>
    )
}
```
