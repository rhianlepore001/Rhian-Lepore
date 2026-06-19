# Quick win — EmptyState Clients (feat-802)

**Sprint:** S8 | **Finding:** UI-012 | **Arquivo alvo:** `pages/Clients.tsx`  
**Componente:** `components/ui/EmptyState.tsx` (S2)

---

## Objetivo

Padronizar o estado vazio da lista de clientes com copy aprovada no UI audit, usando o componente canônico já existente — **sem** redesenhar a grid de cards nem o modal de cadastro neste quick win.

---

## Copy (obrigatória — SPEC §9 / UI-012)

| Campo | Texto |
|-------|-------|
| **title** | Seus clientes aparecem aqui. Cadastre o primeiro ou importe da agenda. |
| **description** | *(omitir — frase única no title, max 32ch respeitado via quebra natural)* |
| **CTA** | Adicionar cliente |

> Sentence case. Sem UPPERCASE. Sem anglicismos ("Setup" → não aplicável).

---

## Contrato de implementação

```tsx
import { Users, Plus } from 'lucide-react';
import { EmptyState, Button } from '@/components/ui';

<EmptyState
  icon={Users}
  title="Seus clientes aparecem aqui. Cadastre o primeiro ou importe da agenda."
  action={
    <Button
      variant="primary"
      size="md"
      icon={<Plus className="h-4 w-4" />}
      onClick={() => setShowModal(true)}
    >
      Adicionar cliente
    </Button>
  }
/>
```

### Props

| Prop | Valor | Notas |
|------|-------|-------|
| `icon` | `Users` | Lucide; `aria-hidden` no componente |
| `title` | string acima | `max-w-[32ch]` já no EmptyState |
| `description` | omitido | Title auto-contido |
| `action` | `Button primary` | Abre modal existente de novo cliente |
| `forceTheme` | omitido | Herda tema ativo (barber/beauty × dark/light) |

---

## Estado atual vs alvo

| | Atual (`Clients.tsx`) | Alvo |
|---|----------------------|------|
| title | "Seus clientes aparecem aqui" | Frase completa UI-012 |
| description | Texto extra sobre agenda automática | Remover (redundante) |
| CTA | "Adicionar cliente" | Igual ✓ |
| Componente | `ui/EmptyState` | Igual ✓ |

---

## Critérios de aceite

- [ ] Renderiza quando `filteredClients.length === 0` e `!loading`
- [ ] Title exatamente: *Seus clientes aparecem aqui. Cadastre o primeiro ou importe da agenda.*
- [ ] CTA `Adicionar cliente` abre modal de cadastro existente
- [ ] Legível nos 4 modos (contraste body ≥ 4.5:1 em light)
- [ ] Touch target do botão ≥ 44px (Button `md` já conforme)
- [ ] Sem `animate-in` / page-load sequence no empty state

---

## Fora de escopo deste quick win

- Migração dos `BrutalCard` da grid de clientes
- `PageHeader` / filtros / modal de cadastro
- Importação da agenda (feature de produto — só mencionada na copy)

---

## Verificação manual

1. Login como owner → `/#/clientes`
2. Conta sem clientes (ou filtrar até lista vazia)
3. Confirmar copy + CTA nos temas barber/beauty dark/light (Settings → UiPreview ou toggle segmento)

---

## Esforço

**~15 min** (2 linhas de copy + remover description). PR independente do playbook completo de Clients (§2 do playbook).
