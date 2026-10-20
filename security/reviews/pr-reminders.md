# PR proposto — autoriza job de lembretes e codifica dados do template

Referência temática incluída no escopo consolidado da branch `security/hardening-audit`. Entrega solicitada em PR único em rascunho; nenhum merge/deploy autorizado.

O handler de lembretes criava cliente service_role sem autorizar o caller e interpolava nomes em HTML. Agora exige POST e segredo exclusivo de job antes de consultar dados, codifica campos e retorna erros genéricos.

- Problemas: SEC-04 e SEC-06. Arquivos: `send-appointment-reminder/index.ts`, `edgeAuthorization.test.ts` e harness local.
- Aceite: JWT comum/segredo errado/configuração vazia não causam consulta/envio; OPTIONS e métodos indevidos sem efeitos; sender mock autorizado preservado; nomes exibidos como texto; detalhes internos ausentes da resposta/log.
- Evidência: 4 falhas iniciais da barreira; duas falhas suplementares de template/erro; resultado final 13/13. Revisão independente 9,2/10 no escopo.
- Riscos residuais: não há idempotência persistente; schema/joins e remetente são legados. Não considerar job pronto para ativação só pelos mocks.
- Plano futuro de deploy: validar schema e envio exclusivamente de teste; gerar REMINDER_JOB_SECRET forte, exclusivo e secreto no backend/scheduler; configurar x-reminder-secret; conferir gateway; aprovar ativação operacional. Sem segredo, 503; caller antigo sem header, 401.
- Rollback: desativar cron primeiro e reverter arquivo na janela autorizada. Reverter código reabre barreira e template vulneráveis. Não ligar cron antigo para contornar configuração.
