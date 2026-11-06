# Custo por hora — etapa 1

O limite inicial de margem para “Rende pouco” é 20%, configurável pelo responsável. Esse valor é provisório e está pendente de decisão do Rhian.

Os custos fixos possuem vigência. Os horários individuais e os custos de material usam o valor atual; alterá-los pode modificar o cálculo de períodos anteriores. Profissionais hoje inativos podem ficar fora dos totais históricos. Atendimentos com vários serviços ou lançamentos ambíguos podem ficar sem classificação quando não for possível identificar seus custos com segurança.

O período considera a data agendada do atendimento, não necessariamente a data da conclusão ou do pagamento. Portanto, estes indicadores não substituem o relatório de caixa.

As políticas legadas de `finance_records` exigem auditoria adicional quanto ao acesso da equipe antes da publicação. A execução de SQL em PostgreSQL isolado usa dados fictícios; os testes das funções legadas utilizam definições versionadas com esquema e auxiliares simulados, e não comprovam equivalência ao banco de produção nem concorrência real.

As vendas de produtos no fluxo de fechamento são registradas antes da operação transacional de conclusão do atendimento. A atomicidade testada para a duração e o fechamento não inclui essas vendas prévias.
