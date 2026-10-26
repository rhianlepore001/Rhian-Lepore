# Mensagens do WhatsApp — PR 2/2

Base: `main` com #164. Migration preparada para revisão; nenhum SQL remoto ou deploy de produção foi executado.

## Comportamento

- Ajustes > Mensagens do WhatsApp: 14 mensagens em seis grupos, acesso exclusivo do gestor.
- Texto personalizado por negócio e mensagem. Sem linha ou com `body = null`, usa o padrão do código no tema do negócio.
- Desativar `booking_accepted`, `booking_confirmed`, `wizard_confirm` ou `reschedule` oculta a oferta/caixa de envio. Nas demais mensagens, o contato abre o WhatsApp sem texto.
- O editor valida as variáveis disponíveis, 1.000 caracteres Unicode, até três quebras seguidas e ausência de controles. A prévia e o texto são renderizados por React como texto.
- “Restaurar padrão” pede confirmação, grava `body = null` e preserva a opção Ativa.
- O teste usa o WhatsApp do perfil do usuário e dados fictícios relacionados ao negócio.

## Banco

`business_id` é `text`, com FK para `public.profiles(id)` e cascata, seguindo as outras tabelas do projeto. RLS reutiliza `get_auth_company_id()` e `get_auth_role()`: gestor gerencia somente o próprio negócio e profissional só lê o próprio negócio. O banco registra usuário e data de alteração.

Anon não tem acesso à tabela. A RPC `get_public_whatsapp_templates(p_slug text)` usa `SECURITY DEFINER`, `search_path = ''`, referências qualificadas e grants explícitos. Retorna apenas `message_key`, `enabled`, `body` das quatro chaves `client_*` e de `membership_overdue`/`membership_pending` do slug informado.

## Testes locais

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm test -- --run
bash scripts/test-sql-whatsapp-templates.sh
npx playwright install chromium
npx playwright test --config e2e/whatsapp-templates.config.ts
```

O script SQL precisa dos binários do Postgres (`initdb`, `pg_ctl`, `psql`). Descobre `/usr/lib/postgresql/*/bin` ou aceita `PGBIN`. Cria um cluster descartável com socket local, executa 32 checks, executa o rollback duas vezes, compara o schema anterior e reaplica a migration. Não aceita URL de banco remoto.

Os e2e usam somente um endereço fictício do Supabase, sessão fictícia e interceptação de rede. Cobrem os dois temas em 390 e 1440 pixels, edição, variáveis, prévia, salvamento, recarga, restauração, desativação, teste de WhatsApp, acesso do profissional, mensagens da Minha Área e aceite de pedidos. As novas verificações SQL e de navegador também rodam no CI do PR.

Para usar o Chromium do sistema: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. Para redirecionar os prints, use `SHOT_DIR`.

## Rollback

Arquivo: `docs/rollbacks/20261025121520_whatsapp_message_templates.rollback.sql`. Remove apenas os objetos novos e as personalizações desta funcionalidade. O frontend mantém os textos padrão quando a tabela/RPC não está disponível; a tela de edição exibe o erro de carregamento.

```sql
BEGIN;
DROP FUNCTION IF EXISTS public.get_public_whatsapp_templates(text);
DROP TABLE IF EXISTS public.whatsapp_message_templates;
DROP FUNCTION IF EXISTS public.stamp_whatsapp_message_template();
COMMIT;
```

## Prints

Dados fictícios; capturados pelos e2e.

| Tema | Cards mobile | Editor desktop | Prévia mobile |
| --- | --- | --- | --- |
| Barber | [Cards](screenshots/barber-mobile-cards.png) | [Editor](screenshots/barber-desktop-editor.png) | [Prévia](screenshots/barber-mobile-preview.png) |
| Beauty | [Cards](screenshots/beauty-mobile-cards.png) | [Editor](screenshots/beauty-desktop-editor.png) | [Prévia](screenshots/beauty-mobile-preview.png) |
