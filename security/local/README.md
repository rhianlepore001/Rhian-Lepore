# Ambiente de teste local

O proprietário informou que não possui ambiente separado. Foi preparado um inicializador local, sem criar projeto pago ou tocar no Supabase atual.

## Situação verificada

- Docker local disponível (28.4.0), CLI do repositório disponível e configuração isolada gerada/validada.
- Tentativa de iniciar Supabase local falhou no download: `https://public.ecr.aws/v2/` retornou Forbidden pela política de rede. A tentativa foi interrompida; não foi contornado o bloqueio.
- Portanto, **o ambiente integrado ainda não está funcionando**. Os testes PostgreSQL descartáveis da auditoria continuam disponíveis separadamente.
- O banco completo do AgendiX não foi importado: o histórico do repositório não reconstrói com fidelidade todos os objetos atuais. Uma cópia somente da estrutura atual, sem dados/usuários/segredos, deverá ser revisada antes da importação.

## Preparação reproduzível

Requisitos: dependências do repositório, Python 3.11+ e Docker local. Executar na raiz:

```sh
bash security/local/lab.sh prepare
bash security/local/lab.sh start
```

`prepare` foi executado com sucesso e novamente para conferir idempotência. `start` depende de acesso permitido ao registro oficial usado pelo CLI; não ignorar health checks nem mudar para outro destino para contornar uma negativa de rede. Nesta sessão a tentativa equivalente de start já comprovou o bloqueio, por isso não foi repetida pelo inicializador.

O diretório `.runtime/` é privado e ignorado pelo Git. A configuração fica inteiramente separada de supabase/migrations e não aplica automaticamente migrations ou seeds do produto. O script aceita apenas prepare/start, não executa link/push/reset/deploy e direciona Docker ao socket local. Não contém nem recebe URL de projeto remoto.

São preparados banco, Auth, REST, Storage e captura local de email; os serviços complementares ficam desabilitados nesta primeira etapa. Não foram instaladas chaves Stripe/Resend nem credenciais de produção. Os defaults locais de Auth não são um retrato das configurações implantadas: não usar esse laboratório para declarar que a política de senha/segurança de produção foi validada.

Logs de inicialização podem conter chaves **locais** geradas pelo Supabase; permanecem em .runtime e não são impressos pelo script. Não compartilhar esses logs sem remover credenciais.

## O que falta para ser uma cópia fiel

1. Permitir o download oficial dos componentes na configuração de rede deste ambiente ou executar este preparo em computador com acesso permitido e Docker.
2. Obter um export apenas da estrutura do banco atual, revisado para excluir dados, usuários Auth, segredos e comandos operacionais. Não foi solicitado nem usado acesso privilegiado de produção nesta auditoria.
3. Revisar e importar a estrutura na instância local nova; cadastrar somente contas e estabelecimentos fictícios.
4. Apontar uma execução local do frontend para essa instância, mantendo as configurações de produção separadas.
5. Testar cadastro/login, equipe, agendamento e pagamentos exclusivamente simulados/test. Só então avaliar correções transversais dos riscos abertos.

O preparo da infraestrutura não resolve sozinho a identidade pública por telefone, a autorização de staff desativado nem a fidelidade das policies/triggers. Esses pontos continuam registrados em security/findings.md.
