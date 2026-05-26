import assert from 'node:assert/strict'

import { extractOCRWords } from './ocrWords.js'

const data = {
  words: null,
  blocks: [
    {
      paragraphs: [
        {
          lines: [
            {
              words: [
                { text: 'Dummy', bbox: { x0: 81, y0: 101, x1: 161, y1: 122 } },
                { text: 'PDF', bbox: { x0: 170, y0: 101, x1: 212, y1: 117 } },
                { text: 'file', bbox: { x0: 220, y0: 101, x1: 251, y1: 117 } },
              ],
            },
          ],
        },
      ],
    },
  ],
}

assert.deepEqual(extractOCRWords(data).map((word) => word.text), ['Dummy', 'PDF', 'file'])
