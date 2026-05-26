function isFiniteBBox(bbox) {
  return bbox
    && Number.isFinite(bbox.x0)
    && Number.isFinite(bbox.y0)
    && Number.isFinite(bbox.x1)
    && Number.isFinite(bbox.y1)
    && bbox.x1 > bbox.x0
    && bbox.y1 > bbox.y0
}

function isOCRWord(word) {
  return Boolean(word?.text?.trim()) && isFiniteBBox(word.bbox)
}

function wordsFromBlocks(blocks) {
  const words = []

  for (const block of blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) {
          if (isOCRWord(word)) words.push(word)
        }
      }
    }
  }

  return words
}

export function extractOCRWords(data) {
  const directWords = Array.isArray(data?.words) ? data.words.filter(isOCRWord) : []
  return directWords.length ? directWords : wordsFromBlocks(data?.blocks)
}
