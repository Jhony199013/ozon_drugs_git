import type { NextRequest } from 'next/server'
import { handleGetPdf } from '@/lib/api/routes/pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  })
}

export async function GET(req: NextRequest) {
  const response = await handleGetPdf(req)
  return response
}


