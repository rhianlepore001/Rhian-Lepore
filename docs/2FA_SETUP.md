# Configuração do 2FA (Two-Factor Authentication)

Este guia explica como ativar e gerenciar a Autenticação de Dois Fatores (2FA) no sistema AgenX.

## 🔐 O que é o 2FA?

A autenticação de dois fatores é uma camada adicional de segurança projetada para garantir que você seja a única pessoa que pode acessar sua conta, mesmo que alguém saiba sua senha.

## 🛠️ Como Ativar (Usuários)

1. Faça login no sistema AgenX.
2. Navegue até **Configurações > Segurança**.
3. Clique no botão **Ativar 2FA**.
4. Siga as instruções enviadas para o seu e-mail cadastrado.
5. Após confirmar o código, seu 2FA estará ativo e será solicitado em todos os novos logins.

## 👨‍💻 Informações para Desenvolvedores

O sistema utiliza o **Supabase Auth MFA** para gerenciar os fatores de autenticação.

### Fluxo de Implementação:
- **Enrolment:** O usuário solicita a ativação via `supabase.auth.mfa.enroll()`.
- **Verification:** O código enviado é validado (TOTP ou Email OTP conforme configuração do projeto).
- **Enforcement:** O `AuthContext` verifica o nível de autenticação (AAL) para restringir acesso a áreas sensíveis se necessário.

### FAQ / Resolução de Problemas
- **Não recebi o e-mail:** Verifique a pasta de spam ou solicite o reenvio após 2 minutos.
- **Perdi o acesso:** Entre em contato com o suporte da sua empresa para que um administrador (com acesso ao Supabase Service Role) possa resetar seus fatores de autenticação.

---
> [!NOTE]
> Esta funcionalidade é opcional, mas altamente recomendada para proteger dados financeiros e de clientes.
