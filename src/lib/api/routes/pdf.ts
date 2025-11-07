import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function handleGetPdf(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new Response('Missing url', { status: 400 })
  }

  try {
    // Декодируем URL, если он был закодирован дважды
    let decodedUrl = url
    try {
      decodedUrl = decodeURIComponent(url)
    } catch {
      // Если декодирование не удалось, используем исходный URL
    }

    const upstream = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf,*/*',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (compatible; MedInteract/1.0)'
      },
      redirect: 'follow'
    })

    if (!upstream.ok) {
      console.error('PDF fetch error:', upstream.status, upstream.statusText, 'for URL:', decodedUrl)
      return new Response(`Upstream error: ${upstream.status} ${upstream.statusText}`, { 
        status: upstream.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    const bytes = await upstream.arrayBuffer()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (e) {
    console.error('PDF fetch exception:', e, 'for URL:', url)
    return new Response(`Fetch error: ${e instanceof Error ? e.message : 'Unknown error'}`, { 
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }
}


