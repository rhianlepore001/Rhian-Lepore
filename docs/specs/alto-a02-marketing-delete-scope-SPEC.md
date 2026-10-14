# A-02 — marketing_images writes + Authenticated Delete

## Problema
1. `marketing_images` INSERT/UPDATE/DELETE só checam `authenticated` (qualquer tenant).
2. `Authenticated Delete` apaga em logos/covers/team_photos/service_images sem pasta do dono, OR-ampliando as policies folder-scoped.

## Usos mapeados
| Bucket | Front | Path |
|---|---|---|
| marketing_images | **nenhum** em components/pages/services | — |
| logos / covers | `GeneralSettings` `uploadFile(..., user.id)` | `${user.id}/…` |
| team_photos | `TeamMemberForm` | `${user.id}/…` |
| service_images | `serviceSettings.uploadServiceImage` | `${companyId}/…` |

## Correção
DROP das 4 policies amplas. SELECT público de marketing permanece. Policies por pasta permanecem.
