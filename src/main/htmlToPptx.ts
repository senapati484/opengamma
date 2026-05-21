import { JSDOM } from 'jsdom'
import type { Slide, Theme } from '../renderer/src/types'

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface PptxTextElement {
  type: 'text'
  text: string | { text: string; options?: any }[]
  options: any // PptxGenJS TextPropsOptions
}

export interface PptxShapeElement {
  type: 'shape'
  shapeType: 'rect' | 'circle' | 'line' | string // ShapeType from pptxgenjs
  options: any // PptxGenJS ShapeProps
}

export interface PptxTableElement {
  type: 'table'
  rows: any[][] // PptxGenJS TableCell[][]
  options: any // PptxGenJS TablePropsOptions
}

export interface PptxSlideArgs {
  background?: { fill: string }
  elements: (PptxTextElement | PptxShapeElement | PptxTableElement)[]
  notes?: string
}

// ─── CSS Custom Properties Parsing Helpers ────────────────────────────────────

/**
 * Extracts a CSS variable color value from theme cssTokens.
 * Falls back to standard theme color properties if not found.
 */
function parseColor(css: string, variableName: string, fallback: string): string {
  const regex = new RegExp(`${variableName}\\s*:\\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)`, 'i')
  const match = css.match(regex)
  if (match && match[1]) {
    let color = match[1].trim()
    if (color.startsWith('#') && color.length === 4) {
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
    }
    return color
  }
  return fallback
}

/**
 * Extracts a CSS variable font-family name from theme cssTokens.
 * Falls back to standard Arial font.
 */
function parseFont(css: string, variableName: string, fallback: string): string {
  const regex = new RegExp(`${variableName}\\s*:\\s*['"]?([^,'";}]+)['"]?`, 'i')
  const match = css.match(regex)
  if (match && match[1]) {
    return match[1].split(',')[0].trim().replace(/['"]/g, '')
  }
  return fallback
}

/**
 * Strips the '#' from a hex color string for PptxGenJS compat.
 */
function cleanHex(color: string): string {
  return color.replace('#', '')
}

/**
 * Returns true if a color is perceptually dark (useful for contrast controls).
 */
function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '')
  let r = 0,
    g = 0,
    b = 0
  if (c.length === 3) {
    r = parseInt(c[0] + c[0], 16)
    g = parseInt(c[1] + c[1], 16)
    b = parseInt(c[2] + c[2], 16)
  } else if (c.length === 6) {
    r = parseInt(c.slice(0, 2), 16)
    g = parseInt(c.slice(2, 4), 16)
    b = parseInt(c.slice(4, 6), 16)
  } else {
    return true
  }
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

// ─── Main Mapper Implementation ──────────────────────────────────────────────

/**
 * Converts a Reveal.js section HTML slide and its design system Theme into a
 * structured collection of native PPTX shapes, text paragraphs, and tables.
 */
export function mapSlideToArgs(slide: Slide, theme: Theme): PptxSlideArgs {
  const dom = new JSDOM(slide.html)
  const doc = dom.window.document

  const cssTokens = theme.cssTokens || ''

  // 1. Resolve design system color palettes
  const bgHex = parseColor(cssTokens, '--r-background-color', theme.colors.bg)
  const textHex = parseColor(cssTokens, '--r-main-color', theme.colors.text)
  const primaryHex = parseColor(cssTokens, '--r-heading-color', theme.colors.primary)
  const accentHex = parseColor(cssTokens, '--r-link-color', theme.colors.accent)

  const bg = cleanHex(bgHex)
  const textColor = cleanHex(textHex)
  const primaryColor = cleanHex(primaryHex)
  const accentColor = cleanHex(accentHex)

  // 2. Resolve theme-aligned typography
  const headingFont = parseFont(cssTokens, '--r-heading-font', 'Arial')
  const bodyFont = parseFont(cssTokens, '--r-main-font', 'Arial')

  const isBgDark = isColorDark(bgHex)
  const mutedColor = cleanHex(isBgDark ? '#a1a1aa' : '#71717a')

  const elements: (PptxTextElement | PptxShapeElement | PptxTableElement)[] = []
  const slideType = slide.slideType || 'content'

  // Standard slide background color
  const slideBg = { fill: bg }

  // ─── Title Slide ───────────────────────────────────────────────────────────
  if (slideType === 'title') {
    const h1 = doc.querySelector('h1')
    const h2 = doc.querySelector('h2')
    const mainHeading = h1 ? h1.textContent?.trim() : h2 ? h2.textContent?.trim() : slide.title

    const p = doc.querySelector('p')
    const subtitle = p ? p.textContent?.trim() : ''

    // Primary centered title block
    elements.push({
      type: 'text',
      text: mainHeading || 'Untitled Presentation',
      options: {
        x: 0.5,
        y: 1.5,
        w: 9.0,
        h: 1.6,
        fontSize: 44,
        fontFace: headingFont,
        color: primaryColor,
        align: 'center',
        valign: 'middle',
        bold: true
      }
    })

    // Centered subtitle block
    if (subtitle) {
      elements.push({
        type: 'text',
        text: subtitle,
        options: {
          x: 0.5,
          y: 3.2,
          w: 9.0,
          h: 1.0,
          fontSize: 20,
          fontFace: bodyFont,
          color: mutedColor,
          align: 'center',
          valign: 'top'
        }
      })
    }
  }

  // ─── Content Slide ─────────────────────────────────────────────────────────
  else if (slideType === 'content') {
    const h2 = doc.querySelector('h2')
    const h1 = doc.querySelector('h1')
    const mainHeading = h2 ? h2.textContent?.trim() : h1 ? h1.textContent?.trim() : slide.title

    // Left-aligned header block
    elements.push({
      type: 'text',
      text: mainHeading || 'Content Slide',
      options: {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.8,
        fontSize: 28,
        fontFace: headingFont,
        color: primaryColor,
        align: 'left',
        valign: 'middle',
        bold: true
      }
    })

    // Content body container: aggregates lists and paragraphs
    const contentRuns: any[] = []

    // Map list items (ul / li) as bullet points
    const uls = Array.from(doc.querySelectorAll('ul'))
    uls.forEach((ul) => {
      const lis = Array.from(ul.querySelectorAll('li'))
      lis.forEach((li) => {
        contentRuns.push({
          text: li.textContent?.trim() || '',
          options: {
            bullet: true,
            fontSize: 14,
            fontFace: bodyFont,
            color: textColor
          }
        })
      })
    })

    // Map regular non-aside paragraphs as regular paragraphs
    const paragraphs = Array.from(doc.querySelectorAll('p'))
    paragraphs.forEach((p) => {
      // Exclude empty paragraphs or subtitles
      const textVal = p.textContent?.trim()
      if (textVal) {
        contentRuns.push({
          text: textVal,
          options: {
            fontSize: 14,
            fontFace: bodyFont,
            color: textColor,
            breakLine: true
          }
        })
      }
    })

    if (contentRuns.length > 0) {
      elements.push({
        type: 'text',
        text: contentRuns,
        options: {
          x: 0.8,
          y: 1.5,
          w: 8.4,
          h: 3.5,
          align: 'left',
          valign: 'top'
        }
      })
    }
  }

  // ─── Split Slide ───────────────────────────────────────────────────────────
  else if (slideType === 'split') {
    const h2 = doc.querySelector('h2')
    const mainHeading = h2 ? h2.textContent?.trim() : slide.title

    // Slide Header
    elements.push({
      type: 'text',
      text: mainHeading || 'Split Comparison',
      options: {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.8,
        fontSize: 28,
        fontFace: headingFont,
        color: primaryColor,
        align: 'left',
        valign: 'middle',
        bold: true
      }
    })

    const h3s = Array.from(doc.querySelectorAll('h3'))

    if (h3s.length >= 2) {
      // Scenario A: Formal h3-based columns
      const leftH3 = h3s[0]
      const rightH3 = h3s[1]

      // Left Column Elements traversal
      let sibling = leftH3.nextElementSibling
      const leftLis: string[] = []
      const leftParagraphs: string[] = []
      while (sibling && sibling !== rightH3) {
        if (sibling.tagName.toLowerCase() === 'ul') {
          Array.from(sibling.querySelectorAll('li')).forEach((li) => {
            leftLis.push(li.textContent?.trim() || '')
          })
        } else if (sibling.tagName.toLowerCase() === 'p') {
          leftParagraphs.push(sibling.textContent?.trim() || '')
        }
        sibling = sibling.nextElementSibling
      }

      // Right Column Elements traversal
      sibling = rightH3.nextElementSibling
      const rightLis: string[] = []
      const rightParagraphs: string[] = []
      let blockquoteText = ''
      let rightElement: Element | null = null

      while (sibling) {
        const tag = sibling.tagName.toLowerCase()
        if (tag === 'ul') {
          Array.from(sibling.querySelectorAll('li')).forEach((li) => {
            rightLis.push(li.textContent?.trim() || '')
          })
        } else if (tag === 'p') {
          rightParagraphs.push(sibling.textContent?.trim() || '')
          if (!rightElement) rightElement = sibling
        } else if (tag === 'blockquote' || tag === 'q') {
          blockquoteText = sibling.textContent?.trim() || ''
          if (!rightElement) rightElement = sibling
        }
        sibling = sibling.nextElementSibling
      }

      // ── Left Column Render ──
      elements.push({
        type: 'text',
        text: leftH3.textContent?.trim() || 'Column Left',
        options: {
          x: 0.8,
          y: 1.5,
          w: 4.0,
          h: 0.4,
          fontSize: 18,
          fontFace: headingFont,
          color: primaryColor,
          bold: true,
          align: 'left',
          valign: 'middle'
        }
      })

      const leftTextRuns: any[] = []
      leftLis.forEach((bullet) => {
        leftTextRuns.push({
          text: bullet,
          options: { bullet: true, fontSize: 14, fontFace: bodyFont, color: textColor }
        })
      })
      leftParagraphs.forEach((pText) => {
        leftTextRuns.push({
          text: pText,
          options: { fontSize: 14, fontFace: bodyFont, color: textColor, breakLine: true }
        })
      })

      if (leftTextRuns.length > 0) {
        elements.push({
          type: 'text',
          text: leftTextRuns,
          options: {
            x: 0.8,
            y: 2.0,
            w: 4.0,
            h: 3.0,
            align: 'left',
            valign: 'top'
          }
        })
      }

      // ── Right Column Render ──
      elements.push({
        type: 'text',
        text: rightH3.textContent?.trim() || 'Column Right',
        options: {
          x: 5.2,
          y: 1.5,
          w: 4.0,
          h: 0.4,
          fontSize: 18,
          fontFace: headingFont,
          color: primaryColor,
          bold: true,
          align: 'left',
          valign: 'middle'
        }
      })

      if (blockquoteText) {
        // Blockquote Layout style
        elements.push({
          type: 'text',
          text: `“${blockquoteText}”`,
          options: {
            x: 5.2,
            y: 2.0,
            w: 4.0,
            h: 3.0,
            fontSize: 18,
            fontFace: bodyFont,
            color: accentColor,
            italic: true,
            align: 'center',
            valign: 'middle'
          }
        })
      } else if (rightElement && rightElement.querySelector('strong')) {
        // Key Stat Layout style
        const strongText = rightElement.querySelector('strong')?.textContent?.trim() || ''
        const fullText = rightElement.textContent?.trim() || ''
        const labelText = fullText
          .replace(strongText, '')
          .replace(/^[—\s-]+/, '')
          .trim()

        elements.push({
          type: 'text',
          text: strongText,
          options: {
            x: 5.2,
            y: 2.0,
            w: 4.0,
            h: 1.4,
            fontSize: 48,
            fontFace: headingFont,
            color: accentColor,
            bold: true,
            align: 'center',
            valign: 'middle'
          }
        })

        if (labelText) {
          elements.push({
            type: 'text',
            text: labelText,
            options: {
              x: 5.2,
              y: 3.4,
              w: 4.0,
              h: 1.2,
              fontSize: 14,
              fontFace: bodyFont,
              color: textColor,
              align: 'center',
              valign: 'top'
            }
          })
        }
      } else {
        // Standard text/bullets fallbacks
        const rightTextRuns: any[] = []
        rightLis.forEach((bullet) => {
          rightTextRuns.push({
            text: bullet,
            options: { bullet: true, fontSize: 14, fontFace: bodyFont, color: textColor }
          })
        })
        rightParagraphs.forEach((pText) => {
          rightTextRuns.push({
            text: pText,
            options: { fontSize: 14, fontFace: bodyFont, color: textColor, breakLine: true }
          })
        })

        if (rightTextRuns.length > 0) {
          elements.push({
            type: 'text',
            text: rightTextRuns,
            options: {
              x: 5.2,
              y: 2.0,
              w: 4.0,
              h: 3.0,
              align: 'left',
              valign: 'top'
            }
          })
        }
      }
    } else {
      // Scenario B: Structural split fallback without H3
      const firstUl = doc.querySelector('ul')
      const blockquote = doc.querySelector('blockquote, q')
      const paragraphs = Array.from(doc.querySelectorAll('p'))

      // Left column: main bullets
      if (firstUl) {
        const leftTextRuns: any[] = []
        Array.from(firstUl.querySelectorAll('li')).forEach((li) => {
          leftTextRuns.push({
            text: li.textContent?.trim() || '',
            options: { bullet: true, fontSize: 14, fontFace: bodyFont, color: textColor }
          })
        })

        elements.push({
          type: 'text',
          text: leftTextRuns,
          options: {
            x: 0.8,
            y: 1.5,
            w: 4.0,
            h: 3.5,
            align: 'left',
            valign: 'top'
          }
        })
      }

      // Right column: blockquote, stat, or paragraphs
      if (blockquote) {
        elements.push({
          type: 'text',
          text: `“${blockquote.textContent?.trim() || ''}”`,
          options: {
            x: 5.2,
            y: 1.5,
            w: 4.0,
            h: 3.5,
            fontSize: 18,
            fontFace: bodyFont,
            color: accentColor,
            italic: true,
            align: 'center',
            valign: 'middle'
          }
        })
      } else {
        const potentialStat = paragraphs.find((p) => p.querySelector('strong'))
        if (potentialStat) {
          const strongText = potentialStat.querySelector('strong')?.textContent?.trim() || ''
          const fullText = potentialStat.textContent?.trim() || ''
          const labelText = fullText
            .replace(strongText, '')
            .replace(/^[—\s-]+/, '')
            .trim()

          elements.push({
            type: 'text',
            text: strongText,
            options: {
              x: 5.2,
              y: 1.8,
              w: 4.0,
              h: 1.4,
              fontSize: 48,
              fontFace: headingFont,
              color: accentColor,
              bold: true,
              align: 'center',
              valign: 'middle'
            }
          })

          if (labelText) {
            elements.push({
              type: 'text',
              text: labelText,
              options: {
                x: 5.2,
                y: 3.2,
                w: 4.0,
                h: 1.2,
                fontSize: 14,
                fontFace: bodyFont,
                color: textColor,
                align: 'center',
                valign: 'top'
              }
            })
          }
        } else if (paragraphs.length > 0) {
          // Render right column fallback using paragraphs
          const rightTextRuns: any[] = []
          paragraphs.forEach((p) => {
            const val = p.textContent?.trim()
            if (val) {
              rightTextRuns.push({
                text: val,
                options: { fontSize: 14, fontFace: bodyFont, color: textColor, breakLine: true }
              })
            }
          })

          if (rightTextRuns.length > 0) {
            elements.push({
              type: 'text',
              text: rightTextRuns,
              options: {
                x: 5.2,
                y: 1.5,
                w: 4.0,
                h: 3.5,
                align: 'left',
                valign: 'top'
              }
            })
          }
        }
      }
    }
  }

  // ─── Data Slide (Tables) ───────────────────────────────────────────────────
  else if (slideType === 'data') {
    const h2 = doc.querySelector('h2')
    const mainHeading = h2 ? h2.textContent?.trim() : slide.title

    // Slide Header
    elements.push({
      type: 'text',
      text: mainHeading || 'Data Insights',
      options: {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.8,
        fontSize: 28,
        fontFace: headingFont,
        color: primaryColor,
        align: 'left',
        valign: 'middle',
        bold: true
      }
    })

    const tableEl = doc.querySelector('table')

    if (tableEl) {
      const tableRows: any[][] = []

      // ── Process Headers ──
      const headers = Array.from(doc.querySelectorAll('table thead th, table thead td'))
      if (headers.length > 0) {
        tableRows.push(
          headers.map((h) => ({
            text: h.textContent?.trim() || '',
            options: {
              fill: primaryColor,
              color: bg,
              fontFace: headingFont,
              fontSize: 12,
              bold: true,
              align: 'center',
              valign: 'middle'
            }
          }))
        )
      }

      // ── Process Rows ──
      const trs = Array.from(doc.querySelectorAll('table tbody tr'))
      trs.forEach((tr) => {
        const tds = Array.from(tr.querySelectorAll('td'))
        tableRows.push(
          tds.map((td) => {
            const hasStrong = td.querySelector('strong') !== null
            return {
              text: td.textContent?.trim() || '',
              options: {
                fill: isBgDark ? '1e293b' : 'f1f5f9',
                color: hasStrong ? accentColor : textColor,
                fontFace: bodyFont,
                fontSize: 11,
                bold: hasStrong,
                align: 'left',
                valign: 'middle'
              }
            }
          })
        )
      })

      if (tableRows.length > 0) {
        elements.push({
          type: 'table',
          rows: tableRows,
          options: {
            x: 1.0,
            y: 1.5,
            w: 8.0,
            h: 3.5
          }
        })
      }
    } else {
      // Fallback to Content layout style if no table is found on a data slide
      const contentRuns: any[] = []
      Array.from(doc.querySelectorAll('ul li')).forEach((li) => {
        contentRuns.push({
          text: li.textContent?.trim() || '',
          options: { bullet: true, fontSize: 14, fontFace: bodyFont, color: textColor }
        })
      })
      Array.from(doc.querySelectorAll('p')).forEach((p) => {
        const val = p.textContent?.trim()
        if (val) {
          contentRuns.push({
            text: val,
            options: { fontSize: 14, fontFace: bodyFont, color: textColor, breakLine: true }
          })
        }
      })

      if (contentRuns.length > 0) {
        elements.push({
          type: 'text',
          text: contentRuns,
          options: {
            x: 0.8,
            y: 1.5,
            w: 8.4,
            h: 3.5,
            align: 'left',
            valign: 'top'
          }
        })
      }
    }
  }

  // ─── CTA Slide ─────────────────────────────────────────────────────────────
  else if (slideType === 'cta') {
    const h2 = doc.querySelector('h2')
    const mainHeading = h2 ? h2.textContent?.trim() : slide.title

    const p = doc.querySelector('p')
    const subtitle = p ? p.textContent?.trim() : ''

    const ul = doc.querySelector('ul')

    // Accent-colored background strip
    elements.push({
      type: 'shape',
      shapeType: 'rect',
      options: {
        x: 0,
        y: 1.8,
        w: 10.0,
        h: 2.0,
        fill: accentColor,
        line: { show: false }
      }
    })

    // Overlaid Action Text (uses background color for maximum contrast)
    elements.push({
      type: 'text',
      text: mainHeading || 'Take Action',
      options: {
        x: 0.5,
        y: 1.8,
        w: 9.0,
        h: 2.0,
        fontSize: 32,
        fontFace: headingFont,
        color: bg,
        align: 'center',
        valign: 'middle',
        bold: true
      }
    })

    // Subtitle / Next steps below the strip
    if (subtitle) {
      elements.push({
        type: 'text',
        text: subtitle,
        options: {
          x: 0.5,
          y: 4.0,
          w: 9.0,
          h: 0.6,
          fontSize: 18,
          fontFace: bodyFont,
          color: primaryColor,
          bold: true,
          align: 'center',
          valign: 'middle'
        }
      })
    }

    // Key takeaways summary list (leave-behind bullets)
    if (ul) {
      const summaryRuns: any[] = []
      Array.from(ul.querySelectorAll('li')).forEach((li) => {
        summaryRuns.push({
          text: li.textContent?.trim() || '',
          options: { bullet: true, fontSize: 12, fontFace: bodyFont, color: textColor }
        })
      })

      if (summaryRuns.length > 0) {
        elements.push({
          type: 'text',
          text: summaryRuns,
          options: {
            x: 1.5,
            y: 4.7,
            w: 7.0,
            h: 0.8,
            align: 'center',
            valign: 'top'
          }
        })
      }
    }
  }

  return {
    background: slideBg,
    elements,
    notes: slide.notes || ''
  }
}
