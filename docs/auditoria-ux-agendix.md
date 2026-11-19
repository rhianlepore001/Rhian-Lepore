# Auditoria de UX do AgendiX

Base revisada em 19 de novembro de 2026, no commit `1ab367e`. O mapa segue as rotas, os componentes e os dados que já alimentam cada tela.

| Área | Jornada existente | O que precisava ficar mais claro |
| --- | --- | --- |
| Entrada e primeiros passos | A landing leva à simulação ou ao cadastro. O login começa pela escolha do segmento. A recuperação envia um link por e-mail. O dono passa por negócio, serviços, equipe, horários e meta. O colaborador valida o convite no cadastro e segue para a própria agenda. | Dizer para que serve cada campo e o que o profissional verá ao entrar. Alinhar o texto do cadastro de serviços com o próximo passo. |
| Início | Dono e colaborador veem o próximo atendimento e atalhos. O dono vê receita, agenda da equipe e oportunidades. O colaborador vê seus atendimentos e comissões. | Fazer “Agendar” abrir o formulário e distinguir a ausência de um próximo atendimento de um dia sem histórico. |
| Agenda | A pessoa escolhe data e profissionais, cria ou altera atendimento, consulta o mês, analisa pedidos online e finaliza informando a duração. Bloqueio, aprovação e alteração seguem a permissão existente. | Dar nomes visíveis aos atalhos no celular e associar erros ao campo de tempo de trabalho. |
| Agendamento público e portfólio | O cliente abre o perfil do negócio, escolhe serviços, profissional, data, hora e informa os dados. O pedido pode ser individual ou em grupo. O portfólio do profissional leva ao mesmo agendamento. Minha Área mostra status, histórico e ações disponíveis. | Mostrar as etapas no celular, explicar a aprovação no modo manual e deixar acessível a ação de consultar horários no portfólio. |
| Fila | O cliente escolhe o serviço, informa seus dados e segue o fluxo de pagamento disponível. A posição aparece em Minha Área. Na operação, a equipe chama, atende, fecha a comanda e consulta o histórico. | Explicar qual número usar para acompanhar a posição, mostrar erros de consulta e permitir escolher a data do histórico. |
| Clientes e importação | O dono cadastra e filtra clientes. A ficha traz histórico e dados do cliente. O colaborador tem a visão permitida à equipe. A importação passa por origem, seleção, revisão e confirmação. | Recuperar uma busca vazia, diferenciar a ficha do atalho do WhatsApp e explicar em que momento a importação acontece. |
| Financeiro e análises | O dono troca o mês, vê receitas, despesas, saldo e margem, e abre pagamentos, histórico e desempenho. Análises cruza rankings com dados gerais do negócio. O colaborador consulta os próprios resultados. | Distinguir indisponibilidade de um zero medido, identificar quais números são do mês atual e facilitar o acesso ao desempenho da equipe no celular. |
| Resultados por hora | O dono usa os ajustes de contas, horários, materiais e margem. O colaborador vê ocupação e rendimento nos próprios resultados. | Explicar o que o indicador responde e como obter o primeiro resultado. |
| Clube e produtos | O cliente escolhe plano e forma de pagamento. O dono acompanha a confirmação pelos Assinantes, edita Planos e ajusta o Pix. Produtos têm busca, estoque e venda. | Indicar quando a confirmação ainda depende do estabelecimento, distinguir erro de lista vazia e oferecer recuperação da busca de produtos. |
| Ajustes | Geral, WhatsApp, agendamento, equipe e comissões, serviços, importação, clube, financeiro, plano e segurança. Auditoria, erros e lixeira seguem a visibilidade interna. Notificações ainda abre uma tela informativa. | Mostrar todas as seções acessíveis ao perfil em uma lista no celular e oferecer saída da tela de notificações. |
| Demonstração | A landing abre telas que usam os mesmos componentes do app com dados fictícios em memória. O usuário escolhe segmento e tema. | Manter os links do histórico da fila e da ficha do cliente dentro da simulação e renderizar as telas reais. |

## Ordem de revisão

1. Começar pelas decisões com efeito imediato no atendimento. O cliente precisa saber se já tem um horário, a equipe precisa encontrar a ação certa na agenda e o assinante precisa saber o que falta para ativar o plano.
2. Em seguida, tratar a recuperação de erro e de busca. Uma falha de consulta pede nova tentativa. Uma busca vazia pede outro termo, filtro ou data.
3. Por fim, conferir a leitura dos indicadores e a navegação em tela estreita. Revisar rótulos, ordem de foco, áreas de toque, tema e as diferenças de acesso entre dono e colaborador.
