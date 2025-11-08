"use client";

import { useEffect, useRef, useState, useMemo } from "react";

interface PdfViewerProps { url: string }

export default function PdfViewer({ url }: PdfViewerProps) {
  const [Document, setDocument] = useState<React.ComponentType<Record<string, unknown>> | null>(null)
  const [Page, setPage] = useState<React.ComponentType<Record<string, unknown>> | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1) // стартуем в 100%
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

  // Определяем, является ли устройство iOS
  const isIOS = useMemo(() => {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const workerBlobUrlRef = { current: null as string | null }
    
    ;(async () => {
      try {
        const mod = await import("react-pdf")
        
        // Для iOS используем Blob URL для worker, для остальных - API route
        if (isIOS) {
          try {
            // Загружаем worker через API и создаем Blob URL
            const workerUrl = getApiUrl('/api/pdf.worker.mjs')
            const workerResponse = await fetch(workerUrl)
            if (!workerResponse.ok) throw new Error('Failed to fetch worker')
            
            const workerBlob = await workerResponse.blob()
            const workerBlobUrl = URL.createObjectURL(workerBlob)
            workerBlobUrlRef.current = workerBlobUrl
            mod.pdfjs.GlobalWorkerOptions.workerSrc = workerBlobUrl
          } catch (workerError) {
            console.warn('Failed to load worker via Blob, trying direct URL:', workerError)
            // Fallback на прямой URL
            mod.pdfjs.GlobalWorkerOptions.workerSrc = getApiUrl('/api/pdf.worker.mjs')
          }
        } else {
          // Для не-iOS используем API route напрямую
          mod.pdfjs.GlobalWorkerOptions.workerSrc = getApiUrl('/api/pdf.worker.mjs')
        }
        
        if (!cancelled) {
          setDocument(() => mod.Document)
          setPage(() => mod.Page)
          setReady(true)
        }
      } catch (e) {
        console.error('Error loading react-pdf:', e)
        if (!cancelled) {
          setError('Не удалось загрузить просмотрщик PDF. Пожалуйста, попробуйте позже.')
        }
      }
    })()
    
    return () => { 
      cancelled = true
      // Очищаем Blob URL при размонтировании
      if (workerBlobUrlRef.current) {
        URL.revokeObjectURL(workerBlobUrlRef.current)
      }
    }
  }, [isIOS])

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 p-4 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setReady(false)
              window.location.reload()
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    )
  }

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
      <Document 
        file={file} 
        onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)} 
        onLoadError={(error: Error) => {
          console.error('PDF load error:', error)
          setError('Не удалось загрузить PDF файл. Пожалуйста, проверьте подключение к интернету.')
        }}
        className="w-full flex flex-col items-center" 
        loading={
          <div className="flex items-center justify-center w-full py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <p className="text-gray-600">Загрузка инструкции...</p>
            </div>
          </div>
        }
      >
        {numPages && Array.from({ length: numPages }).map((_, i) => (
          <Page 
            key={i} 
            pageNumber={i + 1} 
            width={pageWidth} 
            renderTextLayer={false} 
            renderAnnotationLayer={false} 
            className="mb-4 shadow"
            onRenderError={(error: Error) => {
              console.error('Page render error:', error)
            }}
          />
        ))}
      </Document>
    </div>
  )
}


