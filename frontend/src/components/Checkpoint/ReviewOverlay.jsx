import { useState, useEffect } from 'react'
import { useSessionStore } from '@/store/sessionStore'

const DIFF_LABELS = {
  hard:  { label: 'Hard — review tomorrow',  days: 1, color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)' },
  shaky: { label: 'Shaky — review in 3 days', days: 3, color: '#ffa500', bg: 'rgba(255,165,0,0.1)' },
  easy:  { label: 'Easy — review in 7 days',  days: 7, color: '#43d98c', bg: 'rgba(67,217,140,0.1)' },
}

export default function ReviewOverlay({ question, onClose }) {
  const [revealed, setRevealed]       = useState(false)
  const [selected, setSelected]       = useState(null)   // for spot_lie
  const [difficulty, setDifficulty]   = useState(null)
  const [submitting, setSubmitting]   = useState(false)
  const highlightsSinceCheckpoint     = useSessionStore((s) => s.highlightsSinceCheckpoint)

  if (!question) return null

  const isSpotLie = question.type === 'spot_lie'

  const handleReveal = () => setRevealed(true)

  const handleDifficulty = async (diff) => {
    setDifficulty(diff)
    setSubmitting(true)
    const terms = question.terms_tested || highlightsSinceCheckpoint.map((h) => h.term)
    try {
      await fetch('/notes/review/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms, difficulty: diff, user_id: 'default' }),
      })
    } catch (_) { /* non-fatal */ }
    setSubmitting(false)
    setTimeout(onClose, 600)  // brief delay so user sees confirmation
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 540,
        background: 'var(--bg-card)', border: '1px solid var(--accent)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,99,255,0.2)',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: 'var(--bg-hover)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              {question.type === 'spot_lie' ? '🎯' : question.type === 'connect_dots' ? '🔗' : '⚡'}
            </span>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {question.type === 'spot_lie' ? 'Spot the Lie' : question.type === 'connect_dots' ? 'Connect the Dots' : 'Cause & Effect'}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            fontSize: 18, cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* ── Question ── */}
        <div style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 18 }}>
            {question.question}
          </div>

          {/* ── Spot the Lie options ── */}
          {isSpotLie && question.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {question.options.map((opt, i) => {
                const isCorrect = revealed && i === question.answer_index
                const isWrong   = revealed && selected === i && i !== question.answer_index
                return (
                  <div
                    key={i}
                    onClick={() => !revealed && setSelected(i)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 13,
                      border: `1px solid ${isCorrect ? '#ff4d6d' : isWrong ? '#ffa500' : selected === i ? 'var(--accent)' : 'var(--border)'}`,
                      background: isCorrect ? 'rgba(255,77,109,0.1)' : isWrong ? 'rgba(255,165,0,0.08)' : selected === i ? 'var(--accent-glow)' : 'var(--bg-base)',
                      color: 'var(--text-primary)', cursor: revealed ? 'default' : 'pointer',
                      transition: 'all 0.15s', lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', marginRight: 8, fontWeight: 700 }}>{String.fromCharCode(65 + i)}.</span>
                    {opt}
                    {isCorrect && <span style={{ marginLeft: 8, color: '#ff4d6d', fontWeight: 700 }}>← FALSE</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Hint (connect_dots / cause_effect) ── */}
          {!isSpotLie && !revealed && question.hint && (
            <div style={{
              padding: '8px 12px', borderRadius: 7, background: 'var(--bg-base)',
              border: '1px dashed var(--border)', fontSize: 12.5,
              color: 'var(--text-muted)', marginBottom: 14,
            }}>
              💡 Hint: {question.hint}
            </div>
          )}

          {/* ── Reveal button ── */}
          {!revealed && (
            <button
              onClick={handleReveal}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 8,
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              Reveal Answer
            </button>
          )}

          {/* ── Reveal panel ── */}
          {revealed && (
            <div style={{
              padding: '14px 16px', borderRadius: 10, marginBottom: 18,
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              animation: 'fadeIn 0.25s ease',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
                Explanation
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {question.reveal}
              </div>
            </div>
          )}

          {/* ── SR Difficulty Rating ── */}
          {revealed && !difficulty && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, textAlign: 'center' }}>
                How well did you know this?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(DIFF_LABELS).reverse().map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => handleDifficulty(key)}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '9px 6px', borderRadius: 8,
                      border: `1px solid ${meta.color}`, background: meta.bg,
                      color: meta.color, fontSize: 11.5, fontWeight: 600,
                      cursor: 'pointer', lineHeight: 1.3, transition: 'opacity 0.15s',
                    }}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>+{meta.days}d</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Submitted confirmation ── */}
          {difficulty && (
            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 13, color: DIFF_LABELS[difficulty].color, fontWeight: 600 }}>
              ✓ {DIFF_LABELS[difficulty].label}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}
