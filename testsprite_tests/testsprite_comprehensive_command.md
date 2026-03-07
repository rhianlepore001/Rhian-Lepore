# 🚀 Comando Exato - Teste Total AgenX (TestSprite)

Para executar o teste exaustivo de todas as funcionalidades, rotas e fluxos do sistema AgenX, utilize o comando abaixo. Este comando já contempla a Squad de QA (Quinn) e as interações específicas de Gateway e HashRouter.

## 🛠️ Comando CLI (TestSprite)

```bash
testsprite run --project "Rhian-Lepore-main" --test-scope codebase --additional-instruction "MANDATÓRIO: Use sempre o prefixo /#/ em todas as URLs de navegação (ex: http://localhost:3000/#/login). Na tela inicial de gateway, identifique e clique no card com o texto 'Barbearia' para acessar o formulário. Utilize as credenciais: Email 'rhian.lepore@example.com' e Senha 'password123'. Após o login, valide exaustivamente: Dashboard, Agenda, Fila (Dono), Clientes, Financeiro, Marketing, Insights e todas as telas de Configurações (Geral, Equipe, Serviços, Comissões, Assinatura, Segurança, Auditoria, Lixeira, Agendamento e Erros)."
```

## 🧠 Instruções de Contexto para a Squad

A Squad deve seguir estes portões de qualidade:
1.  **Navegação**: Confirmar que o `HashRouter` não quebra em nenhuma transição.
2.  **Gateway**: Validar que a seleção de tema (Barbearia/Beleza) persiste durante a sessão.
3.  **Segurança**: Verificar se rotas protegidas redirecionam corretamente para `/login` quando não autenticado.
4.  **UX**: Validar renderização de gráficos em Dashboards e Insights.

## 📋 Arquivos de Referência
- **Sumário de Rotas**: `testsprite_tests/tmp/code_summary.yaml`
- **Plano de Teste**: `testsprite_tests/testsprite_frontend_test_plan.json`

---
> [!NOTE]
> Certifique-se de que o servidor local está ativo em `http://localhost:3000` antes de disparar a Squad.
