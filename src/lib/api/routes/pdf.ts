import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_CORS_HEADERS = 'Content-Type, Range, If-None-Match, If-Modified-Since'
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

type AllowedMethod = 'GET' | 'HEAD'

export async function handleGetPdf(req: NextRequest, method: AllowedMethod = 'GET') {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new Response('Missing url', {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': ALLOWED_CORS_HEADERS,
      },
    })
  }

  try {
    let decodedUrl = url
    try {
      decodedUrl = decodeURIComponent(url)
    } catch {
      // Оставляем исходное значение, если декодирование не удалось
    }

    const upstreamRequestHeaders = new Headers({
      'Accept': 'application/pdf,*/*',
      'Cache-Control': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (compatible; MedInteract/1.0)',
    })

    const passthroughHeaderPairs: Array<[string, string]> = [
      ['range', 'Range'],
      ['if-none-match', 'If-None-Match'],
      ['if-modified-since', 'If-Modified-Since'],
      ['if-match', 'If-Match'],
      ['if-unmodified-since', 'If-Unmodified-Since'],
    ]

    for (const [incoming, outgoing] of passthroughHeaderPairs) {
      const value = req.headers.get(incoming)
      if (value) {
        upstreamRequestHeaders.set(outgoing, value)
      }
    }

    if (req.headers.get('authorization')) {
      upstreamRequestHeaders.set('Authorization', req.headers.get('authorization') as string)
    }

    const upstream = await fetch(decodedUrl, {
      method,
      headers: upstreamRequestHeaders,
      redirect: 'follow',
      cache: 'no-store',
    })

    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': ALLOWED_CORS_HEADERS,
      'Vary': 'Origin',
    })

    upstream.headers.forEach((value, key) => {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        return
      }
      responseHeaders.set(key, value)
    })

    if (!responseHeaders.has('Content-Type')) {
      responseHeaders.set('Content-Type', 'application/pdf')
    }

    if (!responseHeaders.has('Cache-Control')) {
      responseHeaders.set('Cache-Control', 'public, max-age=60')
    }

    if (
      !responseHeaders.has('Accept-Ranges') &&
      (responseHeaders.get('Content-Length') || responseHeaders.get('Content-Range'))
    ) {
      responseHeaders.set('Accept-Ranges', 'bytes')
    }

    if (!upstream.ok && upstream.status !== 304 && upstream.status !== 206) {
      console.error('PDF fetch error:', upstream.status, upstream.statusText, 'for URL:', decodedUrl)
    }

    const shouldStripBody =
      method === 'HEAD' ||
      upstream.status === 304 ||
      upstream.status === 204

    const body = shouldStripBody ? null : upstream.body

    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch (e) {
    console.error('PDF fetch exception:', e, 'for URL:', url)
    const message = e instanceof Error ? e.message : 'Unknown error'
    return new Response(`Fetch error: ${message}`, {
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': ALLOWED_CORS_HEADERS,
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
}
