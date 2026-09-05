# SPEC: Print do reportar problema

**Status:** ready
**Criado:** 2026-09-05
**Prioridade:** alta

---

## O que o cliente final vê

1. Toca em **Ajuda** (`?`) → escolhe **Reportar problema**.
2. O menu some; a tela que ele estava vendo é fotografada (sem o `?`, sem o menu, sem o modal de report).
3. Abre o bottom-sheet **Reportar problema** com o print no topo, descrição opcional e contexto técnico.
4. Se a captura falhar, vê a mensagem clara e o botão **Anexar print** (galeria/câmera). Ainda pode enviar só com o texto.

## O que muda no sistema

- Captura passa a ser um pipeline único: esconder chrome do reporter → esperar o paint → fotografar o **viewport** → abrir o modal com o resultado.
- Motor de captura: `html2canvas-pro` (oklch / Tailwind 4). `html2canvas` 1.4.1 explode no parse e o `catch` devolvia `null` → "Não foi possível capturar a tela."
- Chrome do reporter (`data-bug-report-dialog` / `data-bug-report-chrome`) nunca entra no print.
- Sem recorte automático de modal: dialog de produto já está no viewport.
- Fallback em cadeia (viewport → body simples). Se tudo falhar, anexo manual.

## O que NÃO muda

- Tabela `bug_reports`, RLS, bucket `bug-screenshots`
- Fluxo de envio (upload + insert) e contexto técnico automático
- Modo admin (`DevBugButton` / `BugAnnotateModal`) — só passa a usar o mesmo pipeline de captura
- Ferramenta de lápis no preview

## Edge cases

- Página com scroll → print = o que está visível, não o documento inteiro
- Modal de produto aberto (agenda, checkout) → aparece no print porque está na tela
- Captura falha (memória, CSS extremo) → anexo manual; envio sem imagem continua válido
- Usuário sem sessão → toast de sessão expirada (já existe)

## Teste E2E

```
1. Abrir /#/playwright-bug-reporter-demo
2. Modal abre com <img> do print (naturalWidth > 0)
3. Texto "Print da tela" visível; lápis disponível
```

## Arquivos envolvidos

- `lib/bugReport.ts` — pipeline de captura + fallbacks
- `components/BugReportButton.tsx` — espera paint, esconde chrome, usa o pipeline
- `components/BugReportModal.tsx` — anexo manual se o print vier vazio
- `components/DevBugButton.tsx` / demo — mesmo pipeline
- `components/CommissionShareModal.tsx` — mesmo motor (oklch)
- `test/lib/bugReport.screenshot.test.ts` — contratos da captura

## Done when

- [x] Abrir "Reportar problema" mostra o print da tela que o usuário via
- [x] Modal/menu/`?` não aparecem no print
- [x] Falha de captura oferece anexar imagem; envio ainda funciona
- [x] typecheck, lint, build e testes verdes
