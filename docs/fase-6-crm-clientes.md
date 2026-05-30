# Fase 6 - CRM/Clientes

## Objetivo

Migrar as regras centrais do CRM para contratos reaproveitaveis: tier de fidelidade por visitas e deduplicacao flexivel por telefone. O objetivo e evitar clientes duplicados e padronizar a classificacao usada pela lista de clientes.

## Entregas

- `types/crm.ts`
  - Schema/tipos de cliente, cliente publico, input de criacao e `LoyaltyTier`.

- `services/crm.ts`
  - `calcLoyaltyTier`: Bronze 0-5, Silver 6-15, Gold 16-30, Platinum 31+.
  - `normalizePhone` e `phonesMatch`: deduplicacao ignorando mascara e codigo de pais.
  - `findClientByPhone`: busca cliente existente por telefone flexivel.
  - `createClient`: cria cliente manual sem duplicar telefone.
  - `syncPublicClientsToCrm`: sincroniza `public_clients` para `clients` com Bronze, 0 visitas e `source='agendamento_online'`.

- `hooks/useCrm.ts`
  - Mutations TanStack para criar cliente e sincronizar public clients.

- `pages/Clients.tsx`
  - Sincronizacao de clientes publicos saiu do componente e foi para service.
  - Criacao manual usa service com deduplicacao por telefone.
  - Tier exibido/persistido passa pelo calculo padronizado.

## Criterios Reversa cobertos

- BR-MIGRAR-051: loyalty tier calculado por visitas.
- BR-MIGRAR-052: deduplicacao por telefone com formatos flexiveis.
- Paridade 08:
  - 8 visitas retorna Silver.
  - 3 visitas retorna Bronze.
  - 35 visitas retorna Platinum.
  - `+5511987654321` e `11987654321` sao tratados como mesmo telefone.
  - `public_clients` novos viram `clients` com Bronze, `total_visits=0` e `source='agendamento_online'`.

## Testes

- `test/services/crm.test.ts`
  - 6 testes cobrindo tier, phone matching, busca por telefone, bloqueio de duplicata, criacao manual legacy e sincronizacao public_clients.

## Pendencias de validacao real

- Aplicar em staging e testar com telefones BR/PT reais.
- Confirmar que a coluna `source` existe em todos os ambientes.
- Validar visualmente a tela `/clientes` com clientes vindos de booking publico.
