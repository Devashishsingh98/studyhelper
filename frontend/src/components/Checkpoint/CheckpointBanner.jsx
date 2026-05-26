import { useRef } from 'react'
import { useSessionStore } from '@/store/sessionStore'

export default function CheckpointBanner() {
  const show = useSessionStore((s) => s.showCheckpointBanner)
  const dismiss = useSessionStore((s) => s.dismissCheckpoint)
  const highlights = useSessionStore((s) => s.highlightsSinceCheckpoint)

  if (!show) return null

  return (
    <div style={{
      position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg-card)', border: '1px solid var(--accent)',
      borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center',
      gap: 14, boxShadow: '0 4px 32px rgba(108,99,255,0.25)',
      zIndex: 100, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
      animation: 'slideUp 0.3s ease',
    }}>
      <span style={{ fontSize: 16 }}>📍</span>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        Checkpoint — <strong style={{ color: 'var(--text-primary)' }}>{highlights.length} concepts</strong> saved
      </span>
      <button
        onClick={() => { /* Phase 5: open review overlay */ dismiss() }}
        style={{
          padding: '5px 14px', borderRadius: 6, background: 'var(--accent)',
          border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Review 2 min
      </button>
      <button
        onClick={dismiss}
        style={{
          padding: '5px 12px', borderRadius: 6, background: 'transparent',
          border: '1px solid var(--border)', color: 'var(--text-secondary)',
          fontSize: 12.5, cursor: 'pointer',
        }}
      >
        Keep Reading
      </button>
    </div>
  )
}
