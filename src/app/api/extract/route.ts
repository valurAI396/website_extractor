import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface ExtractedSection {
  page: string
  section: string
  location: string
  text: string
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not configured')
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  try {
    const formData = await request.formData()
    const projectName = formData.get('projectName') as string || 'Website'
    const fileCount = parseInt(formData.get('fileCount') as string) || 0

    console.log(`Processing ${fileCount} files for project: ${projectName}`)

    if (fileCount === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Process all images
    const imageContents: Anthropic.ImageBlockParam[] = []

    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file${i}`) as File
      if (!file) {
        console.log(`File ${i} not found`)
        continue
      }

      console.log(`Processing file ${i}: ${file.name}, type: ${file.type}, size: ${file.size}`)

      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')

      // Map file type to allowed media types
      let mediaType: ImageMediaType = 'image/png'
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        mediaType = 'image/jpeg'
      } else if (file.type === 'image/png') {
        mediaType = 'image/png'
      } else if (file.type === 'image/gif') {
        mediaType = 'image/gif'
      } else if (file.type === 'image/webp') {
        mediaType = 'image/webp'
      }

      imageContents.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64,
        },
      })
    }

    if (imageContents.length === 0) {
      return NextResponse.json({ error: 'No valid images found' }, { status: 400 })
    }



    console.log(`Calling Claude with ${imageContents.length} images`)

    const textBlock: Anthropic.TextBlockParam = {
      type: 'text',
      text: `Analisa estas ${imageContents.length} screenshots de um protótipo de website.

Para cada screenshot (tratando cada imagem como uma página diferente, numeradas sequencialmente como Página 1, Página 2, etc.), extrai TODO o texto visível e organiza-o por secções.

Para cada secção de texto encontrada, fornece:
1. page: Número da página (ex: "Página 1")
2. section: Nome descritivo da secção (ex: "Hero Principal", "Sobre Nós", "Serviços", "Rodapé", "Menu de Navegação", etc.)
3. location: Descrição da localização no ecrã (ex: "Topo central", "Lado esquerdo, meio da página", "Fundo da página")
4. text: O texto exato encontrado nessa secção

IMPORTANTE:
- Extrai TODO o texto, incluindo menus, botões, rodapés
- Mantém a formatação original quando possível (quebras de linha, listas)
- Se houver texto repetido entre páginas (como menu ou rodapé), inclui apenas uma vez e nota "Presente em todas as páginas"
- Sê preciso na identificação da localização

Responde APENAS com um JSON válido no seguinte formato (sem markdown, sem \`\`\`):
{
  "sections": [
    {
      "page": "Página 1",
      "section": "Nome da Secção",
      "location": "Descrição da localização",
      "text": "Texto extraído aqui..."
    }
  ]
}`,
    }

    // Call Claude Vision
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: [...imageContents, textBlock],
        },
      ],
    })

    console.log('Claude response received')

    // Parse the response
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    let sections: ExtractedSection[] = []
    try {
      // Try to parse the JSON response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        sections = parsed.sections || []
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError)
      console.log('Raw response:', textContent.text)
      // Fallback: return raw text as a single section
      sections = [{
        page: 'Todas',
        section: 'Conteúdo Extraído',
        location: 'Ver imagens originais',
        text: textContent.text,
      }]
    }

    console.log(`Extracted ${sections.length} sections`)

    return NextResponse.json({
      projectName,
      extractedAt: new Date().toLocaleString('pt-PT'),
      sections,
    })

  } catch (error) {
    console.error('Extraction error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to extract: ${errorMessage}` },
      { status: 500 }
    )
  }
}
