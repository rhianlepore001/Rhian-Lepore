# Setup do ambiente de teste — 1 mês de dados sintéticos

Antes de rodar a auditoria com os agentes especialistas, você precisa de um tenant com densidade de dados realista. Sem isso, o agente não consegue testar cenários como "agendamento no passado", "comissão de barbeiro que faltou", "fila com ciclo completo".

## O que o script cria

| Item | Quantidade | Configuração |
|---|---|---|
| Profissionais | 3 (já tem você como dono) | Comissão 40%, especialidades em `bio` |
| Serviços | 6 | Corte, Barba, Combo, Sobrancelha, Pigmentação, VIP |
| Clientes | 50 | Nomes brasileiros, telefones válidos (DDDs variados) |
| Agendamentos | 150 | 50% passados (Completed/Cancelled), 30% hoje, 20% futuros |
| Fila | 1 ciclo + 2 esperando | Status: completed/waiting |

**Faturamento esperado**: ~R$ 8.000–15.000/mês (varia por sorteio).

> NPS não é criado: a tabela `nps_responses` não existe nas migrations do projeto. Quando for adicionada, dá pra estender o script.

## Como rodar

### 1. Confirme o .env.local

```bash
cd /root/projetos/Rhian-Lepore
cat .env.local | grep VITE_SUPABASE
```

Deve mostrar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Se não tiver, copie de `.env.example` ou peça pro Rhian.

### 2. Rode o seed

**Opção A — Terminal interativo (humano no desktop):**
```bash
node agendix-e2e-test/06-template-setup/scripts/seed.mjs
```
O script pede a senha da `bob.teste@gmail.com` via prompt. Digita, Enter, segue.

**Opção B — Agente / ambiente não-interativo (sem TTY):**
```bash
$env:SEED_PASSWORD = "SuaSenha"  # PowerShell
# ou
export SEED_PASSWORD="SuaSenha"  # bash

node agendix-e2e-test/06-template-setup/scripts/seed.mjs
```
A senha fica só no env do processo — não vai pro histórico do shell nem pro git. Pra limpar depois: `Remove-Item Env:SEED_PASSWORD` (PowerShell) ou `unset SEED_PASSWORD` (bash).

### 3. Valide

Abra https://app.agendix.com.br/#/reports (ou sua URL de produção) e confirme:

- [ ] Faturamento do mês está entre R$ 8.000 e R$ 15.000
- [ ] 3 funcionários aparecem comissionados
- [ ] Tem agendamentos passados (Completed, alguns Cancelled)
- [ ] Tem agendamentos futuros (Confirmed, alguns Pending)
- [ ] Fila digital tem 1 completed e 2 waiting

## Schema real (referência pra quem for auditar)

Pra evitar o que aconteceu na primeira rodada (script inventando coluna que não existe), anote:

- `team_members` tem coluna `bio` (não `specialty`) pra texto livre do profissional
- `queue_entries` tem `business_id` (FK → `profiles.id`), **não** `user_id`
- `queue_entries.service_id` é UUID (FK → `services.id`), **não** texto
- `queue_entries.status` aceita: `waiting | calling | serving | completed | cancelled | no_show` (não `finished`)
- Tabela `nps_responses` **não existe** no schema atual

Tudo isso foi confirmado nas migrations em `supabase/migrations/20260218_team_setup.sql` e `supabase/migrations/20260218_queue_system.sql`.

## Idempotência

O script checa o que já existe antes de criar. Se rodar 2x, ele só adiciona o que falta.

**Não deleta nada.** Se quiser resetar, use o painel admin do Supabase ou rode uma migration `factory_reset`.

## Se algo der errado

- **"Login falhou"**: senha errada. Tenta de novo.
- **"Erro criando profissionais: ..."**: geralmente RLS barrando. Confirme que você tá logado como owner.
- **"Fila: relação não existe"**: a tabela `queue_entries` pode ter nome diferente no seu schema. Olha o nome em `supabase/migrations/*queue*`.
- **"NPS: ..."**: idem, tabela pode ter outro nome (`nps`, `feedback`, `ratings`).

Em qualquer caso, me chama que eu ajusto o script.

## Quando terminar

Sinal verde pra começar o **Loop 1 — Pesquisa de mercado + personas** (AppBarber, Trinks, Booksy, relatos reais).
