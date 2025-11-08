import { readFile } from 'fs/promises'
import { createRequire } from 'module'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function handleGetPdfWorker() {
  const require = createRequire(import.meta.url)

  const tryLocal = async () => {
    const candidates = [
      'pdfjs-dist/build/pdf.worker.min.mjs',
      'pdfjs-dist/build/pdf.worker.min.js',
    ]
    for (const id of candidates) {
      try {
        const resolved = require.resolve(id)
        const code = await readFile(resolved)
        const arrayBuffer = code.buffer.slice(
          code.byteOffset,
          code.byteOffset + code.byteLength
        ) as ArrayBuffer
        return new Response(arrayBuffer, {
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      } catch {}
    }
    return null
  }

  const tryCdn = async () => {
    const cdnCandidates = [
      'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.mjs',
      'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js',
    ]
    for (const url of cdnCandidates) {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) continue
        const buf = await res.arrayBuffer()
        return new Response(buf, {
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      } catch {}
    }
    return null
  }

  const local = await tryLocal()
  if (local) return local

  const cdn = await tryCdn()
  if (cdn) return cdn

  return new Response('Worker mjs not found', { status: 500 })
}


