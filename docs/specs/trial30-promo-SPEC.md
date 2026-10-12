# SPEC — 30 dias de período de teste para os próximos 10 donos + status do teste no menu

## 1. Promoção (banco)
Os próximos 10 cadastros de dono feitos depois do deploy recebem 30 dias de período de teste.
A partir do 11º, volta automaticamente aos 20 dias (padrão do `handle_new_user`).

- Migração aditiva `20261012145609_signup_trial_promotion`:
  - tabelas `trial_promotions` (contador `used`/`max_uses`, `starts_at` = momento da aplicação) e
    `trial_promotion_grants` (PK `user_id`), as duas com RLS e sem grants para anon/authenticated;
  - trigger BEFORE INSERT `apply_signup_trial_promotion` em `profiles`.
- Não altera `handle_new_user`, `ensure_owner_profile`, `check_email_confirmed` nem os grants de profiles.
- Concorrência: a vaga é tomada com `UPDATE … WHERE used < max_uses` (row lock).
- Idempotência: um grant por usuário. A vaga volta se o cadastro falhar, porque está na mesma transação.

### Critérios
- [ ] Os 10 primeiros donos novos ganham 30 dias; o 11º e o 12º ficam com 20.
- [ ] Órfãos criados antes do início (via `ensure_owner_profile`), convites de staff e
      `ON CONFLICT` sobre um perfil que já existe não consomem vaga.
- [ ] 25 cadastros simultâneos usam exatamente 10 vagas.
- [ ] O cliente não lê nem altera a promoção. A migração aplicada 2x não muda nada.
- [ ] O rollback exato deixa as funções iguais às de prod (md5 + ACL).

## 2. Copy e banner (front)
- O banner fixo do topo (`TrialBanner`) sai.
- O status aparece num cartão compacto (`TrialStatusCard`): "Período de teste", dias restantes / "Termina amanhã" /
  "Termina hoje", e o botão Assinar. Expirado: "Período de teste encerrado" + Ver planos.
- O cartão fica dentro do menu lateral do celular (`MoreOptionsDrawer`) e da sidebar do desktop.
- Só usa as cores do tema (barbearia e salão). Não aparece para staff nem para assinante.
- "Teste grátis" passa a ser proibido no bundle (`check-bundle-strings`). Legal: "dias de período de teste".

### Critérios
- [ ] Sem banner no topo e com o header na posição normal.
- [ ] O cartão aparece no drawer (375px) e na sidebar (desktop), nos temas de barbearia e salão.
- [ ] Assinar leva para `/configuracoes/assinatura` e fecha o menu.
