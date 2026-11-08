# Custo por hora — etapa 1

## Decisões e cálculo
- “Rende pouco”: 20% continua **provisório, não aprovado**, configurável; não houve nova decisão de produto.
- Custos fixos por horas disponíveis, pró-labore opcional desligado por padrão, despesas apenas para pré-preenchimento e um material por serviço.
- Receita bruta do serviço usa `appointments.price`, valor final persistido pelo fechamento versionado. Um lançamento legado líquido não ocasiona nova dedução da mesma taxa. Comissão vem de um único lançamento de receita não-produto; casos ambíguos continuam pendentes. Comissão registrada para o dono não é deduzida como custo novamente.
- Custo/hora disponível = (fixos + comissão + material + taxa) / horas disponíveis. Margem/hora disponível = receita/hora disponível menos esse custo; não se subtraem taxas com denominadores diferentes.
- Data do atendimento agendado define o período, não o caixa. Multisserviços textuais sem identificação inequívoca/material/financeiro ficam sem classificação, e atendimentos sem profissional são explicitamente avisados.

## Histórico
- A migration adicional `20261108150422_chair_hour_hardening.sql` preserva snapshots de jornada do negócio/profissional, vínculo ativo e material em schema privado. Alterações de jornada valem no próximo dia local; material passa a valer no instante do registro para a data agendada. A UI informa a vigência.
- A configuração existente na implantação vira uma **base inicial estimada**, não um histórico factual inventado. Períodos anteriores exibem esse aviso. Profissionais inativos com atendimentos antigos permanecem no relatório; quando a jornada anterior é desconhecida, disponibilidade/custos/margem ficam nulos, mas rendimento conhecido continua visível.
- Alterar material/jornada/inativar depois da implantação não reescreve períodos anteriores. Bloqueios anteriores ao dia corrente são imutáveis para usuários; correções administrativas explícitas precisam de avaliação separada.
- Fuso é preservado na configuração histórica. Períodos atravessando uma mudança de fuso são rejeitados conservadoramente e precisam ser divididos, em vez de mostrar um agregado potencialmente incorreto.
- Exclusão física de cadastros históricos não é reconstruída por esta etapa. A garantia usa os vínculos e registros preservados no esquema; não recupera dados já apagados.

## Segurança e fechamento
- Policies **restritivas** intersectam policies legadas e impedem leitura direta da equipe de `finance_records`, `products` e `product_sales`. Catálogo do checkout usa projeção explícita sem custos; venda avulsa da equipe devolve campos de custo/comissão nulos, mantendo estoque e recibos reais.
- Funções financeiras legadas enumeradas na migration recebem guarda owner-only. Entradas legadas de conclusão também validam papel, vínculo ativo/próprio e referências do tenant. Funções internas de produto ficam em schema privado sem grants de cliente.
- Agenda e fila enviam serviço, duração e produtos em **uma transação**. Locks serializam retries/conclusões simultâneas; falha de estoque reverte também duração, atendimento, financeiro e estado da fila. Produtos mantêm recibo próprio ligado ao atendimento, sem sobrescrever o recibo do serviço.
- Tempo igual ao agendado continua estimado, inclusive após +10 e -10. Não existem botões Começar/Terminar.

## Validação local e limites
- `scripts/test-sql-chair-hour.sh`: testes originais de contrato da etapa, com auxiliares simplificados.
- `scripts/test-sql-chair-hour-legacy.sh`: funções reais versionadas de conclusão, fila, venda, financeiro, tenant e normalização de telefone em esquema representativo e dados fictícios. Inclui RLS legado, acesso staff/inativo/outro tenant, 1001 atendimentos, histórico, recibos, rollback de falha, duas sessões PostgreSQL concorrentes para agenda **e** fila, aplicação dupla e rollback duplo da migration.
- Executado isoladamente em PostgreSQL 17.6 (e também 18.4), sem conexão com produção. Isto não afirma identidade completa com todos os triggers/grants/drift do banco implantado.
- Playwright usa os componentes reais e dependências de dados simuladas: 320/390 px × barber/beauty × claro/escuro, cartão e checkout. Não é contratação/pagamento real nem integração com clientes reais.
- Integração remota, merge e deploy dependem da parada confirmada do Codex e revisão do delta. Nada desta execução local aplica migrations em produção.
- Rollback adicional: exportar `chair_hour_private.history` e `routine_backup` antes; executar o rollback adicional **antes** do rollback da etapa original. Definições e ACLs originais são preservadas para restauração.
