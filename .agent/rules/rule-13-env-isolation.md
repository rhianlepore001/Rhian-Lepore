# LEI 13: Isolamento de Ambientes

## MOTIVO
Prevenir vazamento de dados de produção para dev e execução acidental de código destrutivo no ambiente errado.

## GATILHO
Ativado ao configurar variáveis de ambiente, connection strings ou deploy configs.

## SEGREGAÇÃO OBRIGATÓRIA

### Bancos Separados
Cada ambiente (dev, staging, prod) DEVE ter seu próprio banco de dados. Nunca compartilhe.

### Prefixos de Variáveis
Use prefixos claros: `DEV_`, `STAGING_`, `PROD_` para diferenciar configs.

### Feature Flags
Código não finalizado deve estar atrás de feature flags, nunca commitado diretamente em main/master.

## PROIBIÇÕES

- Hardcode de URLs de produção em código fonte
- Uso de dados reais de clientes em ambiente de desenvolvimento
- Conexão de ambiente local com banco de produção

## ARQUIVOS DE ENV SEPARADOS

```bash
# .env.development
DEV_DATABASE_URL=postgresql://localhost/myapp_dev
DEV_STRIPE_KEY=sk_test_xxxxx

# .env.production (NUNCA commitado)
PROD_DATABASE_URL=postgresql://prod-db.internal/myapp
PROD_STRIPE_KEY=sk_live_xxxxx
```

## VALIDAÇÃO NO CÓDIGO

```python
class Settings:
    def __init__(self):
        self.env = Environment(os.getenv("APP_ENV", "development"))
        self.prefix = self.env.name + "_"
        
        self.database_url = os.getenv(f"{self.prefix}DATABASE_URL")
        self.stripe_key = os.getenv(f"{self.prefix}STRIPE_KEY")
        
        # Validação: não permitir key de prod em dev
        if self.env == Environment.DEV and "live" in self.stripe_key:
            raise ValueError("Chave de produção detectada em ambiente dev!")
```

## PROTEÇÃO EM SCRIPTS

```python
async def seed_test_data():
    settings = Settings()
    
    if settings.env == Environment.PROD:
        raise RuntimeError("SEED BLOQUEADO EM PRODUÇÃO!")
    
    await db.execute("DELETE FROM users")
```
