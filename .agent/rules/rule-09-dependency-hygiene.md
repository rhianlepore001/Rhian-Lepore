# LEI 09: Higiene de Dependências NPM

## MOTIVO
Ataques de Supply Chain são o principal vetor de invasão em ecossistemas JS/TS. Dependências defasadas ou pacotes criados por sequestradores de nome ("typosquatting") comprometem inteiramente a Vercel.

## GATILHO
Ativado ao rodar comandos como `npm install`, modificar o `package.json`, ou escolher uma biblioteca (ex: "instale o pacote de manipulação de data").

## REGRAS NODE.JS

### Checagem de Estrela/Downloads
Nunca escolha de primeira pacotes obscuros para resolver problemas complexos (ex: PDFs, parse JSON, Crypto). Verifique a base de usuários antes de instalar. Bibliotecas consagradas (`zod`, `date-fns`, `clsx`, `lucide-react`) são preferidas a bibliotecas feitas por autores solo de repositórios não mantidos.

### Auditoria Constante
Após instalações relevantes, prefira o comando `npm audit` se você suspeitar que uma dependência tem problemas de segurança.
Não commite bibliotecas instaladas aleatoriamente sem checar se elas funcionam bem no `Edge Runtime` da Vercel (bibliotecas que requerem APIS Nativas C++ frequentemente falham).

### Minimalismo no Bundle
Sempre questione: Essa dependência é MESMO necessária? Posso fazer essa lógica de data apenas com a Intl API do próprio JavaScript?
Evite `moment.js` (pesado, obsoleto). Prefira `date-fns` ou `dayjs` por suporte a Tree-Shaking.

## EXEMPLO ERRADO
```json
// package.json (Lixo injetado sem controle)
{
  "dependencies": {
    "left-pad": "1.3.0",    // Desnecessário, nativo no JS agora
    "moment": "^2.29",      // Huge bundle size, obsoleto
    "is-odd": "3.0.1",      // Micropacote indesejado
    "react-cool-onclickoutside": "1.0.0" // Pacote paralisado de 3 anos atrás
  }
}
```

## EXEMPLO CORRETO
```bash
# Rodar nativo se possível, usar as API de Web Padrão da Vercel (Edge) e apenas bibliotecas robustas do ecossistema Next.js.
npm install date-fns zod
```
```typescript
import { format } from "date-fns" // Leve e moderno
```
