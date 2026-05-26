import { JSDOM } from 'jsdom'
import { randomUUID } from 'crypto'
import type { Slide } from '../renderer/src/types'

/**
 * Extracts complete <section>...</section> blocks from a streaming buffer.
 *
 * @param buffer The accumulated stream buffer string.
 * @returns A tuple containing an array of fully matched section HTML strings and any remaining partial content.
 */
export function extractCompleteSlides(buffer: string): [string[], string] {
  const slides: string[] = []
  // Regular expression to find non-greedy complete section blocks.
  // Enforces matching from the opening tag up to its corresponding closing tag.
  const regex = /<section[^>]*>[\s\S]*?<\/section>/gi
  let match: RegExpExecArray | null
  let lastIndex = 0

  while ((match = regex.exec(buffer)) !== null) {
    slides.push(match[0])
    lastIndex = regex.lastIndex
  }

  // The remainder starts from the end of the last fully completed slide
  const remainder = buffer.slice(lastIndex)
  return [slides, remainder]
}

/**
 * Parses raw slide HTML into a structured Slide object, extracting styling,
 * text contents, notes, and metadata attributes.
 *
 * @param html The raw HTML string representing a single slide section.
 * @param index The zero-based index position of the slide.
 * @returns A structured Slide object conforming to the system requirements.
 */
const COMPACT_LAYOUT_CSS = `
/* Compact Layout CSS Overrides */
.reveal section {
  padding: 20px 30px !important;
  box-sizing: border-box !important;
}
.reveal h1 {
  font-size: 2.0em !important;
  margin-bottom: 20px !important;
}
.reveal h2 {
  font-size: 1.5em !important;
  margin-bottom: 16px !important;
}
.reveal h3 {
  font-size: 1.05em !important;
  margin-bottom: 10px !important;
}
.reveal p, .reveal li, .reveal span, .reveal td, .reveal th {
  font-size: 0.76em !important;
  line-height: 1.35 !important;
}
.reveal ul, .reveal ol {
  margin-top: 8px !important;
  margin-bottom: 8px !important;
}
.reveal li {
  margin-bottom: 5px !important;
}
.reveal .card {
  padding: 12px 14px !important;
  border-radius: 8px !important;
  margin-bottom: 8px !important;
}
.reveal .card h3 {
  font-size: 1.0em !important;
  margin-bottom: 4px !important;
}
.reveal .card p {
  font-size: 0.72em !important;
  line-height: 1.3 !important;
}
.reveal .card ul,
.reveal .card ol {
  padding-left: 20px !important;
  margin-left: 0 !important;
}
.reveal .stat-block {
  padding: 12px 14px !important;
  border-radius: 8px !important;
}
.reveal .stat-number {
  font-size: 1.8em !important;
  font-weight: 800 !important;
  margin-bottom: 4px !important;
}
.reveal .stat-label {
  font-size: 0.68em !important;
  letter-spacing: 0.05em !important;
}
.reveal .cols {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
  gap: 16px !important;
  margin-top: 14px !important;
}
.reveal .col {
  gap: 4px !important;
}
.reveal .og-bottom-tray {
  padding: 10px 14px !important;
  margin-top: 14px !important;
  border-radius: 8px !important;
}
.reveal .og-bottom-tray .badge {
  margin-bottom: 6px !important;
}
.reveal .og-bottom-tray .cols {
  margin-top: 6px !important;
  gap: 10px !important;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
}
.reveal .quote-block {
  margin: 12px auto !important;
  padding: 6px 14px !important;
  max-width: 90% !important;
}
.reveal .quote-text {
  font-size: 0.95em !important;
  line-height: 1.3 !important;
  margin-bottom: 4px !important;
}
.reveal .quote-author {
  font-size: 0.72em !important;
}
.reveal .badge {
  padding: 2px 8px !important;
  font-size: 0.62em !important;
  margin-bottom: 8px !important;
}
.reveal .og-image-figure img {
  max-height: 260px !important;
  border-radius: 8px !important;
}
.reveal .og-image-placeholder {
  min-height: 160px !important;
  border-radius: 8px !important;
}

/* Sibling stat blocks horizontal auto-grid placement */
.reveal section[data-slide-type="data"],
.reveal section:has(.stat-block) {
  display: grid !important;
  grid-template-columns: repeat(12, 1fr) !important;
  grid-auto-rows: auto !important;
  gap: 10px !important;
  align-content: center !important;
  justify-content: center !important;
}
.reveal section[data-slide-type="data"] > h2,
.reveal section:has(.stat-block) > h2,
.reveal section[data-slide-type="data"] > .badge,
.reveal section:has(.stat-block) > .badge,
.reveal section[data-slide-type="data"] > .og-bottom-tray,
.reveal section:has(.stat-block) > .og-bottom-tray {
  grid-column: span 12 !important;
}
.reveal section[data-slide-type="data"] > *:not(.stat-block):not(h2):not(.badge):not(.og-bottom-tray) {
  grid-column: span 12 !important;
}
.reveal section > .stat-block:first-of-type:nth-last-of-type(3),
.reveal section > .stat-block:first-of-type:nth-last-of-type(3) ~ .stat-block {
  grid-column: span 4 !important;
}
.reveal section > .stat-block:first-of-type:nth-last-of-type(2),
.reveal section > .stat-block:first-of-type:nth-last-of-type(2) ~ .stat-block {
  grid-column: span 6 !important;
}
.reveal section > .stat-block:first-of-type:nth-last-of-type(4),
.reveal section > .stat-block:first-of-type:nth-last-of-type(4) ~ .stat-block {
  grid-column: span 3 !important;
}
.reveal section > .stat-block:first-of-type:nth-last-of-type(1) {
  grid-column: span 12 !important;
  max-width: 420px !important;
  margin: 0 auto !important;
}

/* Modern og-* styling definitions */
.reveal .og-title-block {
  text-align: center !important;
  margin-bottom: 16px !important;
}
.reveal .og-eyebrow {
  font-size: 0.62em !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
  opacity: 0.6 !important;
  margin-bottom: 6px !important;
  display: block !important;
}
.reveal .og-title {
  font-size: 1.6em !important;
  font-weight: 800 !important;
  margin-bottom: 6px !important;
}
.reveal .og-subtitle {
  font-size: 0.8em !important;
  opacity: 0.8 !important;
}
.reveal .og-heading {
  font-size: 1.2em !important;
  font-weight: 700 !important;
  margin-bottom: 10px !important;
}
.reveal .og-list {
  margin-top: 6px !important;
  margin-bottom: 6px !important;
}
.reveal .og-list-item {
  font-size: 0.76em !important;
  margin-bottom: 4px !important;
}
.reveal .og-split-wrap {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 16px !important;
  align-items: center !important;
  width: 100% !important;
}
.reveal .og-split-text {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
}
.reveal .og-split-image {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}
.reveal .og-full-bleed {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
}
.reveal .og-caption-bar {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 4px 10px !important;
  background: rgba(0, 0, 0, 0.6) !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
.reveal .og-caption {
  font-size: 0.65em !important;
  color: #fff !important;
}
.reveal .og-stats-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
  gap: 10px !important;
  width: 100% !important;
}
.reveal .og-stat-card {
  padding: 10px !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 6px !important;
}
.reveal .og-stat-value {
  font-size: 1.6em !important;
  font-weight: 800 !important;
  color: var(--og-slide-accent, #e8ff57) !important;
}
.reveal .og-stat-label {
  font-size: 0.65em !important;
}
.reveal .og-stat-context {
  font-size: 0.6em !important;
  opacity: 0.6 !important;
}
.reveal .og-quote-wrap {
  margin: 12px auto !important;
  max-width: 85% !important;
}
.reveal .og-quote-mark {
  font-size: 1.8em !important;
  line-height: 1 !important;
  color: var(--og-slide-accent, #e8ff57) !important;
}
.reveal .og-quote-text {
  font-size: 0.9em !important;
  font-style: italic !important;
}
.reveal .og-quote-attr {
  font-size: 0.7em !important;
  opacity: 0.8 !important;
}
.reveal .og-cta-block {
  text-align: center !important;
  padding: 16px !important;
}
.reveal .og-cta-heading {
  font-size: 1.3em !important;
  font-weight: 700 !important;
}
.reveal .og-cta-sub {
  font-size: 0.75em !important;
  opacity: 0.8 !important;
}
.reveal .og-cta-actions {
  display: flex !important;
  gap: 10px !important;
  justify-content: center !important;
  margin-top: 12px !important;
}
.reveal .og-cta-primary {
  padding: 6px 12px !important;
  background: var(--og-slide-accent, #e8ff57) !important;
  color: #000 !important;
  font-size: 0.7em !important;
  font-weight: 700 !important;
  border-radius: 5px !important;
}
.reveal .og-cta-secondary {
  padding: 6px 12px !important;
  background: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  font-size: 0.7em !important;
  border-radius: 5px !important;
}
`;

export function parseSlideHtml(html: string, index: number): Slide {
  try {
    const dom = new JSDOM(html)
    const doc = dom.window.document

    // The root element must be a <section>
    const section = doc.querySelector('section')

    if (section) {
      // Inject compact slide layout style overrides directly
      const styleEl = doc.createElement('style')
      styleEl.textContent = COMPACT_LAYOUT_CSS
      section.insertBefore(styleEl, section.firstChild)
    }

    let slideType: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote' =
      'content'
    let id = ''

    if (section) {
      // 1. Extract slideType from data-slide-type attribute
      const typeAttr = section.getAttribute('data-slide-type')
      if (
        typeAttr === 'title' ||
        typeAttr === 'content' ||
        typeAttr === 'split' ||
        typeAttr === 'data' ||
        typeAttr === 'cta' ||
        typeAttr === 'image' ||
        typeAttr === 'stat' ||
        typeAttr === 'quote'
      ) {
        slideType = typeAttr
      }

      // 2. Extract slug from data-slug attribute to use as id
      const slugAttr = section.getAttribute('data-slug')
      if (slugAttr && slugAttr.trim()) {
        id = slugAttr.trim()
      }
    }

    // Fallback if no slug found or valid id exists
    if (!id) {
      id = randomUUID()
    }

    // 3. Extract title: first h1 or h2 text content, with fallback
    const titleEl = doc.querySelector('h1, h2')
    const title = titleEl ? (titleEl.textContent || '').trim() : `Slide ${index + 1}`

    // 4. Extract notes: aside.notes text content, and delete it from the DOM
    const notesEl = doc.querySelector('aside.notes')
    const notes = notesEl ? (notesEl.textContent || '').trim() : ''
    if (notesEl) {
      notesEl.remove()
    }

    // 5. Extract content elements in order (p, li, h3, table, pre, div.card, div.stat-block, div.quote-block)
    const bullets: string[] = []
    if (section) {
      section
        .querySelectorAll('p, li, h3, table, pre, div.card, div.stat-block, div.quote-block')
        .forEach((el) => {
          let isNested = false
          let parent = el.parentElement
          while (parent && parent !== section) {
            const parentTag = parent.tagName.toLowerCase()
            const parentClass = parent.getAttribute('class') || ''

            if (
              ['p', 'li', 'h3', 'table', 'pre', 'ul', 'ol'].includes(parentTag) ||
              (parentTag === 'div' &&
                (parentClass.includes('card') ||
                  parentClass.includes('stat-block') ||
                  parentClass.includes('quote-block')))
            ) {
              if (parentTag !== 'ul' && parentTag !== 'ol') {
                isNested = true
                break
              }
            }
            parent = parent.parentElement
          }
          if (!isNested) {
            bullets.push(el.outerHTML.trim())
          }
        })
    }

    // 6. Detect og-image-placeholder class and read data-prompt
    let imagePrompt: string | undefined = undefined
    if (section) {
      const placeholderEl = section.querySelector('.og-image-placeholder')
      if (placeholderEl) {
        const dataPrompt = placeholderEl.getAttribute('data-prompt')
        if (dataPrompt && dataPrompt.trim()) {
          imagePrompt = dataPrompt.trim()
        } else {
          const firstBulletText = bullets.length > 0
            ? bullets[0].replace(/<[^>]*>/g, '').trim()
            : ''
          imagePrompt = `${title} — ${firstBulletText}`
        }
      }
    }

    // 7. Get the updated HTML representation excluding the stripped notes aside
    let finalHtml = html
    if (section) {
      finalHtml = section.outerHTML
    } else {
      finalHtml = doc.body.innerHTML
    }

    return {
      id,
      html: finalHtml,
      title,
      notes,
      slideType,
      index,
      bullets,
      slug: section ? section.getAttribute('data-slug') || '' : '',
      layout: section ? section.getAttribute('data-layout') || '' : '',
      imagePrompt
    } as any
  } catch (error: any) {
    console.error('HTML parse error in parseSlideHtml, returning fallback structure:', error)
    return {
      id: randomUUID(),
      html,
      title: `Slide ${index + 1}`,
      notes: '',
      slideType: 'content',
      index,
      bullets: []
    } as any
  }
}
