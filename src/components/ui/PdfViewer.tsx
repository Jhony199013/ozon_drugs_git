"use client";

import { useEffect, useRef, useState, useMemo } from "react";

interface PdfViewerProps { url: string }

export default function PdfViewer({ url }: PdfViewerProps) {
  const [Document, setDocument] = useState<React.ComponentType<Record<string, unknown>> | null>(null)
  const [Page, setPage] = useState<React.ComponentType<Record<string, unknown>> | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  // На мобильных устройствах стартуем с 60%, на десктопе с 100%
  const [scale, setScale] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 0.6 : 1
    }
    return 1
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  // Используем абсолютный URL для работы на хостинге
  const getApiUrl = (path: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return path
  }

  const file = useMemo(() => ({ url: `${getApiUrl('/api/pdf')}?url=${encodeURIComponent(url)}` }), [url])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const mod = await import("react-pdf")
      // Используем API route для worker
      mod.pdfjs.GlobalWorkerOptions.workerSrc = getApiUrl('/api/pdf.worker.mjs')
      if (!cancelled) {
        setDocument(() => mod.Document)
        setPage(() => mod.Page)
        setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Следим за шириной контейнера
  useEffect(() => {
    if (!containerRef.current) return
    const measure = () => {
      const width = containerRef.current!.clientWidth
      setContainerWidth(width)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!ready || !Document || !Page) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-gray-600">Загрузка инструкции...</p>
        </div>
      </div>
    )
  }

  const pageWidth = Math.max(260, Math.floor(containerWidth * scale))

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto flex flex-col items-center">
      {/* Панель управления зумом */}
      <div className="sticky top-0 z-10 w-full bg-primary/10 backdrop-blur px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-end gap-2 sm:gap-3 border-b border-primary/20">
        <button onClick={() => setScale(s => Math.max(0.25, +(s - 0.1).toFixed(2)))} className="px-2 sm:px-3 py-1.5 bg-primary text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50">−</button>
        <span className="text-xs sm:text-sm font-medium text-gray-700 tabular-nums w-10 sm:w-12 text-center">{Math.round(scale*100)}%</span>
        <button onClick={() => setScale(s => Math.min(3, +(s + 0.1).toFixed(2)))} className="px-2 sm:px-3 py-1.5 bg-primary text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50">+</button>
        <button onClick={() => setScale(1)} className="ml-1 sm:ml-2 px-2 sm:px-3 py-1.5 bg-primary text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50">100%</button>
        <button onClick={() => setScale(0.5)} className="px-2 sm:px-3 py-1.5 bg-primary text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50">50%</button>
      </div>
      <Document file={file} onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)} className="w-full flex flex-col items-center" loading={
        <div className="flex items-center justify-center w-full py-8">
          <p className="text-gray-600">Загрузка инструкции...</p>
        </div>
      }>
        {numPages && Array.from({ length: numPages }).map((_, i) => (
          <Page key={i} pageNumber={i + 1} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} className="mb-4 shadow" />
        ))}
      </Document>
    </div>
  )
}


