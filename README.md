# Website Extractor — Whenevr Internal Tool

Ferramenta interna para extrair texto de screenshots de protótipos de websites.

## Setup Local

```bash
npm install
cp .env.example .env.local
# Editar .env.local com as credenciais
npm run dev
```

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
APP_PASSWORD=your-password
```

## Deploy no Vercel

1. Conectar repo ao Vercel
2. Adicionar Environment Variables:
   - `ANTHROPIC_API_KEY`
   - `APP_PASSWORD`
3. Deploy

## Como usar

1. Aceder à app e fazer login com a password
2. Inserir nome do projeto
3. Upload de screenshots do protótipo
4. Clicar "Extrair Texto"
5. Copiar resultado para Google Docs

## Tech Stack

- Next.js 14
- Tailwind CSS
- Claude Vision (Anthropic API)
- Vercel
