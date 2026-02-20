# Plano: Metas Editáveis e Histórico de Metas

## 🎯 Objetivo
Permitir que o usuário (barbeiro/profissional) edite sua meta mensal diretamente no dashboard e mantenha um histórico real das metas definidas em meses anteriores.

## 0. Portão Socrático (Perguntas)
> [!IMPORTANT]
> Preciso das respostas abaixo para detalhar as fases de implementação:

1. **Armazenamento:** Prefere criar uma nova tabela `monthly_goals` (mais robusto) ou usar um campo JSON no `profiles` (mais simples)?
2. **Interface:** A edição deve ser um ícone de "lápis" ao lado da meta ou preferencialmente um modal de configurações?
3. **Escopo:** As metas devem ser individuais por mês ou uma meta global que pode ser alterada?

## 1. Análise Técnica (Atual)
- **Tabela:** `profiles` possui o campo `monthly_goal`.
- **Hook:** `useDashboardData.ts` gerencia o estado e atualização.
- **Frontend:** `Dashboard.tsx` exibe a meta mas não possui UI de edição.

## 2. Mudanças Propostas

### Banco de Dados
- Criar tabela `monthly_goals` (opcional, dependendo da resposta 1).
- Garantir permissões de RLS.

### Frontend
- Implementar modo de edição no componente de meta do `Dashboard.tsx`.
- Criar componente `GoalEditModal` (se necessário).
- Atualizar `GoalHistory.tsx` para ler dados reais do histórico em vez de calcular baseado na meta atual.

## 3. Verificação
- Testar salvamento de nova meta.
- Verificar se a barra de progresso reflete a nova meta imediatamente.
- Validar se meses anteriores mantêm suas metas originais.
