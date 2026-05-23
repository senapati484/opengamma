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
export function parseSlideHtml(html: string, index: number): Slide {
  try {
    const dom = new JSDOM(html)
    const doc = dom.window.document

    // The root element must be a <section>
    const section = doc.querySelector('section')

    let slideType: 'title' | 'content' | 'split' | 'data' | 'cta' = 'content'
    let id = ''

    if (section) {
      // 1. Extract slideType from data-slide-type attribute
      const typeAttr = section.getAttribute('data-slide-type')
      if (
        typeAttr === 'title' ||
        typeAttr === 'content' ||
        typeAttr === 'split' ||
        typeAttr === 'data' ||
        typeAttr === 'cta'
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
      section.querySelectorAll('p, li, h3, table, pre, div.card, div.stat-block, div.quote-block').forEach((el) => {
        let isNested = false
        let parent = el.parentElement
        while (parent && parent !== section) {
          const parentTag = parent.tagName.toLowerCase()
          const parentClass = parent.getAttribute('class') || ''
          
          if (
            ['p', 'li', 'h3', 'table', 'pre', 'ul', 'ol'].includes(parentTag) ||
            (parentTag === 'div' && (parentClass.includes('card') || parentClass.includes('stat-block') || parentClass.includes('quote-block')))
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

    // 6. Get the updated HTML representation excluding the stripped notes aside
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
      bullets
    }
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
    }
  }
}
