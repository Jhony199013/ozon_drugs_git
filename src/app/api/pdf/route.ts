import type { NextRequest } from 'next/server'
import { handleGetPdf } from '@/lib/api/routes/pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range, If-None-Match, If-Modified-Since',
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function HEAD(req: NextRequest) {
  return handleGetPdf(req, 'HEAD')
}

export async function GET(req: NextRequest) {
  return handleGetPdf(req, 'GET')
}
