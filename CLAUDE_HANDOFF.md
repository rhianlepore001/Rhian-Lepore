# Plano de Transição: Experiência do Staff (US-015C)

Este documento detalha o estado atual da tarefa e as instruções para que o **Claude Code** (ou outro agente) finalize a implementação.

## Estado Atual

A implementação da **Experiência do Staff** está em progresso. O objetivo é garantir que usuários com cargo `staff` herdem o plano da empresa e vejam uma interface simplificada, focada apenas nas suas próprias atividades.

### O que já foi feito:
1.  **Banco de Dados**: Criada a migration `supabase/migrations/20260307_staff_user_id.sql` (adiciona `staff_user_id` na tabela `team_members`).
2.  **AuthContext**: Atualizado para buscar dados do dono quando o usuário é staff, herdando `subscription_status`. Também busca o `teamMemberId` do profissional vinculado.
3.  **UI Geral**: `TrialBanner`, `PaywallModal` e o botão de configurações no `Header` foram ocultados para staff.
4.  **Configurações**: O menu lateral em `SettingsLayout.tsx` agora mostra apenas "Serviços" para o staff.
5.  **Financeiro**: A página `Finance.tsx` foi parcialmente adaptada.

## Pendências Críticas (Bloqueadores)

### 1. Corrigir Erros de Lint no [Finance.tsx](file:///c:/Users/User/Downloads/Rhian-Lepore-main/pages/Finance.tsx)
Durante a aplicação da lógica condicional (`!isStaff && (...)`), o fechamento das tags JSX e blocos de código ficou desbalanceado, causando erros em cascata a partir da linha 900.
- **Sintoma**: Variáveis como `activeTab`, `monthlyHistory`, `accentColor` aparecem como "não encontradas" na parte inferior do arquivo (JSX fora do escopo do `return`).
- **Ação**: Revisar os blocos `isStaff` e `!isStaff` abertos entre as linhas 500 e 900 para garantir que todos os `(` e `{` foram fechados corretamente.

### 2. Aplicar Migration no Supabase
A migration `20260307_staff_user_id.sql` foi criada localmente mas ainda precisa ser executada no banco de dados via console do Supabase ou ferramenta CLI.

### 3. Filtro de Transações no Financeiro
A lógica para mostrar apenas as transações do próprio staff (usando o `teamMemberId` obtido no `AuthContext`) precisa ser verificada no componente `Finance.tsx`.

## Links e Arquivos Chave
- Plan de Implementação Principal: [implementation_plan.md](file:///C:/Users/User/.gemini/antigravity/brain/bfad74e5-50e3-49d0-805b-afe3b292c954/implementation_plan.md)
- Arquivo com erro: [Finance.tsx](file:///c:/Users/User/Downloads/Rhian-Lepore-main/pages/Finance.tsx)
- Migration pendente: [20260307_staff_user_id.sql](file:///c:/Users/User/Downloads/Rhian-Lepore-main/supabase/migrations/20260307_staff_user_id.sql)

## Próximos Passos Sugeridos
1.  Reparar a estrutura JSX do `Finance.tsx`.
2.  Executar a migration SQL.
3.  Testar o login com um usuário `staff` e validar se o Financeiro mostra apenas os cards "Meu Giro" e "Atendimentos".
4.  Validar se a lista de transações está filtrada (ainda precisa ser conferido se o `teamMemberId` está sendo passado para a query de `fetchFinanceData`).
