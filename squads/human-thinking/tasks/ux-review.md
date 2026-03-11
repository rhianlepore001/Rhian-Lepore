# Task: UX Review

## Metadata
- agent: reviewer
- elicit: true
- inputs: [target_flow, target_persona, target_page]
- outputs: [ux_report, friction_points, improvement_suggestions]

## Description
Review de experiência do usuário com perspectiva externa. Luna avalia
fluxos como se fosse um usuário real (owner, profissional ou cliente),
identificando pontos de fricção e sobrecarga cognitiva.

## Steps

### 1. Definir Perspectiva
```
elicit:
  question: "Qual perspectiva de usuário usar?"
  options:
    1: "Owner/Admin (primeira vez configurando)"
    2: "Profissional (usando no dia a dia)"
    3: "Cliente (fazendo booking online)"
    4: "Todas as perspectivas"
```

### 2. Selecionar Fluxo
```
elicit:
  question: "Qual fluxo ou página revisar?"
  options:
    1: "Onboarding (primeiro acesso)"
    2: "Dashboard (visão geral)"
    3: "Agendamento (criar/editar)"
    4: "Booking público (cliente)"
    5: "Financeiro (relatórios)"
    6: "Configurações"
    7: "Outro (especificar)"
```

### 3. Executar Review
Para cada tela do fluxo avaliar:
1. **Clareza:** O usuário sabe o que fazer? (1-5)
2. **Eficiência:** Quantos cliques até completar a ação?
3. **Feedback:** O sistema confirma as ações do usuário?
4. **Recuperação:** Consegue desfazer erros facilmente?
5. **Carga cognitiva:** Muita informação na tela? (1-5)

### 4. Gerar Relatório
- Mapa de friction points com severidade
- Screenshots/referências de cada problema
- Sugestões concretas de melhoria
- Priorização: quick wins vs mudanças maiores
