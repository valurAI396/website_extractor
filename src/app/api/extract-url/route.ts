import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { JSDOM } from 'jsdom'

export async function POST(request: NextRequest) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    })

    try {
        const { url, projectName } = await request.json()

        if (!url) {
            return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
        }



        console.log(`Fetching URL: ${url}`)
        const targetResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        if (!targetResponse.ok) {
            throw new Error(`Failed to fetch URL: ${targetResponse.statusText}`)
        }

        const html = await targetResponse.text()

        // Extract text payload
        const dom = new JSDOM(html)
        const document = dom.window.document

        // Remove scripts, styles, etc
        const elementsToRemove = document.querySelectorAll('script, style, noscript, iframe, img, svg')
        elementsToRemove.forEach(el => el.remove())

        const pageText = document.body.textContent?.replace(/\s+/g, ' ').trim() || ''

        // Truncate to avoid massive payloads (Claude can handle ~200k tokens, but still)
        const truncatedText = pageText.slice(0, 150000)

        console.log(`Calling Claude with URL content (length: ${truncatedText.length})`)

        const textBlock: Anthropic.TextBlockParam = {
            type: 'text',
            text: `Analisa o seguinte texto extraído da página web estruturada em HTML/texto:

-----------------------
URL da Página: ${url}
Texto da Página: 
${truncatedText}
-----------------------

Organiza este texto por secções que fariam sentido na perspetiva de um UX/UI ou content manager.

Para cada secção de texto encontrada, fornece:
1. page: Nome aproximado da página ou caminho do URL (ex: "Homepage" ou "/sobre")
2. section: Nome descritivo da secção (ex: "Hero Principal", "Sobre Nós", "Serviços", "Rodapé", "Menu de Navegação", etc.)
3. location: Pela ordem ou contexto, deduz a localização (ex: "Topo central", "Meio da página", "Fundo da página")
4. text: O texto exato (ou formatado de modo legível) encontrado nessa secção

IMPORTANTE:
- Tenta identificar menus, CTA, benefícios, listagens, etc., a partir do contexto do texto.
- Responde APENAS com um JSON válido no seguinte formato (sem markdown, sem \`\`\`):
{
  "sections": [
    {
      "page": "Nome da Página",
      "section": "Nome da Secção",
      "location": "Descrição da localização",
      "text": "Texto extraído aqui..."
    }
  ]
}`
        }

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            messages: [
                {
                    role: 'user',
                    content: [textBlock],
                },
            ],
        })

        console.log('Claude response received')

        const textContent = response.content.find(c => c.type === 'text')
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text response from Claude')
        }

        let sections = []
        try {
            const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                sections = parsed.sections || []
            }
        } catch (parseError) {
            console.error('Failed to parse Claude response:', parseError)
            sections = [{
                page: url,
                section: 'Conteúdo Extraído Geral',
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
        return NextResponse.json(
            { error: `Failed to extract URL: ${errorMessage}` },
            { status: 500 }
        )
    }
}
