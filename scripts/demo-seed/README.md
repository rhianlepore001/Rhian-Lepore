# scripts/demo-seed

Seed isolado para prints. Documentação canônica: [`docs/demo-seed.md`](../../docs/demo-seed.md).

```bash
node scripts/demo-seed/seed-demo.mjs
node scripts/demo-seed/purge-demo.mjs
```

Purge SQL (SELECT primeiro): [`purge-demo.sql`](./purge-demo.sql). Sem `--apply` no `.mjs` não apaga nada. Auth users: Dashboard ou bloco opcional do SQL (MCP), só e-mails `agendix.demo.(barber|beauty)@…`.
