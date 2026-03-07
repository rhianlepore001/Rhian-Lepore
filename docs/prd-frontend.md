# PRD Frontend — AgenX (AIOS)

> **Status**: [DRAFT] | **Versão**: 1.0.0
> **Objetivo**: Definir a interface e experiência do usuário (UX/UI) para o AgenX.

---

## 📱 1. Experiência Mobile-first (PWA)

O AgenX deve ser visto como um "app de rede social" para donos de barbearia (60 FPS, touch-optimized).

### 1.1 Navegação Principal (Bottom Navigation)

| Aba | Ícone | Funcionalidade Principal |
| :--- | :--- | :--- |
| **Dashboard** | `LayoutDashboard` | Métricas rápidas (Lucro no dia, Churn pendente, Ticket Médio) |
| **Agenda** | `Calendar` | Timeline Vertical. Foco em Swipe (Esquerda: Cancelar, Direita: Finalizar) |
| **IAOS Engine** | `Sparkles` | O "Cérebro". Sugestões de mensagens e recuperação de clientes |
| **Financeiro** | `DollarSign` | Fluxo de caixa diário e comissão da equipe |
| **Ajustes** | `Settings` | Perfil, Lixeira e Seleção de Temas |

---

## 🎨 2. Design System & Tematização

Usaremos **shadcn/ui** com **Tailwind CSS v4** para tematização dinâmica baseada em variáveis CSS (`--primary`, `--background`, etc).

### 2.1 Temas Disponíveis

- **Temas Brutalist (Barber)**: Bordas grossas, preto absoluto, cores de destaque neon (laranja ou verde), tipografia *Sans-Serif* robusta.
- **Temas Beauty (Elegant)**: Glassmorphism, tons pastéis ou off-white, bordas arredondadas, tipografia *Serif* sofisticada.

### 2.2 Componentes Visuais (Destaques)

- **Timeline Vertical**: Scroll infinito de agendamentos. Feedback visual por cor (Pendente = Amarelo, Finalizado = Verde).
- **Charts (Tremor)**: Gráficos minimalistas de linha e barra para dashboards financeiros.
- **Gesture Layer (Framer Motion)**: Feedback tátil e transições suaves entre abas.

---

## 🔄 3. Roteamento e Estado (React Router)

- **Rotas Públicas**: `auth/login`, `auth/register`, `booking/:id_publico`.
- **Rotas Privadas (Admin/Staff)**:
    - `/dashboard`
    - `/agenda`
    - `/iaos-engine`
    - `/financeiro`
    - `/configuracoes`

---

## ⚙️ 4. Fluxos Críticos de UX

### 4.1 Recuperação de Churn (Sócio AI)
1. Notificação no Dashboard: "3 clientes sumiram há mais de 30 dias".
2. Clique no alerta -> Abre lista de clientes frios.
3. Clique em "Recuperar" -> IAOS gera texto -> Abre modal com preview.
4. Botão "Enviar WhatsApp" -> Abre Deep Link do WhatsApp com texto colado.

### 4.2 Agendamento Público (Zero Fricção)
1. Link único da barbearia.
2. Seleção de serviço -> Filtro de profissional -> Horários Livres (60 FPS).
3. Confirmação rápida (Nome + WhatsApp).

---

## 🖼️ 5. Mídia & Performance (PWA Excellence)

- **Asset Compression**: Fotos de serviços convertidas para **WebP** no frontend (Canvas API) antes do upload.
- **Lazy Loading**: Imagens de portfólio e banners carregadas sob demanda.
- **Offline Mode**: Cache de agendamentos do dia via service worker.
