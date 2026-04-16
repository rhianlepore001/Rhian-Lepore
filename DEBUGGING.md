# DEBUGGING.md

Guia de debugging — problemas recorrentes e como resolver.
Consulta este arquivo antes de gastar tempo debugando algo que pode ser um problema conhecido.

---

## Problemas críticos (ocorrem com frequência)

### 1. RLS bloqueia silenciosamente

**Sintoma**: Query retorna array vazio `[]`, sem erro.

**Causa**: RLS está ativa e o `company_id` não está sendo filtrado, ou a policy não cobre o caso de uso.

**Diagnóstico**:
```ts
// Adicione .select('*') sem filtro para testar
const { data, error } = await supabase.from('tabela').select('*');
// Se error é null mas data é [], é RLS bloqueando
```

**Solução**:
- Verifique se a query filtra por `company_id` obtido de `useAuth()`
- Verifique se a policy RLS cobre a operação (SELECT, INSERT, UPDATE, DELETE)
- Para acesso anônimo (booking público, fila), use RPC com `SECURITY DEFINER`

**Nunca** desabilite RLS sem entender o impacto completo.

---

### 2. RLS em `public_bookings` — acesso anônimo vs autenticado

**Sintoma**: Erro "new row violates row-level security policy for table" ao inserir booking público.

**Causa**: Policies para usuários autenticados e anônimos interagem mal. A policy "Owner can manage" pode interceptar requests anônimos.

**Solução**:
- Use RPCs com `SECURITY DEFINER` para fluxos públicos: `secure_create_booking`, `edit_booking_rpc`
- Policies anônimas devem ser explícitas com `USING (true)` apenas para operações específicas
- Nunca misture policies autenticadas e anônimas na mesma tabela sem testar ambas

**Histórico**: Pelo menos 5 migrations de fix (20260226 a 20260321).

---

### 3. HashRouter — links quebrados

**Sintoma**: Navegação funciona no dev mas quebra em produção, ou link direto retorna 404.

**Causa**: Link usando `/rota` em vez de `/#/rota`.

**Solução**:
- Links internos: sempre `/#/rota`
- Navegação programática: `navigate('/#/rota')` ou use `<a href="/#/rota">`
- `vercel.json` tem rewrite para SPA fallback, mas HashRouter já lida com roteamento no client

---

### 4. `React.lazy()` sem `<Suspense>` causa crash

**Sintoma**: Tela branca ou erro de render ao navegar para página lazy-loaded.

**Causa**: `React.lazy()` exige `<Suspense>` wrapper. Sem ele, o componente não tem fallback de loading.

**Solução**:
```tsx
const Page = React.lazy(() => import('./pages/Page').then(m => ({ default: m.PageName })));

// No route:
<Suspense fallback={<Loading />}>
  <Page />
</Suspense>
```

- Verificar `App.tsx` — todas as rotas lazy já devem ter Suspense
- Se criar nova página, seguir o padrão existente

---

### 5. `OwnerRouteGuard` bloqueia acesso de staff

**Sintoma**: Staff não consegue acessar página que deveria.

**Causa**: Página protegida por `OwnerRouteGuard` e o usuário tem role `staff`.

**Solução**:
- Verificar se a página deve ser acessível por staff
- Se sim, remover `OwnerRouteGuard` ou adicionar lógica condicional
- Se não, informar o usuário que a restrição é intencional

---

## Problemas de dados

### 6. Duplicação de registros financeiros

**Sintoma**: `finance_records` com entradas duplicadas para o mesmo agendamento.

**Causa**: Race condition ou double-click no botão de concluir agendamento.

**Solução**:
- Verificar se já existe registro com `appointment_id` antes de inserir
- Migration `20260301_cleanup_duplicate_finance_records.sql` fez cleanup
- Adicionar debounce no botão de ação

---

### 7. Cliente público não aparece no CRM

**Sintoma**: Cliente fez booking público mas não aparece na lista de clientes.

**Causa**: Espelhamento via `PublicClientContext` faz upsert direto em `clients`, mas como role anônimo o RLS bloqueia silenciosamente.

**Solução**:
- Usar RPC `mirror_public_client_to_crm` com `SECURITY DEFINER`
- Esta RPC contorna RLS inserindo com permissões do dono do negócio
- Verificar se o `source` do cliente está correto (`agendamento_online`)

---

### 8. `company_id` TEXT vs UUID — comparações falham

**Sintoma**: Query com JOIN ou comparação de `company_id` retorna resultados inesperados.

**Causa**: `profiles.company_id` é TEXT, mas outras tabelas e RPCs tratam como UUID.

**Solução**:
- Verificar o tipo da coluna antes de comparar
- Se necessário, cast explícito: `company_id::uuid`
- Ver `DECISIONS.md` ADR-010 — padronização pendente

---

## Problemas de UI

### 9. Tema inconsistente (barber vs beauty)

**Sintoma**: Elemento visual não muda entre temas.

**Causa**: Classes CSS hardcoded sem condicional `isBeauty`.

**Solução**:
- Usar o padrão: `isBeauty ? 'classe-beauty' : 'classe-barber'`
- Componentes base (`BrutalCard`, `BrutalButton`) já lidam com tema
- Se criar componente novo, aceitar `forceTheme` prop se necessário

---

### 10. Responsividade mobile quebrada

**Sintoma**: Layout quebra em celular, elementos sobrepostos ou cortados.

**Causa**: Estilos pensados para desktop primeiro.

**Solução**:
- **Mobile first**: escrever CSS para mobile primeiro, depois adicionar breakpoints maiores
- Usar `useUI().isMobile` para lógica condicional
- Testar em Chrome DevTools com emulação Android
- Barbeiros usam celular — isso é prioridade

---

## Checklist de debugging

Antes de investigar um bug novo:

1. [ ] Consultou este arquivo? O problema pode ser conhecido.
2. [ ] Verificou o console do browser? Erros do Supabase aparecem lá.
3. [ ] Testou com usuário autenticado E anônimo? RLS pode afetar apenas um.
4. [ ] Testou em mobile? Layout pode quebrar apenas lá.
5. [ ] Verificou `company_id` na query? RLS silencioso é o #1 suspeito.
6. [ ] Consultou `DECISIONS.md`? Pode haver uma decisão relacionada.
7. [ ] Verificou as migrations recentes? Pode ter mudado schema ou policy.
