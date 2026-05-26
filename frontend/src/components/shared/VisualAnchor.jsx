/**
 * VisualAnchor — renders the visual_content from the deep model.
 * visual_type: ascii | table | timeline | map | none
 */
export default function VisualAnchor({ type, content }) {
  if (!content || type === 'none') return null

  let visualElement = null

  if (type === 'ascii' || type === 'map') {
    visualElement = <AsciiBlock content={content} />
  } else if (type === 'table') {
    visualElement = <MarkdownTable raw={content} />
  } else if (type === 'timeline') {
    visualElement = <Timeline raw={content} />
  } else {
    visualElement = <AsciiBlock content={content} />
  }

  return (
    <div style={{ margin: '14px 18px 20px' }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6
      }}>
        <span>💻 Visual Representation ({type})</span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border) 0%, transparent 100%)' }} />
      </div>
      {visualElement}
    </div>
  )
}

/** Parse and render a GitHub-style markdown table */
function MarkdownTable({ raw }) {
  const lines = raw.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return <AsciiBlock content={raw} />

  const parseRow = (line) =>
    line.split('|').map((c) => c.trim()).filter((c, idx, arr) => {
      // Remove leading and trailing empty items from pipe borders
      return c !== '' || (idx !== 0 && idx !== arr.length - 1)
    })

  const headers = parseRow(lines[0])
  // lines[1] is the separator row (---|---|...)
  const rows = lines.slice(2).map(parseRow)

  return (
    <div style={{
      overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)',
      background: 'rgba(26,29,39,0.5)', backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
    }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: 13, color: 'var(--text-primary)',
      }}>
        <thead>
          <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                color: 'var(--text-primary)', fontSize: 11, textTransform: 'uppercase',
                letterSpacing: '0.05em', borderRight: '1px solid var(--border)'
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{
              background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              borderBottom: ri === rows.length - 1 ? 'none' : '1px solid var(--border)'
            }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '10px 14px',
                  lineHeight: 1.5,
                  color: ci === 0 ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: ci === 0 ? 500 : 400,
                  borderRight: ci === row.length - 1 ? 'none' : '1px solid var(--border)'
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Render timeline text as styled step list */
function Timeline({ raw }) {
  const lines = raw.trim().split('\n').filter(Boolean)
  return (
    <div style={{
      padding: '16px 20px', borderRadius: 10, border: '1px solid var(--border)',
      background: 'rgba(26,29,39,0.4)', backdropFilter: 'blur(8px)'
    }}>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'stretch', position: 'relative' }}>
          {/* Left column containing bullet and connector line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dim) 100%)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff',
              boxShadow: '0 0 10px rgba(108,99,255,0.3)',
            }}>
              {i + 1}
            </div>
            {i < lines.length - 1 && (
              <div style={{
                flex: 1, width: 2, minHeight: 16, background: 'var(--border)', margin: '4px 0'
              }} />
            )}
          </div>
          {/* Right column containing text */}
          <div style={{ paddingBottom: i < lines.length - 1 ? 16 : 8, flex: 1 }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {line.replace(/^[-*•→0-9.\\s]*/, '').trim()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function AsciiBlock({ content }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 8,
      background: '#07080c', border: '1px solid var(--border)',
      fontFamily: "'Courier New', Courier, monospace", fontSize: 12.5,
      color: '#43d98c', lineHeight: 1.6, whiteSpace: 'pre',
      overflowX: 'auto', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
    }}>
      {content}
    </div>
  )
}
