# Guia de Deploy (Publicação do Site)

Este guia descreve como colocar seu sistema Barber/Beauty OS no ar. Recomendamos usar a **Vercel** ou **Netlify** pela facilidade e suporte a React/Vite.

## 1. Variáveis de Ambiente Necessárias
Antes de publicar, tenha em mãos as seguintes chaves (que estão no seu `.env.local`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY` (se estiver usando IA)

> **Importante:** Nunca envie seu arquivo `.env.local` para o GitHub. Você deve configurar essas variáveis no painel de controle da hospedagem.

---

## Opção A: Deploy via Vercel (Recomendado)

### Passo 1: Instalação e Login
Abra seu terminal na pasta do projeto e execute:
```bash
npm install -g vercel
vercel login
```
Siga as instruções para logar com seu email ou GitHub.

### Passo 2: Configuração Inicial
Execute o comando:
```bash
vercel
```
Responda às perguntas:
- Set up and deploy? **Y**
- Which scope? (Selecione seu usuário/time)
- Link to existing project? **N**
- Project name? **barber-beauty-os** (ou outro nome de sua escolha)
- In which directory is your code located? **./** (Aperte Enter)
- Want to modify these settings? **N** (Aperte Enter para usar detecção automática do Vite)

O Vercel fará o build e deploy de uma versão de "Preview".

### Passo 3: Configurar Variáveis de Ambiente
1. Vá para o dashboard do seu projeto no site da Vercel (o link aparecerá no terminal).
2. Vá em **Settings** > **Environment Variables**.
3. Adicione as variáveis listadas na seção 1 (`VITE_SUPABASE_URL`, etc).
4. Salve.

### Passo 4: Deploy de Produção
Após configurar as variáveis, faça o deploy final:
```bash
vercel --prod
```
Este comando publicará a versão final com as chaves configuradas. Você receberá uma URL (ex: `https://barber-beauty-os.vercel.app`).

---

## Opção B: Deploy via Netlify

### Passo 1: Instalação e Login
```bash
npm install -g netlify-cli
netlify login
```

### Passo 2: Configuração e Deploy
```bash
netlify deploy
```
- Create & configure a new site? **Yes**
- Team? (Selecione seu time)
- Site name? (Opcional, aperte Enter)
- Publish directory? **dist** (Importante: o Vite gera a pasta `dist`)
- Build command? **npm run build**

### Passo 3: Variáveis e Produção
1. Vá ao site do Netlify > Site Settings > Environment variables.
2. Adicione suas chaves.
3. Volte ao terminal e execute para produção:
```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## Dicas Finais
- **URL Pública:** Após o deploy, pegue a URL gerada e configure no seu painel Supabase (Authentication > URL Configuration > Site URL) para que o login (Google/Email) funcione corretamente em produção.
- **Redirecionamentos:** Se tiver problemas com refresh (erro 404 em subpáginas), crie um arquivo `vercel.json` na raiz com:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
(Para Netlify, crie um `_redirects` na pasta `public` com `/* /index.html 200`).
