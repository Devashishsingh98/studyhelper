import { useEffect, useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSessionStore } from '@/store/sessionStore'
import { useStream } from '@/hooks/useStream'
import PeekBox from '@/components/shared/PeekBox'
import VisualAnchor from '@/components/shared/VisualAnchor'

export default function SidePanel() {
  const selectedTerm    = useSessionStore((s) => s.selectedTerm)
  const selectedContext = useSessionStore((s) => s.selectedContext)
  const selectedPage    = useSessionStore((s) => s.selectedPage)
  const saveConcept     = useSessionStore((s) => s.saveConcept)

  const [oneLinerStream, setOneLinerStream] = useState('')
  const [fastData, setFastData]     = useState(null)
  const [deepData, setDeepData]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [analogyText, setAnalogyText] = useState('')
  const [showAnalogy, setShowAnalogy] = useState(false)
  const [saved, setSaved]           = useState(false)

  const fastBufRef = useRef('')

  const handleFastChunk = useCallback((chunk) => {
    fastBufRef.current += chunk
    const match = fastBufRef.current.match(/"one_liner"\s*:\s*"((?:[^"\\]|\\.)*)/)
    if (match) setOneLinerStream(match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'))
  }, [])

  const handleFastDone = useCallback((data) => {
    const d = Array.isArray(data) ? data[0] : data
    setFastData(d)
    if (d?.one_liner) setOneLinerStream(d.one_liner)
    else if (d?.error) setOneLinerStream(`Error: ${d.error}`)
    else if (d?.raw) setOneLinerStream(`Failed to parse AI response.`)
  }, [])

  const handleDeepDone = useCallback((data) => {
    const d = Array.isArray(data) ? data[0] : data
    setDeepData(d)
    setLoading(false)
  }, [])

  const handleAnalogyUpdate = useCallback((text) => setAnalogyText(text), [])
  const handleError = useCallback((msg) => {
    console.error('Stream error:', msg)
    setLoading(false)
  }, [])

  const { fire, fireAnalogy } = useStream({
    onFastChunk: handleFastChunk,
    onFastDone:  handleFastDone,
    onDeepDone:  handleDeepDone,
    onAnalogydone: handleAnalogyUpdate,
    onError:     handleError,
  })

  useEffect(() => {
    if (!selectedTerm) return
    fastBufRef.current = ''
    setOneLinerStream('')
    setFastData(null)
    setDeepData(null)
    setAnalogyText('')
    setShowAnalogy(false)
    setSaved(false)
    setLoading(true)
    fire(selectedTerm, selectedContext, selectedPage)

    const timeout = setTimeout(() => setLoading(false), 15000)
    return () => clearTimeout(timeout)
  }, [selectedTerm, selectedContext, selectedPage])

  const onEscapeHatch = () => {
    setShowAnalogy(true)
    setAnalogyText('')
    fireAnalogy(selectedTerm)
  }

  const onSave = () => {
    saveConcept({
      term:      selectedTerm,
      one_liner: fastData?.one_liner || oneLinerStream,
      trap:      fastData?.examiner_trap,
      static:    deepData?.static_fact,
      page:      selectedPage,
    })
    setSaved(true)
  }

  if (!selectedTerm) {
    return (
      <div className="h-full overflow-y-auto flex flex-col bg-[#0b0f19] border-l border-slate-800 relative">
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">✦</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-200 mb-2 tracking-tight">Knowledge Hub</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mb-8">
            Select terms or use the search bar to generate interactive visual cheat sheets.
          </p>
          <div className="w-full space-y-3">
            <div className="w-full p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-left hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold text-[10px] tracking-wide">OPTION A</span>
                <span className="font-semibold text-slate-200">Instant Selection</span>
              </div>
              Highlight any phrase directly on the PDF to trigger the analysis workspace.
            </div>
            <div className="w-full p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-left hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold text-[10px] tracking-wide">OPTION B</span>
                <span className="font-semibold text-slate-200">Active Lookup</span>
              </div>
              Type a concept in the search bar and click <span className="text-indigo-400 font-medium">Ask AI</span>.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col bg-[#0b0f19] border-l border-slate-800 relative space-y-6 pb-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      
      {/* 1. Term Header */}
      <div className="sticky top-0 z-10 px-6 pt-8 pb-6 border-b border-white/5 bg-[#0b0f19]/90 backdrop-blur-md flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight leading-tight">
            {selectedTerm}
          </h1>
          <div className="flex items-center gap-3 shrink-0 mt-1">
            {selectedPage > 0 && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 uppercase tracking-widest shadow-sm">
                Page {selectedPage}
              </span>
            )}
            {loading && <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-indigo-500 animate-spin" />}
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-6 px-6 flex-1">
        
        {/* 2. The 1-Liner Card */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col gap-3 shadow-lg shadow-black/20">
          <div className="flex items-start gap-3">
            <span className="text-indigo-400 text-lg drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">💡</span>
            <div className="flex-1 text-[14.5px] text-slate-200 leading-relaxed italic">
              {fastData?.error || deepData?.error ? (
                <span className="text-red-400 not-italic font-medium flex items-center gap-2">
                  <span className="text-red-500">⚠️</span> {fastData?.error || deepData?.error}
                </span>
              ) : oneLinerStream ? (
                <div className="prose prose-invert prose-p:inline prose-sm not-italic font-medium text-slate-100">
                  <ReactMarkdown>{oneLinerStream}</ReactMarkdown>
                </div>
              ) : (
                <span className="text-slate-500 not-italic animate-pulse">Synthesizing core essence…</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. High-Density Facts */}
        {(deepData?.static_fact || deepData?.current_affair || deepData?.why_examiner_asks) && (
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col gap-6 shadow-lg shadow-black/20">
            {deepData?.static_fact && (
              <div className="flex flex-col gap-2">
                <h3 className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Static Base
                </h3>
                <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm ml-3 border-l border-slate-700/50 pl-3">
                  <ReactMarkdown>{deepData.static_fact}</ReactMarkdown>
                </div>
              </div>
            )}

            {deepData?.current_affair && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold tracking-widest text-amber-500 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Current Affair
                  </h3>
                  {deepData.source_confidence === 'low' && (
                    <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">
                      Low confidence
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm ml-3 border-l border-slate-700/50 pl-3">
                  <ReactMarkdown>{deepData.current_affair}</ReactMarkdown>
                </div>
              </div>
            )}

            {deepData?.why_examiner_asks && (
              <div className="flex flex-col gap-2">
                <h3 className="text-[10px] font-bold tracking-widest text-teal-400 uppercase flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  Why Examiner Asks
                </h3>
                <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm ml-3 border-l border-slate-700/50 pl-3">
                  <ReactMarkdown>{deepData.why_examiner_asks}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Visual Anchor Block */}
        {deepData?.visual_content && deepData.visual_type !== 'none' && (
          <div className="p-1 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg shadow-black/20">
            <div className="bg-[#050505] border border-slate-800/50 font-mono text-emerald-400 p-4 text-sm overflow-x-auto rounded-lg">
              <VisualAnchor type={deepData.visual_type} content={deepData.visual_content} />
            </div>
          </div>
        )}

        {/* 5. The Examiner's Trap */}
        {fastData?.examiner_trap && (
          <div className="p-5 rounded-xl bg-slate-900/40 border border-red-900/30 shadow-lg shadow-black/20 relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-orange-500"></div>
            <h3 className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-3 flex items-center gap-2">
              <span className="text-sm">⚠️</span> EXAMINER'S TRAP
            </h3>
            <div className="text-sm text-red-100/70 leading-relaxed prose prose-invert prose-sm">
              <ReactMarkdown>{fastData.examiner_trap}</ReactMarkdown>
            </div>
          </div>
        )}

        {deepData?.contradiction_flag && (
          <div className="p-5 rounded-xl bg-slate-900/40 border border-orange-900/30 shadow-lg shadow-black/20 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
            <h3 className="text-[11px] font-bold tracking-widest text-orange-400 uppercase mb-3 flex items-center gap-2">
              <span className="text-sm">⚡</span> Contradiction Detected
            </h3>
            <div className="text-sm text-orange-200/80 leading-relaxed prose prose-invert prose-sm">
              <ReactMarkdown>{deepData.contradiction_flag}</ReactMarkdown>
            </div>
          </div>
        )}

        {showAnalogy && (
          <div className="p-5 rounded-xl bg-slate-900/40 border border-purple-900/30 shadow-lg shadow-black/20 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
            <h3 className="text-[11px] font-bold tracking-widest text-purple-400 uppercase mb-3 flex items-center gap-2">
              <span className="text-sm">💡</span> Simplified Analogy
            </h3>
            <div className="text-sm text-purple-100/80 leading-relaxed prose prose-invert prose-sm">
              {analogyText ? <ReactMarkdown>{analogyText}</ReactMarkdown> : <span className="text-slate-500 animate-pulse">Forging analogy…</span>}
            </div>
          </div>
        )}

        {/* Deep Exploration Action Dock */}
        {(fastData || oneLinerStream) && (
          <div className="grid grid-cols-1 gap-2 pt-2">
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              Deep Exploration
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="px-3 py-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-300 text-[11px] font-semibold hover:bg-slate-700 hover:text-white hover:scale-[1.02] active:scale-95 transition-all text-left flex items-center gap-2 shadow-sm">
                <span className="text-indigo-400 text-sm">📊</span> Mains Perspective
              </button>
              <button className="px-3 py-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-300 text-[11px] font-semibold hover:bg-slate-700 hover:text-white hover:scale-[1.02] active:scale-95 transition-all text-left flex items-center gap-2 shadow-sm">
                <span className="text-amber-400 text-sm">⏳</span> Timeline Map
              </button>
              <button className="col-span-2 px-3 py-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-300 text-[11px] font-semibold hover:bg-slate-700 hover:text-white hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-sm">
                <span className="text-teal-400 text-sm">💡</span> Cross-Reference Concepts
              </button>
            </div>
          </div>
        )}

        {/* 6. Curiosity Chain */}
        {deepData?.curiosity_chain?.length > 0 && (
          <div className="pt-2">
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">
              🔗 Exploration Pathways
            </div>
            <div className="flex flex-wrap gap-2">
              {deepData.curiosity_chain.map((topic) => (
                <div key={topic} className="bg-slate-800/40 border border-slate-700/50 px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all flex items-center justify-center cursor-pointer shadow-sm">
                  <PeekBox topic={topic} parentTerm={selectedTerm} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(fastData || oneLinerStream) && (
        <div className="px-6 mt-auto pt-6 flex flex-col gap-3 shrink-0">
          {!showAnalogy && (
            <button
              className="w-full py-3.5 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-700 hover:text-white hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
              onClick={onEscapeHatch}
            >
              🔄 Still shaky? Explain with an analogy
            </button>
          )}
          
          <button
            className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${
              saved 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-none cursor-default hover:scale-100 active:scale-100' 
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50'
            }`}
            onClick={onSave}
            disabled={saved}
          >
            {saved ? '✓ Saved to Revision Bookmarks' : '＋ Add to Revision Bookmarks'}
          </button>
        </div>
      )}
    </div>
  )
}
