import { handleGetPdfWorker } from '@/lib/api/routes/pdfWorker'

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

export async function GET() {
  const response = await handleGetPdfWorker()
  
  // Добавляем CORS заголовки
  if (response) {
    const headers = new Headers(response.headers)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value)
    })
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }
  
  return response
}
