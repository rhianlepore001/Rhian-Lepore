-- Revoga acesso anon à função que pode deletar auth.users.
-- Apenas usuários autenticados (session ativa) podem chamar release_staff_email_for_reinvite.

REVOKE EXECUTE ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) FROM anon;
