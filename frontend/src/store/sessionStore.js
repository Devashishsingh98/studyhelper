import { create } from 'zustand'

export const useSessionStore = create((set, get) => ({
  // PDF state
  pdfFile: null,
  pdfUrl: null,
  currentPage: 1,
  totalPages: 0,
  pageInterval: 10,
  lastCheckpointPage: 1,

  // Highlight state
  selectedTerm: null,
  selectedContext: '',
  selectedPage: 1,

  // Checkpoint
  showCheckpointBanner: false,
  highlightsSinceCheckpoint: [],

  // Actions
  setPdfFile: (file) => {
    const url = URL.createObjectURL(file)
    set({ pdfFile: file, pdfUrl: url, currentPage: 1, totalPages: 0, lastCheckpointPage: 1, highlightsSinceCheckpoint: [] })
  },
  setCurrentPage: (page) => {
    set({ currentPage: page })
    const { lastCheckpointPage, pageInterval, highlightsSinceCheckpoint } = get()
    const pagesRead = page - lastCheckpointPage
    const densityTrigger = highlightsSinceCheckpoint.length >= 8
    if (pagesRead >= pageInterval || densityTrigger) {
      set({ showCheckpointBanner: true })
    }
  },
  setTotalPages: (n) => set({ totalPages: n }),
  setPageInterval: (n) => set({ pageInterval: n }),

  setHighlight: (term, context, page) => {
    set((s) => {
      const nextHighlights = [...s.highlightsSinceCheckpoint, { term, page }]
      const densityTrigger = nextHighlights.length >= 8
      return {
        selectedTerm: term,
        selectedContext: context,
        selectedPage: page,
        highlightsSinceCheckpoint: nextHighlights,
        showCheckpointBanner: s.showCheckpointBanner || densityTrigger,
      }
    })
  },

  dismissCheckpoint: () => {
    const { currentPage } = get()
    set({ showCheckpointBanner: false, lastCheckpointPage: currentPage, highlightsSinceCheckpoint: [] })
  },

  saveConcept: async (concept) => {
    // Persist to backend DB (Phase 4 — replaces localStorage mock)
    try {
      await fetch('/notes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term:        concept.term,
          one_liner:   concept.one_liner,
          exam_trap:   concept.trap,
          static_fact: concept.static,
          page_number: concept.page ?? 1,
          difficulty:  concept.difficulty ?? 'shaky',
        }),
      })
    } catch {
      // Fallback: keep in localStorage if API is down
      const saved = JSON.parse(localStorage.getItem('studyhelper_notes') || '[]')
      saved.push({ ...concept, ts: Date.now() })
      localStorage.setItem('studyhelper_notes', JSON.stringify(saved))
    }
  },
}))
