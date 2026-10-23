# Resumo executivo — auditoria preventiva do AgendiX

Atualizado em 20/10/2026. O código recebeu correções verificadas localmente, mas **há problemas importantes abertos**. Esta auditoria não comprova a segurança de produção e não realizou deploy, merge, pagamentos, mensagens ou alterações em dados reais.

## O que foi analisado

Arquitetura multi-tenant, migrations e permissões de banco, funções privilegiadas, Storage, autenticação e equipe, agendamento público, Stripe, frontend, Vercel e dependências. A pasta anterior docs/audit não existe neste checkout; foram consultadas specs, documentação operacional e testes disponíveis. O mapa está em [recon.md](recon.md); o inventário de fontes pode ser gerado localmente, sem versionar o JSON gigante.

## Correções implementadas

| Área | Problema confirmado localmente | Resultado no código |
|---|---|---|
| Agendamento público | telefone expunha dados e permitia alterar cadastro | sem OTP; link privado exclusivo para ver/editar/cancelar, sem pré-preenchimento por telefone e sem sobrescrever CRM existente |
| Stripe | usuário conseguia escolher vínculo de customer pela RPC | somente backend autorizado vincula proprietário; customer existente exige metadata correspondente; conflito não sobrescreve |
| Retorno de checkout | domínio Vercel parecido era aceito | origens exatas; previews precisam ser cadastrados explicitamente |
| Lembretes | handler não autorizava o disparo privilegiado | POST + segredo exclusivo de job antes de consultar dados ou enviar |
| Template/erros | nomes viravam marcação HTML e erros internos eram devolvidos | nomes codificados como texto; resposta/log sem detalhes externos |

Também foi removido um parâmetro incompatível com o SDK Stripe declarado e corrigida a inicialização do SDK antes da validação de configuração. Nenhum preço, plano, período de teste, política de senha ou regra comercial foi alterado.

As migrations e seus rollbacks estão nos diretórios oficiais. A correção SEC-02 mantém o CRM intacto tanto no aceite manual quanto na confirmação automática; a falha de gravação do token reverte o pedido inteiro. Veja [reviews/sec02.md](reviews/sec02.md). O ciclo completo de aplicar, testar, reverter, testar e reaplicar foi executado em PostgreSQL descartável; duas tentativas concorrentes de vínculo produziram um sucesso e um conflito, preservando o cadastro.

## Problemas que continuam abertos

1. **Alcance da validação pública.** O acompanhamento e saída da fila, criação/leitura/cancelamento do clube e confirmação pendente agora usam tokens privados, com testes locais de autorização e atomicidade; veja [reviews/public-access-followup.md](reviews/public-access-followup.md). Recuperação por telefone continua bloqueada. Benefícios/descontos, todos os demais acessos de staff à fila e gateway Supabase/Realtime não foram certificados por esta revisão.
2. **Colaborador desativado — alto.** Com o perfil ainda vinculado, uma identidade anterior continua lendo clientes da empresa no fixture, mesmo com active=false. A autorização precisa considerar vínculo ativo em todas as policies/RPCs relevantes. Alterar somente o helper pode deixar caminhos alternativos e causar regressões.
3. **Equipe e financeiro — prioridade alta de investigação.** As policies ALL das fontes permitem que staff altere comissões/valores no modelo mínimo. A cópia completa do esquema de teste é necessária para conferir triggers, RPCs alternativas e corrigir sem quebrar a conclusão de atendimento.

Também permanecem pendentes: screenshots em bucket declarado público, MIME/tamanho de upload, chaves privadas de IA consumidas pelo browser se configuradas, ausência de webhook Stripe versionado, idempotência de lembretes e de sessões de checkout, configurações efetivas de Auth e exigência de segundo fator.

Os detalhes, perfis, passos e limites de cada achado estão em [findings.md](findings.md). Nenhum risco novo foi aceito em nome do proprietário.

## Testes e controles validados

- Typecheck, lint, build e a suíte completa foram reexecutados após as correções SEC-02 e passaram. Build manteve avisos de tamanho/importação de chunks; isso não representa falha de segurança reproduzida.
- **1.762 testes Vitest aprovados em 246 arquivos** após o ajuste SEC-02, incluindo os testes de booking privado e as regressões anteriores.
- **210 verificações de RLS** em dez fixtures com policies reais, incluindo CRUD externo, alteração de tenant, UPSERT e lote; operações legítimas do dono passaram no modelo.
- Testes de identidade bloquearam alteração de papel/empresa/id e edição de perfil de outro negócio.
- Doze suítes SQL anteriores foram reexecutadas: cadastro, equipe, permissões de edição, booking, antecedência/cancelamento, comissões, financeiro e Storage. Quatro rollbacks históricos também passaram.
- Três revisores independentes avaliaram a primeira entrega; no ajuste SEC-02, SQL recebeu **9,1/10** e frontend **9,2/10**, somente no escopo local, sem aprovar produção.

`npm audit` identificou **39 entradas**, incluindo ferramentas de desenvolvimento e alertas de funcionalidades de servidor que não foram identificadas no HashRouter do app. Isso não equivale a 39 falhas exploráveis. A análise e o plano de atualização estão em [tests/dependencies.md](tests/dependencies.md).

## Limites e decisões necessárias

Não existe Supabase local completo nem catálogo de staging certificado neste ambiente. Os testes SQL usam subconjuntos explícitos do esquema. Auth real, revogação/refresh de sessões, entrega de emails, Storage HTTP, Stripe test/webhooks e E2E de navegador não foram executados. Chromium e Deno estão ausentes. O proprietário informou que não possui ambiente separado. Foi preparado um [inicializador local](local/README.md), mas o download oficial dos componentes foi bloqueado pela rede; a estrutura atual do banco também continua necessária. Nenhum serviço remoto não classificado foi usado.

- **A-05 continua como risco anteriormente aceito**, conforme decisão de 15/10: permanecer no Supabase Free sem proteção de senhas vazadas associada ao plano pago. Não houve alteração de plano, senha ou configuração Auth. Confirmar disponibilidade/preço atuais antes de qualquer contratação.
- A escolha aprovada em 20/10 é **agendar sem OTP e gerenciar cada horário por link privado**. Guardar/compartilhar o link equivale a conceder acesso àquele horário. Link perdido e reserva antiga sem token exigem contato com o estabelecimento; não há recuperação por telefone. Nenhum email/SMS foi enviado.
- Validar configurações Auth (redirecionamentos, confirmação/troca de email, limites, JWT e MFA) no projeto de teste antes de qualquer mudança operacional.
- CSP permanece **Report-Only**. Enforce exige validação em preview e aprovação, preservando Stripe, imagens e conexões necessárias.
- Antes de ativar as mudanças de Stripe: validar metadata de customers legados por fonte confiável e coordenar Edge/migration. Customer sem metadata será bloqueado; não reconciliar apenas pelo email. Assinatura/eventos precisam de contrato e fixtures próprios.
- Antes de ativar lembretes: validar schema/remetente/cron e configurar segredo forte somente no backend. Idempotência ainda precisa de solução persistente.

## Preparação para revisão e produção

As alterações foram reunidas na branch `security/hardening-audit` para entrega em um PR único em rascunho, conforme autorização de 20/10/2026. As três descrições temáticas em [reviews/](reviews/) permanecem como referências técnicas do escopo consolidado. Não há autorização para merge ou deploy. O rollback de billing foi testado, mas reabre o problema original: só deve ser considerado em janela coordenada e autorizada.

O próximo passo é validar os riscos abertos e os fluxos integrados em ambiente com esquema fiel e dados fictícios. Não tratar o build ou as notas locais dos patches como aprovação para publicar o produto inteiro.
