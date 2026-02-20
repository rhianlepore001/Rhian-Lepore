# TestSprite AI Testing Report - Backend (Cloud Supabase)

## 1️⃣ Document Metadata
| Item | Detalhes |
|------|----------|
| **Nome do Projeto** | Rhian-Lepore-main |
| **Data** | 18/02/2026 |
| **Status de Conexão** | ✅ Sucesso (Supabase Cloud alcançado) |
| **Total de Casos** | 10 |
| **Sucesso** | 0 |
| **Falhas** | 10 |

---

## 2️⃣ Requirement Validation Summary

### **Core Operations (RPC & Database)**
| ID | Caso de Teste | Status | Erro Identificado |
|----|---------------|--------|-------------------|
| TC001 | user authentication flows | ❌ FALHOU | `email_address_invalid` (Formato de email de teste rejeitado pelo Supabase) |
| TC002 | appointment scheduling | ❌ FALHOU | `foreign key constraint` (Tentativa de inserir ID de business inexistente na tabela `profiles`) |
| TC004 | dashboard KPIs | ❌ FALHOU | `Could not find the function public.create_secure_booking` (Assinatura de parâmetros não bate) |
| TC005 | theme management | ❌ FALHOU | `Could not find the table 'public.establishments'` (A tabela correta no projeto é `profiles` ou `business_settings`) |
| TC007 | data isolation | ❌ FALHOU | Divergência nos parâmetros da RPC `create_secure_booking` |

---

## 3️⃣ Insights de Depuração (Root Causes)

### **1. Divergência de Assinatura (RPC Params)**
A ferramenta está gerando chamadas para `create_secure_booking` com parâmetros como `date`, `start_time`, `end_time`. 
No entanto, sua função SQL real (analisada nas migrações) espera parâmetros diferentes ou em outro formato.

### **2. Mapeamento de Tabelas Errado**
A IA do TestSprite tentou acessar `public.establishments`, mas seu esquema utiliza `profiles` para guardar os dados do estabelecimento. Isso gerou erros de `schema cache`.

### **3. Validação de Email**
O Supabase Auth está configurado para validar o formato do email, e os emails automáticos gerados pelo TestSprite (`testuser-xxx@example.com`) estão sendo recusados.

---

## 4️⃣ Próximos Passos Recomendados

1. **Ajustar Mock de Parâmetros**: Precisamos fornecer um exemplo manual da chamada da RPC `create_secure_booking` para que a IA do TestSprite aprenda a assinatura correta.
2. **Correção de Nomes de Tabelas**: Indicar explicitamente no `code_summary` que `establishments` = `profiles`.
3. **Dados de Pré-requisito**: Criar um "Seed" de teste ou usar IDs de business existentes nos scripts para evitar erros de FK (Chave Estrangeira).

---
> **Nota do Agente:** O progresso foi enorme! Saímos de um "404 - Não te conheço" para erros reais de banco de dados. Agora é questão de "ajuste fino".
