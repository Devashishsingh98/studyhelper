import { useState, useCallback } from 'react'
import { useSessionStore } from '@/store/sessionStore'

/* ─── Difficulty config ─────────────────────────────────────── */
const DIFF = {
  hard:  { label: 'Hard',  days: '+1d', color: '#ff4d6d', bg: 'rgba(255,77,109,0.12)' },
  shaky: { label: 'Shaky', days: '+3d', color: '#ffa500', bg: 'rgba(255,165,0,0.10)' },
  easy:  { label: 'Easy',  days: '+7d', color: '#43d98c', bg: 'rgba(67,217,140,0.10)' },
}

/* ═══════════════════════════════════════════════════════════════
   ReviewSystem — banner slide-in + question modal in one file
   ═══════════════════════════════════════════════════════════════ */
export default function ReviewSystem() {
  const showBanner      = useSessionStore((s) => s.showCheckpointBanner)
  const dismiss         = useSessionStore((s) => s.dismissCheckpoint)
  const highlights      = useSessionStore((s) => s.highlightsSinceCheckpoint)

  const [question, setQuestion]     = useState(null)
  const [loading,  setLoading]      = useState(false)
  const [showModal, setShowModal]   = useState(false)

  /* ── Fetch checkpoint question ── */
  const openReview = useCallback(async () => {
    setLoading(true)
    const terms = highlights.map((h) => h.term).filter(Boolean)
    try {
      const res = await fetch('/checkpoint/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms: terms.slice(-8),
          pages_read: 10,
          question_type: 'auto',
        }),
      })
      const data = await res.json()
      setQuestion(data)
      setShowModal(true)
    } catch {
      setQuestion(null)
    } finally {
      setLoading(false)
    }
  }, [highlights])

  const closeModal = () => {
    setShowModal(false)
    setQuestion(null)
    dismiss()
  }

  if (!showBanner && !showModal) return null

  return (
    <>
      {/* ── Slide-in Banner ── */}
      {showBanner && !showModal && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--accent)',
          borderRadius: 12, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 32px rgba(108,99,255,0.28)',
          zIndex: 100, whiteSpace: 'nowrap',
          animation: 'slideUp 0.3s ease',
        }}>
          <span style={{ fontSize: 18 }}>📍</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Checkpoint —{' '}
            {highlights.length > 0
              ? <><strong style={{ color: 'var(--text-primary)' }}>{highlights.length} concept{highlights.length !== 1 ? 's' : ''}</strong>{' this session'}</>
              : <span>quick knowledge check</span>
            }
          </span>
          <button
            onClick={openReview}
            disabled={loading}
            style={{
              padding: '6px 16px', borderRadius: 7, background: 'var(--accent)',
              border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Generating…' : 'Review 2 min'}
          </button>
          <button
            onClick={dismiss}
            style={{
              padding: '6px 14px', borderRadius: 7, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-secondary)',
              fontSize: 12.5, cursor: 'pointer',
            }}
          >
            Keep Reading
          </button>
        </div>
      )}

      {/* ── Modal Overlay ── */}
      {showModal && question && (
        <Modal question={question} onClose={closeModal} highlights={highlights} />
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translate(-50%,16px) } to { opacity:1; transform:translate(-50%,0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes popIn   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </>
  )
}

/* ─── Modal ─────────────────────────────────────────────────── */
function Modal({ question, onClose, highlights }) {
  const [revealed,   setRevealed]  = useState(false)
  const [selected,   setSelected]  = useState(null)
  const [difficulty, setDifficulty] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const isSpotLie = question.type === 'spot_lie'

  const handleDifficulty = async (diff) => {
    setDifficulty(diff)
    setSubmitting(true)
    const terms = question.terms_tested?.length
      ? question.terms_tested
      : highlights.map((h) => h.term)
    try {
      await fetch('/notes/review/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms, difficulty: diff, user_id: 'default' }),
      })
    } catch (_) {}
    setSubmitting(false)
    setTimeout(onClose, 700)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--bg-card)', border: '1px solid var(--accent)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
        animation: 'popIn 0.25s ease',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 18px', background: 'var(--bg-hover)',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {{ spot_lie: '🎯 Spot the Lie', connect_dots: '🔗 Connect the Dots', cause_effect: '⚡ Cause & Effect' }[question.type] ?? '📝 Checkpoint'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '20px 20px 22px' }}>

          {/* Question */}
          <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 18 }}>
            {question.question}
          </div>

          {/* Spot the Lie options */}
          {isSpotLie && question.options?.map((opt, i) => {
            const isFalse = revealed && i === question.answer_index
            const isWrong = revealed && selected === i && !isFalse
            return (
              <div key={i} onClick={() => !revealed && setSelected(i)} style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 8,
                border: `1px solid ${isFalse ? '#ff4d6d' : isWrong ? '#ffa500' : selected === i ? 'var(--accent)' : 'var(--border)'}`,
                background: isFalse ? 'rgba(255,77,109,0.1)' : isWrong ? 'rgba(255,165,0,0.08)' : selected === i ? 'var(--accent-glow)' : 'var(--bg-base)',
                color: 'var(--text-primary)', cursor: revealed ? 'default' : 'pointer',
                transition: 'all 0.15s', lineHeight: 1.5,
              }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700, marginRight: 8 }}>{String.fromCharCode(65 + i)}.</span>
                {opt}
                {isFalse && <span style={{ marginLeft: 8, color: '#ff4d6d', fontWeight: 700 }}>← FALSE</span>}
              </div>
            )
          })}

          {/* Hint (non-spot_lie) */}
          {!isSpotLie && !revealed && question.hint && (
            <div style={{
              padding: '8px 12px', borderRadius: 7, fontSize: 12.5,
              background: 'var(--bg-base)', border: '1px dashed var(--border)',
              color: 'var(--text-muted)', marginBottom: 14,
            }}>
              💡 Hint: {question.hint}
            </div>
          )}

          {/* Reveal button */}
          {!revealed && (
            <button onClick={() => setRevealed(true)} style={{
              width: '100%', padding: '11px 0', borderRadius: 8, marginTop: 4,
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Reveal Answer
            </button>
          )}

          {/* Explanation */}
          {revealed && (
            <div style={{
              padding: '13px 15px', borderRadius: 10, marginBottom: 16,
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              animation: 'fadeIn 0.25s ease',
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Explanation
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65 }}>
                {question.reveal}
              </div>
            </div>
          )}

          {/* SR Rating */}
          {revealed && !difficulty && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                How well did you know this?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['hard', 'shaky', 'easy'].map((d) => (
                  <button key={d} onClick={() => handleDifficulty(d)} disabled={submitting} style={{
                    flex: 1, padding: '9px 6px', borderRadius: 8,
                    border: `1px solid ${DIFF[d].color}`, background: DIFF[d].bg,
                    color: DIFF[d].color, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', lineHeight: 1.3,
                  }}>
                    {DIFF[d].label}
                    <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>{DIFF[d].days}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Confirmation */}
          {difficulty && (
            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 13, color: DIFF[difficulty].color, fontWeight: 600 }}>
              ✓ Scheduled — next review {DIFF[difficulty].days}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
