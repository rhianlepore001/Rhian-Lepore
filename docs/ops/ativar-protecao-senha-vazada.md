# A-05 — Proteção de senha vazada (Have I Been Pwned)

**Achado:** Supabase Security Advisor `auth_leaked_password_protection` = WARN.  
**Status (2026-10-15):** **risco aceito** por Rhian — projeto permanece no plano **Supabase Free**. A proteção de senha vazada (Have I Been Pwned) exige **Supabase Pro** (**US$25/mês**). Este doc **não altera Auth** nem código de runtime.

## Decisão

| Campo | Valor |
|-------|--------|
| Achado | A-05 — proteção de senha vazada desligada |
| Decisão | **Risco aceito** |
| Quem | Rhian |
| Quando | 2026-10-15 |
| Motivo | Permanecer no Supabase Free; feature só no Pro (US$25/mês) |
| Mitigação vigente | Política de senha no app: mínimo **8 caracteres + 1 maiúscula** (`utils/passwordPolicy.ts`) + **indicador de força** no cadastro/recuperação |

## Mitigação enquanto estiver no Free

O app já exige, no front (cadastro do dono, convite de colaborador, nova senha da recuperação):

- mínimo de 8 caracteres;
- pelo menos 1 letra maiúscula;
- indicador de força (fraca / forte / muito forte) para orientar o usuário.

O front (`describeServerWeakPassword`) já traduz o erro `pwned` / `weak_password` do Auth para pt-BR. Sem a flag no servidor (e sem Pro), esse caminho quase nunca dispara.

**Risco residual aceito:** senhas presentes em dumps públicos ainda podem ser aceitas no Auth até ativar a flag no Pro.

## Quando subir para o Pro — passo a passo

1. No [Dashboard Supabase](https://supabase.com/dashboard) → **Organization** / **Billing**, faça upgrade do projeto **AgendiX** (`lcqwrngscsziysyfhpfj`) para **Pro** (US$25/mês).
2. Abra o projeto → **Authentication** → **Providers** → **Email** (ou **Settings** → **Security**, conforme a UI atual).
3. Ative **Leaked password protection** / **Prevent use of leaked passwords** (Have I Been Pwned).
4. Salve. Confirme no advisor: **Authentication** → advisors / **Database** → **Security Advisor** — o aviso `auth_leaked_password_protection` deve sumir.
5. Atualize o status de A-05 no relatório de auditoria (deixar de ser “risco aceito” / fechar o achado).

## Referências

- Relatório: `/workspace/audit/relatorio-seguranca-agendix.md` (A-05)
- Política local: `utils/passwordPolicy.ts`
- Templates Auth: `supabase/templates/README.md`
