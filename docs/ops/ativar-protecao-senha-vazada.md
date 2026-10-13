# A-05 — Ativar proteção de senha vazada (Have I Been Pwned)

**Achado:** Supabase Security Advisor `auth_leaked_password_protection` = WARN.  
**Este PR não altera Auth** (exige ação no painel; pode depender do plano).

## Passo a passo (Rhian)

1. Abra o [Dashboard Supabase](https://supabase.com/dashboard) → projeto **AgendiX** (`lcqwrngscsziysyfhpfj`).
2. Vá em **Authentication** → **Providers** → **Email** (ou **Settings** → **Security**, conforme a UI atual).
3. Ative **Leaked password protection** / **Prevent use of leaked passwords** (Have I Been Pwned).
4. Salve. Confirme no advisor: **Authentication** → advisors / **Database** → **Security Advisor** — o aviso `auth_leaked_password_protection` deve sumir.

## O que o app já faz

O front (`utils/passwordPolicy.ts` → `describeServerWeakPassword`) já traduz o erro `pwned` / `weak_password` do Auth para pt-BR. Sem a flag no servidor, esse caminho quase nunca dispara.

## Risco residual

Até ativar no painel, senhas presentes em dumps públicos continuam aceitas no cadastro/recuperação (o mínimo local de 8 + maiúscula segue valendo).
