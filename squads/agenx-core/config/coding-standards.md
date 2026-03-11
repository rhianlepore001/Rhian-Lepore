# AgenX — Coding Standards & Padrões Obrigatórios

## Regra #1 — Dual Theme (CRÍTICO)

**TODO componente novo DEVE aceitar a prop `isBeauty: boolean`.**

```typescript
interface MyComponentProps {
  isBeauty: boolean;  // SEMPRE presente
  // ... outras props
}

// Padrão de uso no componente:
const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
const accentBg   = isBeauty ? 'bg-beauty-neon'   : 'bg-accent-gold';
const borderClass = isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20';
const shadowClass = isBeauty ? 'shadow-neon' : 'shadow-gold-strong';
```

Obter `isBeauty` em páginas: `const { userType } = useAuth(); const isBeauty = userType === 'beauty';`

---

## Regra #2 — Multi-Tenant Security (CRÍTICO)

**NUNCA** buscar `company_id` de URL params ou formulário.
**SEMPRE** extrair do AuthContext:

```typescript
const { companyId } = useAuth(); // CORRETO

// Em queries Supabase:
const { data } = await supabase
  .from('appointments')
  .select('*')
  .eq('company_id', companyId); // OBRIGATÓRIO
```

---

## Regra #3 — Componentes Funcionais com Hooks

```typescript
// CORRETO — functional component
export const MyComponent: React.FC<Props> = ({ isBeauty, ...props }) => {
  const { companyId, userType } = useAuth();
  const { addAlert } = useAlerts();
  // ...
  return <div>...</div>;
};

// NUNCA — class components
```

---

## Regra #4 — Error Handling

```typescript
// Padrão para queries Supabase
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  setData(data);
} catch (err) {
  logger.error('Descrição do erro', err);
  addAlert({ type: 'error', text: 'Mensagem amigável para o usuário' });
} finally {
  setLoading(false);
}
```

---

## Regra #5 — Loading States

```typescript
// Sempre ter estado de loading
const [loading, setLoading] = useState(true);

// Em JSX:
{loading ? (
  <Skeleton className="h-12 w-full" />
) : (
  <ActualContent />
)}
```

---

## Regra #6 — Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componente | PascalCase | `DashboardTodayCard.tsx` |
| Hook | camelCase com `use` | `useDashboardData.ts` |
| Utility | camelCase | `formatters.ts` |
| Context | PascalCase + Context | `AuthContext.tsx` |
| Page | PascalCase | `Dashboard.tsx` |
| Constante | UPPER_SNAKE | `MAX_RETRIES` |

---

## Regra #7 — Contextos Disponíveis

```typescript
// Autenticação e dados do negócio
const {
  user,           // Supabase user object
  companyId,      // UUID do salão/barbearia (USAR SEMPRE em queries)
  userType,       // 'beauty' | 'barber'
  role,           // 'owner' | 'staff'
  businessName,   // Nome do negócio
  fullName,       // Nome completo do usuário
  avatarUrl,      // URL do avatar
  region,         // 'BR' | 'PT'
  slug,           // Slug público do negócio (para booking público)
} = useAuth();

// Alertas / toasts
const { addAlert } = useAlerts();
addAlert({ type: 'success' | 'error' | 'warning', text: 'Mensagem' });

// UI state
const { sidebarOpen, toggleSidebar } = useUI();
```

---

## Regra #8 — Roteamento (HashRouter)

```typescript
// App usa HashRouter — rotas com #
// CORRETO: navigate('/agenda')
// URL resultante: /#/agenda

// Importar useNavigate do react-router-dom
import { useNavigate, useParams } from 'react-router-dom';
```

---

## Regra #9 — Tailwind Classes Customizadas do AgenX

```css
/* Cores do tema */
text-accent-gold       /* Barbeiro — dourado */
text-beauty-neon       /* Salão — neon pink */
bg-accent-gold
bg-beauty-neon
border-accent-gold/20
border-beauty-neon/20

/* Sombras */
shadow-gold-strong     /* Barbeiro */
shadow-neon            /* Salão */
shadow-promax-depth    /* Barbeiro — premium */
shadow-promax-glass    /* Salão — premium */

/* Glassmorphism */
bg-white/[0.03] backdrop-blur-3xl   /* Card glass */
border border-white/10               /* Borda glass */

/* Backgrounds neutros */
bg-neutral-900    /* Card background */
bg-neutral-950    /* Page background */
text-white        /* Texto primário */
text-text-secondary  /* Texto secundário (custom var) */
```

---

## Regra #10 — Lazy Loading de Páginas

```typescript
// App.tsx — toda página nova DEVE ser lazy
const MinhaNovaPage = React.lazy(() => import('./pages/MinhaNovaPage'));

// Já está no Suspense com fallback — só adicionar a rota:
<Route path="/minha-rota" element={<MinhaNovaPage />} />
```

---

## Regra #11 — Idioma do Código

- **Nomes de variáveis/funções:** inglês (camelCase)
- **Texto visível ao usuário:** português brasileiro
- **Comentários no código:** pode ser PT ou EN
- **ZERO jargões técnicos na UI** (ver tabela de substituições em source-tree.md)

---

## Regra #12 — Formatação de Moeda/Data

```typescript
import { formatCurrency } from '@/utils/formatters';
import { formatDate } from '@/utils/date';

// Moeda (respeita região BR/PT)
const currencyRegion = region === 'PT' ? 'PT' : 'BR';
formatCurrency(1500, currencyRegion); // "R$ 1.500,00" ou "€ 1.500,00"

// Data
formatDate(new Date(), 'dd/MM/yyyy');
```
