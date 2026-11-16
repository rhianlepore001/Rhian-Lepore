# Exemplo de relatório

O relatório real fica em `artifacts/journey-15d/<timestamp-uuid>/RELATORIO.md`.
Os números abaixo são ilustrativos, não evidência de uma execução.

| Ambiente | Nota dos cenários | Pass | Fail | Warn | Skip | Ausentes |
|---|---:|---:|---:|---:|---:|---:|
| desktop | 0/10 | 4 | 1 | 0 | 0 | 10 |
| iphone | 0/10 | 0 | 0 | 0 | 0 | 15 |

Uma falha encerra a jornada, salva o ledger em `finally` e deixa os cenários seguintes ausentes. Cada cenário tem um único veredito. A nota avalia apenas estas asserções, incluindo smoke tests; não certifica features completas, onboarding ou checkout. Falhas Playwright zeram a nota do ambiente, inclusive se ocorrerem fora de um passo do ledger.
