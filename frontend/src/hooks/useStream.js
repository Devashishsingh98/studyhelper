import { useEffect, useRef, useCallback } from 'react'

const BACKEND = '/highlight'

export function useStream({ onFastChunk, onFastDone, onDeepChunk, onDeepDone, onAnalogydone, onError }) {
  const abortRef = useRef(null)

  const readSSE = useCallback(async (url, body, onChunk, onDone, signal) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal,
      })
      if (!res.ok) { onError?.(`HTTP ${res.status}`); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            if (!data) continue

            const isDone = currentEvent.endsWith('_done')
            if (isDone) {
              try { onDone?.(JSON.parse(data)) } catch { onDone?.({ raw: data }) }
            } else {
              onChunk?.(data)
            }
            currentEvent = ''
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError?.(err?.message ?? 'Stream error')
    }
  }, [onError])

  const fire = useCallback(async (term, context, page, opts = {}) => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const body = JSON.stringify({
      term,
      context_snippet: context,
      page_number: page,
      dimension: opts.dimension,
      custom_query: opts.custom_query,
    })

    // Fire fast and deep in parallel unless it's a follow-up which we can just route to deep
    if (opts.custom_query) {
      await readSSE(`${BACKEND}/deep`, body, onDeepChunk, onDeepDone, ctrl.signal)
    } else {
      await Promise.all([
        readSSE(`${BACKEND}/fast`, body, onFastChunk, onFastDone, ctrl.signal),
        readSSE(`${BACKEND}/deep`, body, onDeepChunk, onDeepDone, ctrl.signal),
      ])
    }
  }, [readSSE, onFastChunk, onFastDone, onDeepChunk, onDeepDone])

  const fireAnalogy = useCallback(async (term) => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const body = JSON.stringify({
      term,
      context_snippet: term,
      page_number: 0,
    })

    let accumulated = ''
    try {
      const res = await fetch(`${BACKEND}/analogy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: ctrl.signal,
      })
      if (!res.ok) { onError?.(`Analogy HTTP ${res.status}`); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const d = line.slice(5).trim()
            if (d) {
              accumulated += d + ' '
              onAnalogydone?.(accumulated.trim())
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError?.(err?.message ?? 'Analogy error')
    }
  }, [onAnalogydone, onError])

  useEffect(() => () => abortRef.current?.abort(), [])

  return { fire, fireAnalogy }
}
