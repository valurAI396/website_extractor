import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const MAX_PAGES = 6

function extractInternalLinks(html: string, baseUrl: string): string[] {
    const base = new URL(baseUrl)
    const basePath = base.pathname.replace(/\/$/, '') || '/'
    const seen = new Set<string>([basePath])
    const links: string[] = []
    const linkRegex = /href=["']([^"']+)["']/gi
    let match
    while ((match = linkRegex.exec(html)) !== null) {
        try {
            const href = match[1].trim()
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue
            const resolved = new URL(href, baseUrl)
            const cleanPath = resolved.pathname.replace(/\/$/, '') || '/'
            if (
                resolved.hostname === base.hostname &&
                !seen.has(cleanPath) &&
                !cleanPath.match(/\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|xml|json|woff|woff2|ttf|map|txt)$/i)
            ) {
                seen.add(cleanPath)
                links.push(resolved.origin + resolved.pathname)
            }
        } catch {}
    }
    return links
}

async function fetchWithJina(url: string): Promise<string | null> {
    try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                'Accept': 'text/plain',
                'X-Return-Format': 'markdown',
            },
            signal: AbortSignal.timeout(25000),
        })
        if (!res.ok) return null
        return await res.text()
    } catch {
        return null
    }
}

export async function POST(request: NextRequest) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    try {
        const { url, projectName } = await request.json()
        if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

        // 1. Fetch homepage HTML to discover internal pages
        console.log(`Discovering pages on: ${url}`)
        let internalLinks: string[] = []
        try {
            const homeHtml = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
                signal: AbortSignal.timeout(10000),
            }).then(r => r.text())
            internalLinks = extractInternalLinks(homeHtml, url).slice(0, MAX_PAGES - 1)
        } catch (e) {
            console.log('Could not extract internal links, proceeding with homepage only:', e)
        }

        const allUrls = [url, ...internalLinks]
        console.log(`Fetching ${allUrls.length} pages:`, allUrls)

        // 2. Fetch all pages in parallel via Jina Reader (handles JS-rendered sites)
        const results = await Promise.allSettled(allUrls.map(fetchWithJina))

        const pages: { url: string; content: string }[] = []
        results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value) {
                pages.push({ url: allUrls[i], content: result.value.slice(0, 25000) })
            }
        })

        if (pages.length === 0) {
            throw new Error('Could not fetch any pages from the website')
        }

        console.log(`Successfully fetched ${pages.length} pages`)

        // 3. Build combined prompt
        const pagesContent = pages.map((p, i) =>
            `=== PÁGINA ${i + 1}: ${p.url} ===\n${p.content}`
        ).join('\n\n---\n\n')

        const textBlock: Anthropic.TextBlockParam = {
            type: 'text',
            text: `Analisa o conteúdo extraído de ${pages.length} página(s) do website:

-----------------------
${pagesContent}
-----------------------

Extrai e organiza TODO o texto visível, agrupado por página e secção.

Para cada secção, fornece:
1. page: Nome da página (ex: "Homepage", "Sobre Nós", "Serviços", "Contacto") — deduz pelo URL e pelo conteúdo
2. section: Nome descritivo (ex: "Hero Principal", "Sobre Nós", "Serviços", "FAQ", "Testemunhos", "Rodapé", "Menu de Navegação")
3. location: Localização na página (ex: "Topo", "Meio da página", "Fundo da página")
4. text: O texto exato e completo dessa secção

IMPORTANTE:
- Inclui TODO o conteúdo de TODAS as páginas — não omitas nada
- Menus e rodapés que se repetem: inclui apenas uma vez com a nota "Presente em todas as páginas"
- Mantém a formatação do texto (listas, quebras de linha) quando relevante
- Responde APENAS com JSON válido (sem markdown, sem \`\`\`):
{
  "sections": [
    {
      "page": "Nome da Página",
      "section": "Nome da Secção",
      "location": "Localização",
      "text": "Texto completo aqui..."
    }
  ]
}`
        }

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            messages: [{ role: 'user', content: [textBlock] }],
        })

        const textContent = response.content.find(c => c.type === 'text')
        if (!textContent || textContent.type !== 'text') throw new Error('No text response from Claude')

        let sections = []
        try {
            const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                sections = parsed.sections || []
            }
        } catch {
            sections = [{
                page: 'Website',
                section: 'Conteúdo Extraído',
                location: 'Documento completo',
                text: textContent.text,
            }]
        }

        return NextResponse.json({
            projectName: projectName || 'Website',
            extractedAt: new Date().toLocaleString('pt-PT'),
            sections,
        })

    } catch (error) {
        console.error('URL Extraction error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: `Failed to extract URL: ${errorMessage}` }, { status: 500 })
    }
}
