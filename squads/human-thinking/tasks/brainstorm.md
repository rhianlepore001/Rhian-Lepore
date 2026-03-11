# Task: Brainstorm

## Metadata
- agent: ideator
- elicit: true
- inputs: [theme, constraints, existing_features]
- outputs: [ideas_list, feature_pitches, feasibility_matrix]

## Description
Sessão de brainstorm estruturado. Spark gera ideias inovadoras conectando
tecnologias disponíveis com necessidades do negócio, priorizando por
viabilidade e impacto.

## Steps

### 1. Definir Tema
```
elicit:
  question: "Sobre o que vamos fazer brainstorm?"
  options:
    1: "Novas features para o produto"
    2: "Melhorias em features existentes"
    3: "Integrações com serviços externos"
    4: "Estratégias de engajamento/retenção"
    5: "Tema livre (descrever)"
```

### 2. Divergir (Gerar)
Regras da fase divergente:
- Quantidade sobre qualidade
- Sem julgamento
- Construir sobre ideias anteriores
- Pensar "e se..." sem limites

Gerar mínimo 10 ideias por tema.

### 3. Convergir (Filtrar)
Avaliar cada ideia em matriz 2x2:
- **Eixo X:** Esforço (baixo → alto)
- **Eixo Y:** Impacto (baixo → alto)

Categorizar:
- **Quick Wins** (baixo esforço, alto impacto) → Fazer primeiro
- **Big Bets** (alto esforço, alto impacto) → Planejar
- **Fill-ins** (baixo esforço, baixo impacto) → Se sobrar tempo
- **Money Pits** (alto esforço, baixo impacto) → Descartar

### 4. Pitch das Top 3
Para as 3 melhores ideias, gerar pitch:
1. **Problema:** O que resolve?
2. **Solução:** Como funciona?
3. **Impacto:** Qual o benefício mensurável?
4. **Esforço:** Estimativa de complexidade
5. **Stack:** Tecnologias necessárias
