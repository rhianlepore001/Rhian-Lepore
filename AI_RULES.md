# 🤖 AI Studio - Regras de Desenvolvimento

Este documento descreve a stack tecnológica e as diretrizes para o uso de bibliotecas no projeto, garantindo consistência e boas práticas.

## 🚀 Tech Stack

*   **Frontend Framework:** React (com Vite para build)
*   **Linguagem:** TypeScript
*   **Estilização:** Tailwind CSS (utility-first)
*   **Componentes UI:** shadcn/ui (baseado em Radix UI)
*   **Ícones:** lucide-react
*   **Roteamento:** React Router (HashRouter)
*   **Backend as a Service (BaaS):** Supabase (Autenticação, Banco de Dados PostgreSQL, Armazenamento de Arquivos, Funções Edge)
*   **Inteligência Artificial:** Google Generative AI (para funcionalidades de marketing e assistente)
*   **Gráficos:** Recharts (para visualização de dados financeiros)

## 📚 Regras de Uso de Bibliotecas

Para manter a consistência e a manutenibilidade do código, siga estas regras:

*   **React:** Use para construir todos os componentes da interface do usuário.
*   **TypeScript:** Utilize para toda a lógica e definição de tipos, garantindo segurança e clareza no código.
*   **Tailwind CSS:** **Obrigatório** para toda a estilização. Priorize classes utilitárias e evite CSS customizado sempre que possível.
*   **shadcn/ui:** Use os componentes pré-construídos para elementos comuns da UI. **Não edite os arquivos originais do shadcn/ui.** Se precisar de personalização, crie um novo componente que envolva ou adapte o componente do shadcn/ui.
*   **lucide-react:** Use para todos os ícones na aplicação.
*   **React Router:** Gerencie o roteamento da aplicação. Mantenha as definições de rotas centralizadas em `src/App.tsx`.
*   **Supabase:** É a única solução de backend. Use o cliente Supabase para interagir com autenticação, banco de dados e armazenamento.
*   **Google Generative AI:** Utilize para implementar funcionalidades de IA, como análise de fotos, geração de conteúdo e sugestões de campanhas.
*   **Recharts:** Para qualquer necessidade de visualização de dados em formato de gráficos.

## 📂 Estrutura de Arquivos

*   **`src/pages/`**: Contém os componentes de página (ex: `Dashboard.tsx`, `Login.tsx`).
*   **`src/components/`**: Contém componentes reutilizáveis (ex: `BrutalButton.tsx`, `Sidebar.tsx`).
*   **`src/contexts/`**: Contém os contextos React para gerenciamento de estado global.
*   **`src/lib/`**: Contém configurações de bibliotecas externas (ex: `supabase.ts`, `gemini.ts`).
*   **`src/utils/`**: Contém funções utilitárias diversas.
*   **Nomes de diretórios:** Devem ser sempre em minúsculas (ex: `src/pages`, `src/components`).
*   **Novos componentes/hooks:** Sempre crie um novo arquivo para cada novo componente ou hook, mesmo que pequeno. Evite adicionar novos componentes a arquivos existentes.