import { useCallback, useRef } from 'react'
import { useSessionStore } from '@/store/sessionStore'

const DEBOUNCE_MS = 400
const MIN_CHARS = 2
const MAX_CHARS = 200

/**
 * useHighlight — attaches to any container div via `highlightRef`.
 * On mouseup, captures the selected text + surrounding sentence context,
 * then fires setHighlight() into the session store.
 */
export function useHighlight() {
  const setHighlight = useSessionStore((s) => s.setHighlight)
  const currentPage = useSessionStore((s) => s.currentPage)
  const timerRef = useRef(null)

  const onMouseUp = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      const term = selection.toString().trim()
      if (term.length < MIN_CHARS || term.length > MAX_CHARS) return

      // Extract surrounding sentence context from the range
      let context = ''
      try {
        const range = selection.getRangeAt(0)
        const container = range.commonAncestorContainer
        const fullText = container.textContent || ''
        // Find sentence boundaries around the selected term
        const termStart = fullText.indexOf(term)
        if (termStart !== -1) {
          const sentenceStart = Math.max(0, fullText.lastIndexOf('.', termStart) + 1)
          const sentenceEnd = fullText.indexOf('.', termStart + term.length)
          context = fullText
            .slice(sentenceStart, sentenceEnd !== -1 ? sentenceEnd + 1 : sentenceStart + 300)
            .trim()
        }
      } catch (_) {
        context = term
      }

      setHighlight(term, context || term, currentPage)
      // Keep the native browser selection visible so the user sees the highlight!
      // selection.removeAllRanges()
    }, DEBOUNCE_MS)
  }, [setHighlight, currentPage])

  return { onMouseUp }
}
