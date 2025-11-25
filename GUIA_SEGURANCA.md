# 🔒 GUIA DE CORREÇÃO DE SEGURANÇA

## ⚠️ PROBLEMA IDENTIFICADO

As mensagens de "Avisos Importantes" estão aparecendo incorretamente porque **pode haver dados de outros negócios sendo exibidos**. Isso é CRÍTICO e precisa ser corrigido IMEDIATAMENTE.

## 🎯 SOLUÇÃO EM 3 PASSOS

### **PASSO 1: Acessar o Supabase SQL Editor**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **"SQL Editor"**

### **PASSO 2: Executar o Script de Segurança**

1. Abra o arquivo: `supabase/migrations/security_fix.sql`
2. **Copie TODO o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (ou pressione Ctrl+Enter)

### **PASSO 3: Verificar os Resultados**

Após executar o script, você verá duas tabelas de verificação:

#### **Tabela 1: RLS Habilitado**
Todas as linhas devem mostrar `true`:
```
tablename              | RLS Habilitado
-----------------------|---------------
appointments           | true
clients                | true
services               | true
service_categories     | true
team_members           | true
business_settings      | true
profiles               | true
public_bookings        | true
campaigns              | true
hair_records           | true
```

#### **Tabela 2: Políticas Criadas**
Você deve ver várias políticas listadas, todas começando com "Users can only see their own..."

## ✅ TESTE DE SEGURANÇA

Após executar o script, faça este teste:

1. **Crie dois usuários diferentes** (ou use dois existentes)
2. **Faça login com o Usuário A**
   - Crie um cliente chamado "Cliente do Usuário A"
   - Crie um agendamento
3. **Faça login com o Usuário B**
   - Verifique se você **NÃO vê** o "Cliente do Usuário A"
   - Verifique se você **NÃO vê** os agendamentos do Usuário A
4. **Se você vir dados do outro usuário** = ❌ Problema não resolvido
5. **Se você NÃO vir dados do outro usuário** = ✅ Segurança funcionando!

## 🔍 O QUE O SCRIPT FAZ

### 1. **Habilita Row Level Security (RLS)**
- Garante que TODAS as tabelas tenham proteção de linha
- Sem RLS, qualquer usuário pode ver dados de todos

### 2. **Cria Políticas de Segurança**
- Define regras que permitem cada usuário ver APENAS seus próprios dados
- Exemplo: `WHERE user_id = auth.uid()`

### 3. **Corrige a Função get_dashboard_stats**
- Garante que as estatísticas do dashboard mostrem APENAS dados do usuário logado
- Adiciona filtros `WHERE user_id = p_user_id` em TODAS as queries

## ⚠️ IMPORTANTE

**NUNCA pule este passo!** Sem RLS e políticas corretas:
- ❌ Barbearia A pode ver clientes da Barbearia B
- ❌ Salão A pode ver agendamentos do Salão B
- ❌ Dados financeiros ficam expostos entre negócios
- ❌ Violação de LGPD/GDPR

## 🆘 SE ALGO DER ERRADO

Se após executar o script você tiver problemas:

1. **Erro de sintaxe SQL**
   - Verifique se copiou TODO o conteúdo do arquivo
   - Certifique-se de não ter caracteres especiais

2. **Políticas já existem**
   - O script remove políticas antigas automaticamente
   - Se der erro, execute linha por linha

3. **Não vê mais nenhum dado**
   - Verifique se você está logado
   - Verifique se `auth.uid()` retorna seu ID
   - Execute: `SELECT auth.uid();` no SQL Editor

## 📞 SUPORTE

Se precisar de ajuda, me envie:
1. Screenshot do erro (se houver)
2. Resultado das queries de verificação
3. Qual passo deu problema

## ✅ CHECKLIST FINAL

- [ ] Executei o script `security_fix.sql` no Supabase
- [ ] Todas as tabelas mostram RLS = true
- [ ] Vejo políticas criadas na verificação
- [ ] Testei com dois usuários diferentes
- [ ] Cada usuário vê APENAS seus próprios dados
- [ ] Dashboard mostra apenas meus agendamentos
- [ ] Avisos Importantes aparecem corretamente

---

**🔒 Após completar este guia, seus dados estarão 100% seguros e isolados!**
