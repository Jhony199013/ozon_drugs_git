import { readFile } from 'fs/promises'
import { createRequire } from 'module'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function handleGetPdfWorker() {
  const require = createRequire(import.meta.url)

  const tryLocal = async () => {
    const candidates = [
      // Классический worker (`.js`) поддерживается более широким
      // набором браузеров, включая старые версии Safari/iOS.
      'pdfjs-dist/build/pdf.worker.min.js',
      'pdfjs-dist/build/pdf.worker.min.mjs',
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
          },
        })
      } catch {}
    }
    return null
  }

  const tryCdn = async () => {
    const cdnCandidates = [
      'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js',
      'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.mjs',
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


