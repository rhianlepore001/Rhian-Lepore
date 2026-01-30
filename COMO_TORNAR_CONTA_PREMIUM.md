# 🎯 Como Tornar a Conta rhianlepore@gmail.com Premium

## Opção 1: Usando o Supabase Dashboard (Recomendado)

### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta

2. **Selecione o Projeto**
   - Escolha o projeto do Beauty OS / Barber OS

3. **Abra o SQL Editor**
   - No menu lateral, clique em **SQL Editor**
   - Ou acesse diretamente: `https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/sql/new`

4. **Execute o Script**
   - Copie todo o conteúdo do arquivo: `supabase/migrations/update_premium_account.sql`
   - Cole no SQL Editor
   - Clique em **Run** (ou pressione Ctrl+Enter)

5. **Verifique o Resultado**
   - Você deve ver uma tabela com os dados da conta
   - Confirme que `subscription_status` está como `'subscriber'`
   - Confirme que `trial_ends_at` está como `NULL`

---

## Opção 2: Usando a Interface do Supabase Table Editor

### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta

2. **Abra a Tabela Profiles**
   - No menu lateral, clique em **Table Editor**
   - Selecione a tabela `profiles`

3. **Adicione as Colunas (se não existirem)**
   - Se não existir a coluna `subscription_status`:
     - Clique em **Add Column**
     - Nome: `subscription_status`
     - Tipo: `text`
     - Default: `'trial'`
   - Se não existir a coluna `trial_ends_at`:
     - Clique em **Add Column**
     - Nome: `trial_ends_at`
     - Tipo: `timestamptz`

4. **Encontre a Conta**
   - Use o filtro para buscar por email: `rhianlepore@gmail.com`

5. **Edite a Linha**
   - Clique na linha da conta
   - Altere `subscription_status` para: `subscriber`
   - Altere `trial_ends_at` para: `NULL` (vazio)
   - Salve as alterações

---

## ✅ Verificação

Após executar qualquer uma das opções acima:

1. **Faça logout e login novamente** na aplicação com a conta rhianlepore@gmail.com
2. A conta agora deve ter acesso premium sem restrições
3. Não deve aparecer mais o banner de trial
4. Todas as funcionalidades premium devem estar disponíveis

---

## 📝 Notas

- **subscription_status**: `'subscriber'` = conta premium ativa
- **trial_ends_at**: `NULL` = sem data de expiração (premium permanente)
- Se quiser tornar outras contas premium, repita o processo com o email correspondente

---

## 🔧 Troubleshooting

Se após executar o script a conta ainda aparecer como trial:

1. Verifique se o email está correto no banco de dados
2. Limpe o cache do navegador
3. Faça logout e login novamente
4. Verifique se as colunas foram criadas corretamente na tabela `profiles`
