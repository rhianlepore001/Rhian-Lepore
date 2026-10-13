# A-01 — client_photos tenant isolation

## Problema
Policy `Authenticated users manage client_photos` permite a qualquer `authenticated` INSERT/UPDATE/DELETE em todo o bucket.

## Usos mapeados
| Fluxo | Path | Quem |
|---|---|---|
| CRM `pages/Clients.tsx` | `${authUser.id}/${ts}.ext` | owner/staff autenticado |
| Booking público `uploadClientPhoto` | **antes** `public_${businessId}_${ts}.ext` (plano); **depois** `${businessId}/public_${ts}.ext` | anon (falha graciosa) / dono logado |
| Leitura | `getPublicUrl` + SELECT público | páginas públicas e CRM |

## Correção
- DROP da ALL ampla; INSERT/UPDATE/DELETE só na pasta `auth.uid()`.
- Path público passa a pasta do `businessId` (= owner id).
- SELECT público mantido.

## Não faz (de propósito)
- Migrar objetos planos antigos `public_*` (residual: dono não apaga via nova policy).
- INSERT anon (spam); booking já degrada sem foto.
