import { NextRequest, NextResponse } from 'next/server'
import { createClientDocument } from '@/lib/googleDocs'

interface Section {
  page: string
  section: string
  location: string
  text: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectName, sections } = body as { projectName: string; sections: Section[] }

    if (!projectName || !sections || sections.length === 0) {
      return NextResponse.json(
        { error: 'Missing projectName or sections' },
        { status: 400 }
      )
    }

    console.log(`Generating Google Doc for: ${projectName}`)

    const { docUrl, docId } = await createClientDocument({
      projectName,
      sections,
    })

    console.log(`Document created: ${docId}`)

    return NextResponse.json({
      success: true,
      docUrl,
      docId,
    })

  } catch (error) {
    console.error('Doc generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate document: ${errorMessage}` },
      { status: 500 }
    )
  }
}
