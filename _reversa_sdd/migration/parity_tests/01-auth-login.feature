# spec-id: PARITY-01
# origem: code-analysis.md (auth), sdd/auth.md
# target: target_architecture.md BC-1 Identity
# paradigma: funcional leve (service + hook)
# regras: BR-MIGRAR-001 a 010

@paridade @critico
Funcionalidade: Login e sessao

  Cenario: Login bem-sucedido de owner
    Dado que existe um owner registrado com email "owner@test.com" e senha "123456"
    E o rate limit nao esta excedido
    Quando o usuario faz login com email "owner@test.com" e senha "123456"
    Entao o sistema autentica via Supabase Auth
    E busca o perfil com role "owner"
    E seta companyId igual ao proprio id do usuario
    E redireciona para "/" se onboarding completado

  Cenario: Login bem-sucedido de staff com heranca
    Dado que existe um staff registrado vinculado a um owner
    Quando o staff faz login
    Entao o sistema busca o perfil do owner via company_id
    E herda subscription_status do owner
    E herda trial_ends_at do owner
    E herda user_type do owner
    E herda business_name do owner
    E busca teamMemberId em team_members

  Cenario: Rate limit excedido
    Dado que o usuario excedeu o limite de tentativas de login
    Quando tenta logar novamente
    Entao o sistema exibe "Muitas tentativas... aguarde 1 minuto"
    E nao executa signInWithPassword

  Cenario: Rate limit RPC indisponivel (fail-open)
    Dado que a RPC check_login_rate_limit esta fora do ar
    Quando o usuario tenta logar com credenciais validas
    Entao o sistema prossegue com o login normalmente
    E nao bloqueia o usuario

  Cenario: Staff sem owner encontrado (fallback)
    Dado que um staff tem company_id apontando para owner inexistente
    Quando o staff faz login
    Entao subscriptionStatus e setado como "subscriber"
    E trialEndsAt e null
    E userType e o proprio do perfil

  Cenario: Filtro por company_id em todas as queries
    Dado que um owner esta logado
    Quando qualquer query e executada no Supabase
    Entao o filtro user_id = companyId esta presente
    E dados de outro tenant nunca sao retornados

  @paridade
  Cenario: Trial ativo
    Dado que subscriptionStatus e "trial"
    E trial_ends_at e daqui a 3 dias
    Quando isSubscriptionActive e calculado
    Entao retorna true

  @paridade
  Cenario: Trial expirado
    Dado que subscriptionStatus e "trial"
    E trial_ends_at e ontem
    Quando isSubscriptionActive e calculado
    Entao retorna false
