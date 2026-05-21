import PptxGenJS from 'pptxgenjs'
import type { Presentation } from '../renderer/src/types'
import { mapSlideToArgs } from './htmlToPptx'
import { themes } from '../renderer/src/lib/themes'

// Simple helper to parse colors from theme CSS tokens (identical to htmlToPptx.ts)
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

function cleanHex(color: string): string {
  return color.replace('#', '')
}

/**
 * Converts a Presentation database object containing raw Reveal.js slide HTML
 * into a completed native PPTX file using PptxGenJS.
 *
 * @param presentation  The presentation data to serialise
 * @param filePath      Absolute path chosen via the native save dialog
 */
export async function exportToPptx(presentation: Presentation, filePath: string): Promise<void> {
  console.log(
    `[exporter] exportToPptx starting for presentation: ${presentation.id}, slides: ${presentation.slides.length}`
  )

  // 1. Instantiate PptxGenJS
  const pptx = new PptxGenJS()

  // 2. Set presentation properties
  pptx.layout = 'LAYOUT_16x9' // Matches coordinates 10 x 5.625 viewport perfectly
  pptx.title = presentation.title || 'Presentation'
  pptx.author = 'OpenGamma'

  // 3. Resolve theme matching the presentation
  const themeId = presentation.theme
  const theme = themes.find((t) => t.id === themeId) || themes[0]

  const cssTokens = theme.cssTokens || ''
  const bgHex = parseColor(cssTokens, '--r-background-color', theme.colors.bg)
  const bg = cleanHex(bgHex)

  // 4. Define slide master matching the theme background color
  pptx.defineSlideMaster({
    title: 'THEME_MASTER',
    background: { color: bg, fill: bg }
  })

  // 5. Convert each slide
  for (const slide of presentation.slides) {
    try {
      // Create new slide inheriting our custom slide master layout
      const pptxSlide = pptx.addSlide({ masterName: 'THEME_MASTER' })

      // Generate slide shape and text parameters from its Reveal.js HTML and active Theme context
      const args = mapSlideToArgs(slide, theme)

      // Set slide background color if explicitly present in args (per-slide override)
      if (args.background) {
        const fillVal = args.background.fill
        if (fillVal) {
          pptxSlide.background = { color: fillVal, fill: fillVal }
        }
      }

      // Add speaker notes to slide
      if (slide.notes) {
        pptxSlide.addNotes(slide.notes)
      }

      // Draw all processed elements (text blocks, shapes, table cells)
      for (const el of args.elements) {
        if (el.type === 'text') {
          pptxSlide.addText(el.text as any, el.options)
        } else if (el.type === 'shape') {
          pptxSlide.addShape(el.shapeType as any, el.options)
        } else if (el.type === 'table') {
          pptxSlide.addTable(el.rows, el.options)
        }
      }
    } catch (slideErr: unknown) {
      const msg = slideErr instanceof Error ? slideErr.message : String(slideErr)
      console.error(
        `[exporter] Failed to convert slide index ${slide.index} (ID: ${slide.id}, Title: "${slide.title}"):`,
        msg
      )
      // Standard requirement: skip bad slides gracefully without breaking the entire compilation/save flow
    }
  }

  // 6. Serialise and write directly to disk
  await pptx.writeFile({ fileName: filePath })
  console.log(`[exporter] exportToPptx successfully saved to path: ${filePath}`)
}
