# Standards Checker — AgendiX

## Resumo
| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 2 |
| MÉDIO | 2 |
| BAIXO | 1 |

---

### ALTO-001: Open redirect no checkout Stripe (URLs do cliente)
- **Severidade:** ALTO
- **Arquivo(s):** `supabase/functions/create-checkout-session/index.ts:43,98-99`
- **Trecho:**
```typescript
const { priceId, successUrl, cancelUrl, mode = "subscription" } = await req.json();
// ...
success_url: successUrl,
cancel_url: cancelUrl,
```
- **Impacto:** Cliente autenticado pode enviar `successUrl`/`cancelUrl` arbitrários; Stripe redireciona o usuário após pagamento para domínio malicioso (phishing).
- **Solução sugerida:** Allowlist server-side (`origin` do app); ignorar URLs do body ou validar contra regex de domínios permitidos.
- **Esforço:** Baixo

---

### ALTO-002: Redirect para `data.url` sem validação no frontend
- **Severidade:** ALTO
- **Arquivo(s):** `pages/settings/SubscriptionSettings.tsx:91-92`
- **Trecho:**
```typescript
if (data?.url) {
  window.location.href = data.url;
}
```
- **Impacto:** Se a Edge Function retornar URL não-Stripe (bug, compromise, MITM), usuário é redirecionado sem checagem.
- **Solução sugerida:** Validar `data.url` começa com `https://checkout.stripe.com/` antes do redirect.
- **Esforço:** Baixo

---

### MÉDIO-001: HTML de e-mail sem escape
- **Severidade:** MÉDIO
- **Arquivo(s):** `supabase/functions/send-appointment-reminder/index.ts:85-97`
- **Impacto:** `clientName`, `businessName`, `serviceName` interpolados sem escape — injection no corpo do e-mail.
- **Solução sugerida:** Escape HTML entities.
- **Esforço:** Baixo

---

### MÉDIO-002: `href` com `image_url` sem validação de protocolo
- **Severidade:** MÉDIO
- **Arquivo(s):** `components/BusinessGalleryManager.tsx:163-165`
- **Trecho:**
```tsx
<a href={item.image_url} target="_blank" rel="noreferrer">
```
- **Impacto:** URL `javascript:` ou domínio externo malicioso na galeria → XSS/open redirect ao clicar.
- **Solução sugerida:** Validar `https:` + origem Supabase Storage antes de renderizar link.
- **Esforço:** Baixo

---

### BAIXO-001: `innerHTML` para CSS estático no tour
- **Severidade:** BAIXO
- **Arquivo(s):** `hooks/useAppTour.ts:36`
- **Impacto:** CSS derivado de `userType` interno; sem input externo hoje.
- **Solução sugerida:** Classes CSS estáticas.
- **Esforço:** Baixo

---

## Padrões ausentes (positivo)
| Padrão | Resultado |
|--------|-----------|
| `eval()` | 0 ocorrências |
| `dangerouslySetInnerHTML` | 0 ocorrências |
| `document.write` | 0 no app |
| `child_process` + input usuário | 0 ocorrências |
