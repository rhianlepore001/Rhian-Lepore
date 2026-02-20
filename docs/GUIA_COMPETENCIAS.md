# 📘 Manual de Competências Essenciais - Barber/Beauty OS

Este guia explica, de forma simples e direta, as "superpoderes" (Skills e Workflows) mais importantes do seu Agente para garantir o sucesso do seu SaaS.

---

## 🚀 1. O "Cérebro" (Planejamento)

Essas ferramentas garantem que **antes de escrever código**, nós saibamos exatamente o que fazer. Economiza tempo e dinheiro.

### `/brainstorm` (Tempestade de Ideias)
- **O que é:** Um bate-papo estruturado para transformar uma ideia vaga em um plano concreto.
- **Quando usar:** "Quero criar um sistema de fidelidade, mas não sei por onde começar."
- **Por que:** Evita retrabalho. O agente fará perguntas estratégicas (Socráticas) para "tirar a ideia da sua cabeça" e colocá-la no papel.
- **Como usar:** Digite `/brainstorm` no chat.

### `/plan` (O Arquiteto)
- **O que é:** Transforma o resultado do brainstorming em um passo-a-passo técnico (Checklist).
- **Quando usar:** Quando você já sabe O QUE quer (ex: "Integração com Stripe"), mas precisa saber COMO fazer.
- **Por que:** Cria um roteiro claro que evita que eu me perca no meio do código.
- **Como usar:** Digite `/plan` ou "crie um plano para X".

---

## 🎨 2. A "Cara" (Frontend & Design)

Essencial para o sucesso do seu sistema de temas duais (Barber/Beauty).

### Skill: `frontend-design`
- **O que é:** Especialista em interfaces modernas, UX (Experiência do Usuário) e beleza visual.
- **Quando usar:** "O modal de agendamento está feio", "Preciso melhorar a dashboard", "As cores do tema Beauty não estão combinando".
- **Por que:** Seu SaaS precisa ser bonito para vender. Essa skill garante que não faremos interfaces "quadradas" ou antigas.
- **Como usar:** Peça "Melhore o design desta página" ou "Aplique o tema Barber aqui".

---

## 🛡️ 3. A "Segurança" (Qualidade & Proteção)

Como lidamos com pagamentos e dados de clientes, isso é inegociável.

### Skill: `security-auditor` (via `vulnerability-scanner`)
- **O que é:** Um auditor chato que procura brechas de segurança no código.
- **Quando usar:** Antes de lançar uma grande atualização ou mexer na parte de pagamentos/login.
- **Por que:** Evita vazamento de dados e problemas com a LGPD.
- **Como usar:** Peça "Faça uma auditoria de segurança no arquivo X" ou "Verifique se o login está seguro".

### Workfow: `/test` (O Inspetor de Qualidade)
- **O que é:** Cria e roda testes automáticos para garantir que o sistema não quebrou.
- **Quando usar:** Depois de mexer em algo crítico (ex: agendamento). "Mudei o calendário, roda os testes pra ver se ainda agenda?"
- **Por que:** Dormir tranquilo sabendo que o cliente consegue agendar.
- **Como usar:** Digite `/test` ou "teste a função de agendamento".

---

## ⚙️ 4. A "Mecânica" (Banco de Dados & Código)

### Skill: `database-design` (Supabase Expert)
- **O que é:** Especialista em organizar as gavetas do banco de dados.
- **Quando usar:** "Preciso adicionar um campo de 'Aniversário' no cliente" ou "O sistema está lento para carregar agendamentos".
- **Por que:** Um banco mal organizado deixa o sistema lento e difícil de manter.
- **Como usar:** Peça "Crie a tabela de produtos" ou "Otimize essa consulta".

### Skill: `clean-code` (O Faxineiro Profissional)
- **O que é:** Garante que o código escrito seja limpo, organizado e fácil de entender (para humanos e robôs).
- **Quando usar:** SEMPRE. É uma regra global (lembra do GEMINI.md?).
- **Por que:** Código sujo vira um "espaguete" que ninguém consegue mexer depois de 6 meses.
- **Como usar:** Eu uso automaticamente, mas você pode pedir "Refatore esse arquivo para ficar mais limpo".

---

## 🚀 5. O "Lançamento" (Deploy)

### Workflow: `/deploy`
- **O que é:** O botão de "Publicar". Envia seu código do seu computador para a internet (Vercel).
- **Quando usar:** Quando tudo estiver pronto e testado.
- **Por que:** Automatiza a verificação de segurança, testes e envio, evitando que você esqueça algo.
- **Como usar:** Digite `/deploy`.

---

## 💡 Resumo para o Dia a Dia

1. **Teve uma ideia?** -> `/brainstorm`
2. **Vai começar a codar?** -> `/plan`
3. **Terminou e quer garantir?** -> `/test`
4. **Quer colocar no ar?** -> `/deploy`
