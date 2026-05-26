import { useRef, useState } from 'react'
import { useSessionStore } from '@/store/sessionStore'
import PDFViewer from '@/components/PDFViewer/PDFViewer'
import SidePanel from '@/components/SidePanel/SidePanel'
import ReviewSystem from '@/components/Checkpoint/ReviewSystem'

export default function Reader() {
  const pdfUrl = useSessionStore((s) => s.pdfUrl)
  const setPdfFile = useSessionStore((s) => s.setPdfFile)
  const currentPage = useSessionStore((s) => s.currentPage)
  const totalPages = useSessionStore((s) => s.totalPages)
  const pageInterval = useSessionStore((s) => s.pageInterval)
  const setPageInterval = useSessionStore((s) => s.setPageInterval)
  const setHighlight = useSessionStore((s) => s.setHighlight)

  const [dragging, setDragging] = useState(false)
  const [lookupTerm, setLookupTerm] = useState('')
  const fileInputRef = useRef()

  const submitLookup = (e) => {
    e.preventDefault()
    const term = lookupTerm.trim()
    if (!term) return
    setHighlight(term, term, currentPage)
    setLookupTerm('')
  }

  const handleFile = (file) => {
    if (file?.type === 'application/pdf') setPdfFile(file)
  }
  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }
  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Top Bar ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px',
        height: 48, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.4px', color: 'var(--accent)' }}>
          ✦ StudyHelper
        </div>

        {/* ── Term lookup (works for scanned PDFs too) ── */}
        <form onSubmit={submitLookup} style={{ display: 'flex', gap: 0, flex: pdfUrl ? '0 0 320px' : '0' }}>
          <input
            value={lookupTerm}
            onChange={(e) => setLookupTerm(e.target.value)}
            placeholder={pdfUrl ? '🔍 Type any term to look up…' : ''}
            style={{
              flex: 1, padding: '5px 12px', borderRadius: '6px 0 0 6px',
              background: 'var(--bg-base)', border: '1px solid var(--border)',
              borderRight: 'none', color: 'var(--text-primary)', fontSize: 12.5,
              outline: 'none', display: pdfUrl ? 'block' : 'none',
            }}
          />
          {pdfUrl && (
            <button type="submit" style={{
              padding: '5px 12px', borderRadius: '0 6px 6px 0',
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Ask AI</button>
          )}
        </form>

        <div style={{ flex: 1 }} />

        {/* Page indicator — click to jump */}
        {pdfUrl && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            Page
            <input
              type="number" min={1} max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const p = Math.max(1, Math.min(totalPages, Number(e.target.value)))
                const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${p}"]`)
                if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              style={{
                width: 48, padding: '2px 4px', borderRadius: 4, textAlign: 'center',
                background: 'var(--bg-base)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 12, fontWeight: 700,
              }}
            />
            / {totalPages}
          </span>
        )}

        {/* Checkpoint interval control */}
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Checkpoint every
          <input
            type="number" min={1} max={100} value={pageInterval}
            onChange={(e) => setPageInterval(Number(e.target.value))}
            style={{
              width: 44, padding: '2px 6px', borderRadius: 5,
              background: 'var(--bg-base)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 12, textAlign: 'center',
            }}
          />
          pages
        </label>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            padding: '5px 14px', borderRadius: 6, background: 'var(--accent)',
            border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {pdfUrl ? '↑ Change PDF' : 'Upload PDF'}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])} />
      </header>

      {/* ── Main split-pane ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Left — PDF Viewer */}
        <div
          style={{
            flex: pdfUrl ? '1 1 60%' : '1 1 100%',
            overflow: 'hidden', position: 'relative', transition: 'flex 0.3s ease',
          }}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        >
          {pdfUrl ? (
            <>
              <PDFViewer />
              <ReviewSystem />
            </>
          ) : (
            /* Drop zone */
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
              border: dragging ? '2px dashed var(--accent)' : '2px dashed var(--border)',
              margin: 32, borderRadius: 16, transition: 'border-color 0.2s',
              background: dragging ? 'var(--accent-glow)' : 'transparent',
            }}>
              <div style={{ fontSize: 48 }}>📄</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Drop your PDF here
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>or</div>
              <button
                onClick={() => fileInputRef.current.click()}
                style={{
                  padding: '10px 24px', borderRadius: 8, background: 'var(--accent)',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Browse PDF
              </button>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
                Highlight any word in the PDF to get instant exam context on the right panel
              </div>
            </div>
          )}
        </div>

        {/* Right — Side Panel (only when PDF is loaded) */}
        {pdfUrl && (
          <div style={{ flex: '0 0 380px', overflow: 'hidden', minWidth: 300, maxWidth: 460 }}>
            <SidePanel />
          </div>
        )}
      </div>

      {/* Spinner keyframe (injected once) */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translate(-50%,16px); } to { opacity:1; transform:translate(-50%,0); } }
        .pdf-text-layer span { cursor: text; color: transparent; }
        .pdf-text-layer ::selection { background: rgba(108,99,255,0.35); }
      `}</style>
    </div>
  )
}
