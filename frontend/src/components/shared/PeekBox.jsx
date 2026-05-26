import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * PeekBox — hover tooltip for curiosity chain badges.
 * Fetches a 1-liner from /peek on first hover, caches it.
 * Does NOT alter the main SidePanel context.
 */
export default function PeekBox({ topic, parentTerm }) {
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState(null)       // { one_liner, quick_fact }
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const cacheRef = useRef({})                  // topic → fetched data
  const timerRef = useRef(null)
  const badgeRef = useRef(null)

  const fetchPeek = useCallback(async () => {
    if (cacheRef.current[topic]) {
      setData(cacheRef.current[topic])
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/peek/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, parent_term: parentTerm }),
      })
      const json = await res.json()
      cacheRef.current[topic] = json
      setData(json)
    } catch {
      setData({ one_liner: topic, quick_fact: '' })
    } finally {
      setLoading(false)
    }
  }, [topic, parentTerm])

  const onMouseEnter = useCallback((e) => {
    // Position tooltip above the badge
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    timerRef.current = setTimeout(() => {
      setVisible(true)
      fetchPeek()
    }, 250)  // 250ms delay — prevents flash on rapid mouse movement
  }, [fetchPeek])

  const onMouseLeave = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <>
      {/* Badge */}
      <span
        ref={badgeRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
          borderRadius: 99, fontSize: 11.5, fontWeight: 500, cursor: 'default',
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', userSelect: 'none',
          transition: 'border-color 0.15s, color 0.15s',
        }}
      >
        {topic}
      </span>

      {/* Tooltip portal — rendered at fixed position */}
      {visible && (
        <div
          onMouseEnter={() => clearTimeout(timerRef.current)}
          onMouseLeave={onMouseLeave}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 999,
            width: 240,
            background: 'var(--bg-card)',
            border: '1px solid var(--accent)',
            borderRadius: 10,
            padding: '10px 13px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
          }}
        >
          {/* Caret */}
          <div style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 10, background: 'var(--bg-card)',
            border: '1px solid var(--accent)', borderTop: 'none', borderLeft: 'none',
            transform: 'translate(-50%, 0) rotate(45deg)',
          }} />

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {topic}
          </div>

          {loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading…</div>
          ) : data ? (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 5 }}>
                {data.one_liner}
              </div>
              {data.quick_fact && (
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45, borderTop: '1px solid var(--border)', paddingTop: 5, marginTop: 4 }}>
                  📌 {data.quick_fact}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </>
  )
}
