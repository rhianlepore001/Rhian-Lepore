# AgenX — Tech Stack Completo

## Frontend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 19 | UI framework (hooks, Suspense, lazy) |
| TypeScript | 5.8 | Tipagem estrita (strict: true) |
| Vite | 6.x | Build tool (porta 3000, alias `@/`) |
| React Router | 7 | HashRouter (`#` routing) |
| Tailwind CSS | 3.x | Utility-first styling |
| Lucide React | latest | Ícones (importar individualmente) |
| Recharts | latest | Gráficos (importar só componentes usados) |

## Backend / Infra
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Supabase | latest | PostgreSQL + RLS + Auth + Edge Functions |
| Supabase Auth | latest | Autenticação (NÃO usar Clerk — decisão ADR) |

## IA
| Tecnologia | Uso |
|-----------|-----|
| Google Generative AI (`@google/generative-ai`) | Gemini API — geração de texto, insights, imagens |
| Gemini 2.0 Flash | Modelo padrão para respostas rápidas |
| Gemini Imagen 3 | Geração de imagens para Instagram Studio |
| OpenRouter | Fallback / Instagram Ideas (existente em `lib/openrouter.ts`) |

## Integrações (em desenvolvimento)
| Tecnologia | Uso |
|-----------|-----|
| Twilio | SMS em massa (server-side via Supabase Edge Function) |
| Google Maps Embed API | Mapa no perfil e booking público |
| WhatsApp (link-based) | Links `wa.me/` para comunicação com clientes |

## Pagamentos
| Tecnologia | Uso |
|-----------|-----|
| Stripe | Assinaturas do AgenX (não dos clientes do salão) |

## Testing
| Tecnologia | Uso |
|-----------|-----|
| Vitest | Test runner (compatível com Jest) |
| React Testing Library | Component testing |
| jsdom | DOM environment |

## PWA
- Instalável via manifest.json
- Service Worker para offline support
- Ícones em `/public/`

## Variáveis de Ambiente
```env
# Obrigatórias
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GEMINI_API_KEY=         # ou VITE_GEMINI_API_KEY

# Opcionais (novas features)
VITE_GOOGLE_MAPS_API_KEY=

# Server-side (Supabase Vault APENAS — NUNCA no .env frontend)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
SUPABASE_SERVICE_ROLE_KEY=
```

## Path Alias
```typescript
// tsconfig.json e vite.config.ts
"@/*" → root directory
// Exemplo:
import { useAuth } from '@/contexts/AuthContext';
import { BrutalCard } from '@/components/BrutalCard';
```
