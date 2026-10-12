# E-mails do Supabase Auth (AgendiX, pt-BR)

Templates HTML gerados por `node scripts/email-templates/build-auth-email-templates.mjs`
(edite o script e rode de novo; não edite os `.html` à mão).

Compatíveis com Gmail, Outlook (botão VML), Apple Mail e celular: tabelas, CSS inline,
largura máxima 600 px, botão grande e link em texto como alternativa. O logo vem de
`https://www.agendixstudio.com/agendix-mark-dark.png` e é opcional (o nome "AgendiX" é texto).

## Onde colar (painel do Supabase)

Projeto `lcqwrngscsziysyfhpfj` → **Authentication → Emails → Templates**. Para cada aba:
apague o conteúdo, cole o arquivo inteiro em **Message body** (modo Source/HTML),
troque o **Subject** e clique em **Save**.

| Aba do painel          | Arquivo              | Assunto                                   | Usado hoje? |
|------------------------|----------------------|-------------------------------------------|-------------|
| Reset password         | `recovery.html`      | Redefina sua senha do AgendiX             | **Sim**     |
| Confirm signup         | `confirmation.html`  | Confirme seu e-mail no AgendiX            | Não (confirmação de e-mail desligada) |
| Magic link             | `magic_link.html`    | Seu link de acesso ao AgendiX             | Não         |
| Change email address   | `email_change.html`  | Confirme seu novo e-mail no AgendiX       | Não         |
| Invite user            | `invite.html`        | Você recebeu um convite para o AgendiX    | Não (convite de equipe usa link próprio) |

Variáveis usadas: `{{ .ConfirmationURL }}`, `{{ .Email }}` e, na troca de e-mail, `{{ .NewEmail }}`.

## URL de retorno (obrigatório para o link abrir no domínio certo)

**Authentication → URL Configuration**

- **Site URL:** `https://www.agendixstudio.com`
- **Redirect URLs** (Add URL, uma por linha):
  - `https://www.agendixstudio.com/**`
  - `https://agendixstudio.com/**`
  - `https://rhian-lepore.vercel.app/**`
  - `http://localhost:3000/**`
- Remover qualquer entrada com `promptdeelite.com`.

O app pede `redirectTo = <domínio atual>/?fluxo=nova-senha`. Se esse endereço não estiver
liberado, o Supabase ignora e usa o **Site URL**, que era o domínio antigo.

## Remetente profissional

O remetente "Supabase Auth <noreply@mail.app.supabase.io>" só muda com **SMTP próprio**
(Authentication → Emails → SMTP Settings → Enable custom SMTP). Sugestão:
`AgendiX <nao-responda@agendixstudio.com>`, via Resend (ou outro provedor), com SPF, DKIM e
DMARC publicados no DNS de `agendixstudio.com`. O SMTP padrão do Supabase também tem limite
baixo de envios por hora, inadequado para produção.

## Política de senha (app e servidor precisam bater)

Regra do app (`utils/passwordPolicy.ts`): mínimo de 8 caracteres e 1 letra maiúscula.
Número e símbolo são opcionais e só aumentam a força mostrada.

No painel: **Authentication → Providers → Email** (ou **Auth → Settings → Password**)
- **Minimum password length:** `8`
- **Password requirements:** `No required characters (default)`
- Se ligar "Prevent use of leaked passwords", o servidor pode recusar senhas vazadas; o app
  mostra "Senha fraca: ela já apareceu em vazamentos…".
