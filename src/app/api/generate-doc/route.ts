import { NextRequest, NextResponse } from 'next/server'
import { createClientDocument } from '@/lib/googleDocs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectName, sections } = body

    if (!projectName || !sections || sections.length === 0) {
      return NextResponse.json(
        { error: 'Missing projectName or sections' },
        { status: 400 }
      )
    }

    console.log(`Generating Google Doc for: ${projectName}`)

    const result = await createClientDocument({
      projectName,
      sections,
    })

    console.log(`Document created: ${result.docUrl}`)

    return NextResponse.json({
      success: true,
      docUrl: result.docUrl,
      docId: result.docId,
    })

  } catch (error) {
    console.error('Document generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate document: ${errorMessage}` },
      { status: 500 }
    )
  }
}
