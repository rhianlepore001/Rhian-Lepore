-- Rollback de 20261031120000_signup_attribution.sql.
-- ATENÇÃO: apaga as origens já gravadas. Se quiser guardar, exporte antes:
--   COPY (SELECT * FROM public.signup_attribution) TO STDOUT WITH CSV HEADER;
-- O app continua funcionando sem a função (a gravação da origem é "melhor esforço" e o erro é ignorado).
DROP FUNCTION IF EXISTS public.save_signup_attribution(text, text, text, text, text, text, text, text, text, timestamptz);
DROP TABLE IF EXISTS public.signup_attribution;
