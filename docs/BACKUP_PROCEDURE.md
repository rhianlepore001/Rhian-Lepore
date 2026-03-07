# 📋 Procedimento de Backup Manual - Supabase

Este documento descreve como realizar o backup manual dos dados do seu sistema AgenX, garantindo a segurança das informações mesmo no plano gratuito do Supabase.

## 🚀 Como Realizar o Backup

1. Abra o terminal no diretório raiz do projeto.
2. Execute o seguinte comando:
   ```bash
   npm run backup
   ```
3. O script irá conectar ao Supabase, extrair os dados das tabelas principais e gerar um arquivo JSON.

> [!IMPORTANT]
> Certifique-se de que as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão preenchidas no seu arquivo `.env` para que o backup funcione.

4. O arquivo será salvo na pasta `./backups/` com um carimbo de data e hora (ex: `backup_2026-03-01T...json`).

## 📁 O Que é Incluído no Backup

O script realiza o backup das seguintes tabelas:
- `establishments` (Dados da empresa)
- `profiles` (Perfis de usuários)
- `appointments` (Agendamentos)
- `services` (Catálogo de serviços)
- `clients` (Base de clientes)
- `finance_categories` (Categorias financeiras)
- `finance_transactions` (Transações financeiras)

## 🔄 Como Restaurar (Em caso de emergência)

> [!WARNING]
> A restauração de dados deve ser feita com cautela por um desenvolvedor, pois pode sobrescrever informações existentes.

Para restaurar um backup:
1. Certifique-se de que as credenciais no arquivo `.env` estão corretas.
2. Utilize scripts de migração ou importe o arquivo JSON diretamente via interface do Supabase ou scripts customizados de importação.
3. Para uma restauração total e segura, recomenda-se o uso do **Supabase CLI** em conjunto com as ferramentas de desenvolvimento.

## 📅 Frequência Recomendada

- **Recomendado:** Uma vez por semana ou antes de grandes alterações manuais no banco de dados.
- **Importante:** Sempre verifique se o arquivo JSON foi gerado corretamente após o comando.

---
> [!TIP]
> No futuro, este processo pode ser automatizado via GitHub Actions ou serviços de cron-job externos.
