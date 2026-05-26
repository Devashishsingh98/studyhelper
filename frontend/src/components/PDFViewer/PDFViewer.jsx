import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import Tesseract, { createWorker } from 'tesseract.js'
window.Tesseract = Tesseract
import { useSessionStore } from '@/store/sessionStore'
import { useHighlight } from '@/hooks/useHighlight'
import { extractOCRWords } from './ocrWords.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const SCALE = 1.4
const RENDER_BUFFER = 3
const UNLOAD_BUFFER = 8

// Set to track pages that have completed OCR to avoid repeating it
const ocrDonePages = new Set()

/* ─── OCR scanned canvas to make it selectable ───────────────────────────── */
async function runOCROnPage(wrapper, canvas, W, H, pageNum) {
  if (ocrDonePages.has(pageNum)) return
  ocrDonePages.add(pageNum)

  // 1. Create a beautiful premium overlay indicator for the user
  const indicator = document.createElement('div')
  indicator.className = 'ocr-indicator'
  indicator.innerHTML = '⚡ Preparing OCR...'
  Object.assign(indicator.style, {
    position: 'absolute', top: '12px', right: '12px',
    background: 'var(--accent, #6c63ff)', color: '#fff',
    padding: '5px 10px', borderRadius: '6px', fontSize: '11px',
    fontWeight: '600', zIndex: '10', pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'all 0.3s ease',
    display: 'flex', alignItems: 'center', gap: '6px'
  })
  wrapper.appendChild(indicator)

  let worker
  try {
    indicator.innerHTML = '🔍 Extracting Text...'
    
    // Run client-side Tesseract.js OCR directly on the rendered canvas.
    worker = await createWorker('eng')
    const { data } = await worker.recognize(canvas, {}, { blocks: true })
    const words = extractOCRWords(data)
    if (!words.length) {
      indicator.innerHTML = '⚠️ No Text Found'
      setTimeout(() => indicator.remove(), 3000)
      return
    }

    // 2. Create the ocr-based text layer
    const ocrLayer = document.createElement('div')
    ocrLayer.className = 'textLayer ocrLayer'
    Object.assign(ocrLayer.style, {
      position: 'absolute', top: '0', left: '0',
      width: `${W}px`, height: `${H}px`,
      overflow: 'hidden', zIndex: '5',
      pointerEvents: 'auto', userSelect: 'text'
    })

    // 3. Populate with absolutely positioned words
    for (const word of words) {
      if (!word.text.trim()) continue
      
      const span = document.createElement('span')
      span.textContent = word.text + ' '
      
      const box = word.bbox
      const width = box.x1 - box.x0
      const fontHeight = box.y1 - box.y0
      
      Object.assign(span.style, {
        position: 'absolute',
        left: `${box.x0}px`,
        top: `${box.y0}px`,
        width: `${width}px`,
        fontSize: `${fontHeight * 0.9}px`,
        height: `${fontHeight}px`,
        lineHeight: `${fontHeight}px`,
        display: 'block',
        color: 'transparent',
        cursor: 'text',
        whiteSpace: 'pre',
        pointerEvents: 'auto',
        userSelect: 'text'
      })
      ocrLayer.appendChild(span)
    }

    // Safety: check if wrapper was unloaded while OCR was running
    if (wrapper.dataset.rendered !== 'true') return

    // Replace any old ocrLayer
    wrapper.querySelector('.ocrLayer')?.remove()
    wrapper.appendChild(ocrLayer)

    // Success styling
    indicator.innerHTML = '✨ Text Selectable'
    indicator.style.background = '#43d98c'
    setTimeout(() => {
      indicator.style.opacity = '0'
      setTimeout(() => indicator.remove(), 400)
    }, 2000)

  } catch (err) {
    console.error(`OCR failed for page ${pageNum}:`, err)
    indicator.innerHTML = '❌ OCR Error'
    indicator.style.background = 'var(--danger, #ff4d6d)'
    setTimeout(() => indicator.remove(), 3000)
    ocrDonePages.delete(pageNum)
  } finally {
    if (worker) await worker.terminate().catch((err) => console.warn('OCR worker cleanup failed', err))
  }
}

/* ─── Render one page into its placeholder ──────────────────────────────── */
async function renderPageInto(doc, pageNum, wrapper) {
  if (wrapper.dataset.rendered === 'true') return
  wrapper.dataset.rendered = 'true'

  let page
  try { page = await doc.getPage(pageNum) }
  catch (e) { console.warn('getPage failed', pageNum, e); return }

  const viewport = page.getViewport({ scale: SCALE })
  const W = Math.floor(viewport.width)
  const H = Math.floor(viewport.height)

  // Resize wrapper to true rendered size
  wrapper.style.width = `${W}px`
  wrapper.style.height = `${H}px`
  wrapper.style.setProperty('--scale-factor', SCALE.toString())

  // ── Canvas ────────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  canvas.style.cssText = `position:absolute;top:0;left:0;width:${W}px;height:${H}px;z-index:1;`
  wrapper.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  try {
    await page.render({ canvasContext: ctx, viewport }).promise
  } catch (e) {
    if (e?.name !== 'RenderingCancelledException') console.warn('render', pageNum, e)
    return
  }

  // ── Text layer ────────────────────────────────────────────────────────────
  let textContent = { items: [] }
  try { textContent = await page.getTextContent() }
  catch (e) { console.warn('textContent', pageNum, e) }

  const hasNativeText = textContent.items?.some((item) => item.str?.trim())

  if (hasNativeText) {
    // Standard text-based PDF
    const tl = document.createElement('div')
    tl.className = 'textLayer'
    tl.style.cssText = `
      position:absolute;top:0;left:0;
      width:${W}px;height:${H}px;
      overflow:hidden;z-index:5;
      pointer-events:auto;user-select:text;
    `
    wrapper.appendChild(tl)
    try {
      await pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: tl,
        viewport,
        textDivs: [],
      }).promise
    } catch (e) { console.warn('textLayer', pageNum, e) }
  } else {
    // Scanned image-based PDF → Trigger background OCR
    runOCROnPage(wrapper, canvas, W, H, pageNum)
  }
}

function unloadPage(wrapper) {
  if (wrapper.dataset.rendered !== 'true') return
  wrapper.dataset.rendered = 'false'
  const pageNum = parseInt(wrapper.dataset.pageNumber, 10)
  ocrDonePages.delete(pageNum)
  while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild)
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function PDFViewer() {
  const pdfUrl         = useSessionStore((s) => s.pdfUrl)
  const setTotalPages  = useSessionStore((s) => s.setTotalPages)
  const setCurrentPage = useSessionStore((s) => s.setCurrentPage)
  const currentPage    = useSessionStore((s) => s.currentPage)

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [ready, setReady]     = useState(false)

  const containerRef = useRef(null)
  const scrollRef    = useRef(null)
  const pdfDocRef    = useRef(null)
  const wrappersRef  = useRef([])
  const observerRef  = useRef(null)
  const { onMouseUp } = useHighlight()

  // ── Load PDF ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfUrl) return
    let cancelled = false
    let loadedDoc = null
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true); setError(null); setReady(false)
    })
    pdfDocRef.current = null; wrappersRef.current = []
    ocrDonePages.clear()
    if (containerRef.current) containerRef.current.innerHTML = ''

    const loadingTask = pdfjsLib.getDocument(pdfUrl)

    loadingTask.promise.then(async (doc) => {
      if (cancelled) {
        doc.destroy()
        return
      }
      loadedDoc = doc
      pdfDocRef.current = doc
      setTotalPages(doc.numPages)

      // Use page 1 to get placeholder dimensions
      const p1 = await doc.getPage(1)
      const vp = p1.getViewport({ scale: SCALE })
      const W = Math.floor(vp.width)
      const H = Math.floor(vp.height)

      // Create ALL placeholders upfront (correct scrollbar for 1000-page PDFs)
      const frag = document.createDocumentFragment()
      const ws = []
      for (let i = 1; i <= doc.numPages; i++) {
        const d = document.createElement('div')
        d.className = 'pdf-page-wrapper'
        d.dataset.pageNumber = String(i)
        d.dataset.rendered = 'false'
        d.style.cssText = `
          position:relative; margin:0 auto 20px;
          width:${W}px; height:${H}px;
          background:#1a1a2e; border-radius:4px;
          box-shadow:0 2px 20px rgba(0,0,0,0.5); overflow:hidden;
        `
        frag.appendChild(d); ws.push(d)
      }
      if (cancelled || !containerRef.current) return
      containerRef.current.appendChild(frag)
      wrappersRef.current = ws
      setCurrentPage(1); setLoading(false); setReady(true)
    }).catch((e) => {
      if (cancelled) return
      setError(e.message); setLoading(false)
    })

    return () => {
      cancelled = true
      if (pdfDocRef.current === loadedDoc) pdfDocRef.current = null
      const destroyResult = loadingTask.destroy()
      destroyResult?.catch?.(() => {})
    }
  }, [pdfUrl, setCurrentPage, setTotalPages])

  // ── IntersectionObserver ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !pdfDocRef.current) return
    const doc = pdfDocRef.current
    const ws  = wrappersRef.current
    if (observerRef.current) observerRef.current.disconnect()

    const visible = new Set()

    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const p = parseInt(e.target.dataset.pageNumber, 10)
        e.isIntersecting ? visible.add(p) : visible.delete(p)
      }
      if (!visible.size) return
      setCurrentPage(Math.min(...visible))

      // Render nearby pages
      for (const p of visible) {
        const lo = Math.max(0, p - 1 - RENDER_BUFFER)
        const hi = Math.min(ws.length - 1, p - 1 + RENDER_BUFFER)
        for (let i = lo; i <= hi; i++) renderPageInto(doc, i + 1, ws[i])
      }
      // Unload distant pages
      for (let i = 0; i < ws.length; i++) {
        let near = false
        for (const v of visible) { if (Math.abs(i + 1 - v) <= UNLOAD_BUFFER) { near = true; break } }
        if (!near) unloadPage(ws[i])
      }
    }, { root: scrollRef.current, rootMargin: '200% 0px', threshold: 0 })

    observerRef.current = obs
    for (const w of ws) obs.observe(w)
    // Render first few pages immediately
    for (let i = 0; i < Math.min(RENDER_BUFFER + 1, ws.length); i++) {
      renderPageInto(doc, i + 1, ws[i])
    }
    return () => obs.disconnect()
  }, [ready, setCurrentPage])

  // ── Scroll → page number ──────────────────────────────────────────────────
  const onScroll = useCallback(() => {
    if (!scrollRef.current || !wrappersRef.current.length) return
    const top = scrollRef.current.scrollTop
    for (const w of wrappersRef.current) {
      if (w.offsetTop + w.offsetHeight > top + 80) {
        const n = parseInt(w.dataset.pageNumber, 10)
        if (n !== currentPage) setCurrentPage(n)
        break
      }
    }
  }, [currentPage, setCurrentPage])

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      onMouseUp={onMouseUp}
      style={{
        height: '100%', overflowY: 'auto',
        padding: '20px 24px', background: 'var(--bg-base)',
        userSelect: 'text', position: 'relative',
      }}
    >
      {loading && (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 80, fontSize: 14 }}>
          Loading PDF…
        </div>
      )}
      {error && (
        <div style={{ color: 'var(--danger)', textAlign: 'center', paddingTop: 80, fontSize: 14 }}>
          Error: {error}
        </div>
      )}
      <div ref={containerRef} />

      <style>{`
        .textLayer {
          position: absolute;
          top: 0; left: 0;
          z-index: 5 !important;
          pointer-events: auto !important;
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        .textLayer span {
          color: transparent !important;
          position: absolute !important;
          cursor: text !important;
          pointer-events: auto !important;
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        .textLayer br { display: none; }
        .textLayer ::selection { background: rgba(108,99,255,0.45) !important; }
        .pdf-page-wrapper[data-rendered="false"]::after {
          content: attr(data-page-number);
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 48px; font-weight: 700; color: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  )
}
