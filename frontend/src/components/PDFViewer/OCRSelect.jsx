import { useState, useRef, useCallback } from 'react'
import { createWorker } from 'tesseract.js'
import { useSessionStore } from '@/store/sessionStore'

/**
 * OCRSelect — invisible overlay on the PDF canvas.
 * User drags a rectangle → we crop that region from the underlying canvas →
 * run Tesseract OCR → extract text → fire setHighlight to trigger AI lookup.
 */
export default function OCRSelect({ scrollRef }) {
  const setHighlight = useSessionStore((s) => s.setHighlight)
  const currentPage  = useSessionStore((s) => s.currentPage)

  const [dragging, setDragging] = useState(false)
  const [rect, setRect]         = useState(null)
  const [ocring, setOcring]     = useState(false)
  const [ocrText, setOcrText]   = useState('')
  const startRef = useRef(null)

  const onMouseDown = useCallback((e) => {
    // Only activate on left click + no text selection active
    if (e.button !== 0) return
    const scrollEl = scrollRef?.current
    if (!scrollEl) return

    const bounds = scrollEl.getBoundingClientRect()
    startRef.current = {
      x: e.clientX - bounds.left + scrollEl.scrollLeft,
      y: e.clientY - bounds.top + scrollEl.scrollTop,
    }
    setDragging(true)
    setRect(null)
    setOcrText('')
  }, [scrollRef])

  const onMouseMove = useCallback((e) => {
    if (!dragging || !startRef.current) return
    const scrollEl = scrollRef?.current
    if (!scrollEl) return

    const bounds = scrollEl.getBoundingClientRect()
    const curX = e.clientX - bounds.left + scrollEl.scrollLeft
    const curY = e.clientY - bounds.top + scrollEl.scrollTop

    setRect({
      x: Math.min(startRef.current.x, curX),
      y: Math.min(startRef.current.y, curY),
      w: Math.abs(curX - startRef.current.x),
      h: Math.abs(curY - startRef.current.y),
    })
  }, [dragging, scrollRef])

  const onMouseUp = useCallback(async () => {
    if (!dragging || !rect || rect.w < 20 || rect.h < 10) {
      setDragging(false)
      setRect(null)
      return
    }
    setDragging(false)

    // Find which canvas the selection overlaps
    const scrollEl = scrollRef?.current
    if (!scrollEl) return

    const wrappers = scrollEl.querySelectorAll('.pdf-page-wrapper')
    let targetCanvas = null
    let canvasOffsetX = 0
    let canvasOffsetY = 0

    for (const wrapper of wrappers) {
      const wTop = wrapper.offsetTop
      const wLeft = wrapper.offsetLeft
      const wBottom = wTop + wrapper.offsetHeight
      const wRight = wLeft + wrapper.offsetWidth

      // Check if selection overlaps this wrapper
      if (rect.y < wBottom && rect.y + rect.h > wTop &&
          rect.x < wRight && rect.x + rect.w > wLeft) {
        targetCanvas = wrapper.querySelector('canvas')
        canvasOffsetX = wLeft
        canvasOffsetY = wTop
        break
      }
    }

    if (!targetCanvas) { setRect(null); return }

    // Calculate crop coordinates relative to the canvas
    const displayW = targetCanvas.clientWidth
    const displayH = targetCanvas.clientHeight
    const scaleX = targetCanvas.width / displayW
    const scaleY = targetCanvas.height / displayH

    const cropX = Math.max(0, (rect.x - canvasOffsetX) * scaleX)
    const cropY = Math.max(0, (rect.y - canvasOffsetY) * scaleY)
    const cropW = Math.min(rect.w * scaleX, targetCanvas.width - cropX)
    const cropH = Math.min(rect.h * scaleY, targetCanvas.height - cropY)

    if (cropW < 10 || cropH < 10) { setRect(null); return }

    // Crop the region from canvas
    const cropCanvas = document.createElement('canvas')
    cropCanvas.width = cropW
    cropCanvas.height = cropH
    const ctx = cropCanvas.getContext('2d')
    ctx.drawImage(targetCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    // Run Tesseract OCR
    setOcring(true)
    try {
      const worker = await createWorker('eng')
      const { data } = await worker.recognize(cropCanvas)
      const text = data.text.trim()
      await worker.terminate()

      if (text) {
        setOcrText(text)
        // Use the first meaningful word/phrase (up to 60 chars) as the term
        const term = text.split('\n')[0].trim().substring(0, 60)
        if (term.length >= 2) {
          setHighlight(term, text, currentPage)
        }
      } else {
        setOcrText('(no text detected)')
      }
    } catch (err) {
      console.error('OCR error:', err)
      setOcrText('OCR failed')
    } finally {
      setOcring(false)
      // Clear selection after a short delay
      setTimeout(() => { setRect(null); setOcrText('') }, 2000)
    }
  }, [dragging, rect, scrollRef, setHighlight, currentPage])

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: dragging ? 'crosshair' : 'crosshair',
        zIndex: 5,
        // Allow text selection through when not dragging
        pointerEvents: 'auto',
      }}
    >
      {/* Selection rectangle */}
      {rect && rect.w > 5 && (
        <div style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          border: '2px dashed var(--accent)',
          background: 'rgba(108, 99, 255, 0.12)',
          borderRadius: 3,
          pointerEvents: 'none',
        }} />
      )}

      {/* OCR status badge */}
      {(ocring || ocrText) && rect && (
        <div style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y + rect.h + 6,
          background: 'var(--bg-card)',
          border: '1px solid var(--accent)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          color: ocring ? 'var(--accent)' : ocrText.startsWith('(') ? 'var(--text-muted)' : '#43d98c',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 10,
        }}>
          {ocring ? '⏳ Reading text…' : `✓ "${ocrText.substring(0, 40)}${ocrText.length > 40 ? '…' : ''}"`}
        </div>
      )}
    </div>
  )
}
