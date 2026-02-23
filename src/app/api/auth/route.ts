import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    const correctPassword = process.env.APP_PASSWORD
    
    if (!correctPassword) {
      console.error('APP_PASSWORD not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    
    if (password === correctPassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
