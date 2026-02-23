import { NextResponse } from 'next/server'

export async function GET() {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY
  const hasPassword = !!process.env.APP_PASSWORD
  
  return NextResponse.json({
    status: 'ok',
    config: {
      anthropicKey: hasApiKey ? 'configured' : 'MISSING',
      appPassword: hasPassword ? 'configured' : 'MISSING',
    },
    timestamp: new Date().toISOString(),
  })
}
