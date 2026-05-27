# spec-id: PARITY-02
# origem: code-analysis.md (onboarding), sdd/onboarding.md, gaps G1
# target: target_architecture.md BC-1 Identity
# paradigma: funcional leve
# regras: BR-MIGRAR-048, 049, 050

@paridade @critico
Funcionalidade: Onboarding

  Cenario: Source of truth e onboarding_progress
    Dado que um owner completou o wizard novo (onboarding_progress.is_completed = true)
    E business_settings.onboarding_completed e false (legado)
    Quando o sistema verifica onboarding
    Entao considera onboarding completado
    E nao redireciona para /onboarding

  Cenario: Redirect para onboarding se nao completou
    Dado que um owner fez login
    E onboarding_progress.is_completed e false
    Quando o login e bem-sucedido
    Entao redireciona para /onboarding

  Cenario: Wizard 5 steps com estado persistido
    Dado que o owner esta no step 3 do onboarding
    Quando recarrega a pagina
    Entao o sistema carrega onboarding_progress
    E retoma no step 3

  Cenario: Staff redireciona para staff-onboarding
    Dado que um staff fez login pela primeira vez
    E tutorial_completed e false
    Quando o login e bem-sucedido
    Entao redireciona para /staff-onboarding
