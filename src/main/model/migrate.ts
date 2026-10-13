/**
 * OpenGamma — HTML Slide → Deck Model Migration
 *
 * Converts the legacy HTML-based Slide format (what lives in SQLite today)
 * into the typed DeckSlide model used by the native PDF engine.
 *
 * This is the critical bridge — every existing presentation goes through here.
 * It is intentionally defensive: unrecognized HTML falls back gracefully.
 */

import { JSDOM } from 'jsdom'
import type {
  DeckSlide,
  Block,
  Layout,
  BulletItem,
  Card,
  StatItem
} from './schema'

// ─── Types imported from the existing renderer types ─────────────────────────

interface LegacySlide {
  id: string
  html: string
  notes?: string
  slideType?: string
  title?: string
  bullets?: string[]
  index?: number
  deckSlide?: unknown
}

// ─── Slide type → Layout mapping ─────────────────────────────────────────────

const SLIDE_TYPE_TO_LAYOUT: Record<string, Layout> = {
  title: 'title',
  content: 'content',
  split: 'two-col',
  data: 'stats',
  image: 'image-right',
  stat: 'stats',
  quote: 'quote',
  cta: 'closing',
  section: 'section',
  timeline: 'timeline',
  cards: 'cards',
  table: 'table',
  'two-col': 'two-col',
  closing: 'closing',
  blank: 'blank'
}

// ─── Main migration function ──────────────────────────────────────────────────

/**
 * Convert a single legacy HTML slide into a structured DeckSlide.
 * Uses JSDOM to parse the HTML and extract typed blocks.
 */
export function htmlSlideToDeckSlide(slide: LegacySlide, _themeId: string): DeckSlide {
  // If slide already has a structured DeckSlide attached, use it directly
  if (slide.deckSlide && typeof slide.deckSlide === 'object' && 'layout' in slide.deckSlide) {
    return slide.deckSlide as DeckSlide
  }

  const dom = new JSDOM(slide.html)
  const doc = dom.window.document
  const section = doc.querySelector('section') ?? doc.body

  // Determine layout from data-slide-type attribute or the stored slideType
  const rawType =
    section.getAttribute('data-slide-type') ||
    slide.slideType ||
    guessSlideType(section)
  let layout: Layout = SLIDE_TYPE_TO_LAYOUT[rawType] ?? 'content'

  // Extract blocks (may refine layout if e.g. two subheaders are detected)
  const { blocks, refinedLayout } = extractBlocks(section, layout, slide)
  if (refinedLayout) {
    layout = refinedLayout
  }

  return {
    id: slide.id,
    layout,
    blocks,
    notes: extractNotes(section) || slide.notes || undefined
  }
}

/**
 * Convert an array of legacy slides into a full deck's slide array.
 */
export function migrateSlides(slides: LegacySlide[], themeId: string): DeckSlide[] {
  return slides.map((s, i) =>
    htmlSlideToDeckSlide({ ...s, index: i }, themeId)
  )
}

// ─── Block extraction ─────────────────────────────────────────────────────────

function extractBlocks(
  section: Element,
  layout: Layout,
  _slide: LegacySlide
): { blocks: Block[]; refinedLayout?: Layout } {
  const blocks: Block[] = []
  let refinedLayout: Layout | undefined = undefined

  // Clone to work without mutating the original DOM node
  const el = section.cloneNode(true) as Element

  // Remove speaker notes — not slide content
  el.querySelectorAll('aside.notes').forEach((n) => n.remove())

  // ── Eyebrow / Badges near heading ─────────────────────────────────────────
  const badgeEl = el.querySelector('.badge, [class*="badge"], .og-eyebrow, .eyebrow')
  const badgeText = badgeEl ? cleanText(badgeEl.textContent ?? '') : undefined
  if (badgeEl) {
    badgeEl.remove()
  }

  // ── Heading ───────────────────────────────────────────────────────────────
  const h1 = el.querySelector('h1')
  const h2 = el.querySelector('h2')
  const mainHeading = h1 ?? h2
  if (mainHeading) {
    const text = cleanText(mainHeading.textContent ?? '')
    if (text) {
      blocks.push({
        type: 'heading',
        text,
        level: h1 ? 1 : 2,
        badge: badgeText
      })
    }
    mainHeading.remove()
  }

  // ── Subtitle / first paragraph (title slides) ──────────────────────────
  if (layout === 'title' || layout === 'closing') {
    const sub = el.querySelector('p')
    if (sub) {
      const text = cleanText(sub.textContent ?? '')
      if (text) blocks.push({ type: 'text', text, size: 'lg', align: 'center' })
      sub.remove()
    }
  }

  // ── Two-column comparison (split layout / sibling H3s) ────────────────────
  // Check if there are two H3 elements with lists (e.g. IoT Edge Layer & Cloud Layer)
  const h3Els = Array.from(el.querySelectorAll('h3'))
  if ((layout === 'two-col' || h3Els.length === 2) && h3Els.length === 2) {
    const leftH3 = h3Els[0]
    const rightH3 = h3Els[1]

    // Find lists directly associated with each H3
    let leftList: Element | null = null
    let rightList: Element | null = null

    // Check sibling traversal
    let cur: Element | null = leftH3.nextElementSibling
    while (cur && cur !== rightH3) {
      if (cur.tagName === 'UL' || cur.tagName === 'OL') {
        leftList = cur
        break
      }
      cur = cur.nextElementSibling
    }

    cur = rightH3.nextElementSibling
    while (cur) {
      if (cur.tagName === 'UL' || cur.tagName === 'OL') {
        rightList = cur
        break
      }
      cur = cur.nextElementSibling
    }

    if (leftList && rightList) {
      const leftItems = extractListItems(leftList)
      const rightItems = extractListItems(rightList)
      blocks.push({
        type: 'two-col',
        leftLabel: cleanText(leftH3.textContent ?? 'Before'),
        rightLabel: cleanText(rightH3.textContent ?? 'After'),
        leftItems,
        rightItems
      })
      leftH3.remove()
      rightH3.remove()
      leftList.remove()
      rightList.remove()
      refinedLayout = 'two-col'
    }
  }

  // Check for split / two-column containers (.og-asymmetric-split, .og-split-wrap, .cols, etc.)
  const splitContainer = el.querySelector(
    '.og-asymmetric-split, .og-split-wrap, [class*="split-wrap"], [class*="asymmetric-split"]'
  )
  if (splitContainer && !blocks.some((b) => b.type === 'two-col')) {
    const colChildren = Array.from(splitContainer.children)
    if (colChildren.length >= 2) {
      const leftEl = colChildren[0]
      const rightEl = colChildren[1]

      // Extract left side cards and items
      const leftCardEls = leftEl.querySelectorAll('.card, [class*="card"], .og-card')
      const leftCards: Card[] = []
      leftCardEls.forEach((card) => {
        const titleEl = card.querySelector('h3, h4, strong, b, .card-title, .og-heading')
        const bodyEl = card.querySelector('p, .card-body, .og-card-body')
        const title = cleanText(titleEl?.textContent ?? '')
        const body = cleanText(bodyEl?.textContent ?? '')
        if (title || body) {
          leftCards.push({ title: title || body, body: title ? body : undefined })
        }
      })
      const leftItems = extractListItems(leftEl)

      // Extract right side cards and items
      const rightCardEls = rightEl.querySelectorAll('.card, [class*="card"], .og-card')
      const rightCards: Card[] = []
      rightCardEls.forEach((card) => {
        const titleEl = card.querySelector('h3, h4, strong, b, .card-title, .og-heading')
        const bodyEl = card.querySelector('p, .card-body, .og-card-body')
        const title = cleanText(titleEl?.textContent ?? '')
        const body = cleanText(bodyEl?.textContent ?? '')
        if (title || body) {
          rightCards.push({ title: title || body, body: title ? body : undefined })
        }
      })
      const rightItems = extractListItems(rightEl)

      const leftLabelEl = leftEl.querySelector('h3, h4')
      const rightLabelEl = rightEl.querySelector('h3, h4')

      blocks.push({
        type: 'two-col',
        leftLabel: leftLabelEl && leftCards.length === 0 ? cleanText(leftLabelEl.textContent ?? '') : undefined,
        rightLabel: rightLabelEl && rightCards.length === 0 ? cleanText(rightLabelEl.textContent ?? '') : undefined,
        leftItems,
        rightItems,
        leftCards: leftCards.length > 0 ? leftCards : undefined,
        rightCards: rightCards.length > 0 ? rightCards : undefined
      })
      splitContainer.remove()
      refinedLayout = 'two-col'
    }
  }

  // Fallback two-column check via container classes (.cols, .col, .grid)
  if (layout === 'two-col' && !blocks.some((b) => b.type === 'two-col')) {
    const cols = el.querySelectorAll('.cols > div, [class*="col"] > div, .grid > div, .og-split-wrap > div')
    if (cols.length >= 2) {
      const leftEl = cols[0]
      const rightEl = cols[1]
      const leftLabelEl = leftEl.querySelector('h3, h4, strong')
      const rightLabelEl = rightEl.querySelector('h3, h4, strong')
      const leftItems = extractListItems(leftEl)
      const rightItems = extractListItems(rightEl)
      blocks.push({
        type: 'two-col',
        leftLabel: cleanText(leftLabelEl?.textContent ?? 'Phase A'),
        rightLabel: cleanText(rightLabelEl?.textContent ?? 'Phase B'),
        leftItems,
        rightItems
      })
      cols.forEach((c) => c.remove())
    }
  }

  // ── Cards (1 or more cards) ──────────────────────────────────────────────
  const cardEls = el.querySelectorAll('.card, [class*="card"], .og-card')
  if (cardEls.length >= 1) {
    const cards: Card[] = []
    cardEls.forEach((card) => {
      const titleEl = card.querySelector('h3, h4, strong, b, .card-title, .og-heading')
      const bodyEl = card.querySelector('p, .card-body, .og-card-body')
      const iconEl = card.querySelector('.icon, svg, [class*="icon"]')
      const title = cleanText(titleEl?.textContent ?? '')
      const body = cleanText(bodyEl?.textContent ?? '')
      if (title || body) {
        cards.push({
          title: title || body,
          body: title ? body : undefined,
          icon: iconEl?.getAttribute('data-icon') ?? undefined
        })
      }
      card.remove()
    })
    if (cards.length >= 1) {
      blocks.push({ type: 'cards', cards })
    }
  }

  // ── Bottom Tray / Milestones ─────────────────────────────────────────────
  const trayEl = el.querySelector('.og-bottom-tray, .tray')
  if (trayEl) {
    const trayItems: Card[] = []
    trayEl.querySelectorAll('.col, .cols > div, span, p').forEach((item) => {
      const strong = item.querySelector('strong, b')
      const title = cleanText(strong?.textContent ?? '')
      const text = cleanText(item.textContent ?? '')
      if (text) {
        const body = title ? text.replace(title, '').replace(/^[\s—:–-]+/, '').trim() : text
        trayItems.push({
          title: title || text,
          body: title ? body : undefined
        })
      }
    })
    if (trayItems.length > 0) {
      blocks.push({ type: 'cards', cards: trayItems.slice(0, 4) })
    }
    trayEl.remove()
  }

  // ── Stat blocks ──────────────────────────────────────────────────────────
  const statEls = el.querySelectorAll('.stat-block, [class*="stat-block"], .og-stat-card')
  if (statEls.length >= 1) {
    const stats: StatItem[] = []
    statEls.forEach((stat) => {
      const valueEl = stat.querySelector('.stat-number, [class*="stat-number"], .og-stat-value, strong, b')
      const labelEl = stat.querySelector('.stat-label, [class*="stat-label"], .og-stat-label, p, span:last-child')
      const deltaEl = stat.querySelector('.badge, [class*="badge"], .delta, [class*="delta"]')
      const value = cleanText(valueEl?.textContent ?? '')
      const label = cleanText(labelEl?.textContent ?? '')
      if (value) {
        const deltaText = cleanText(deltaEl?.textContent ?? '')
        stats.push({
          value,
          label: label || '',
          delta: deltaText || undefined,
          deltaPositive: deltaText ? (deltaText.includes('+') || deltaText.includes('↑')) : undefined
        })
      }
      stat.remove()
    })
    if (stats.length >= 1) {
      blocks.push({ type: 'stats', stats })
    }
  }

  // ── Quote blocks ─────────────────────────────────────────────────────────
  const quoteEls = el.querySelectorAll('.quote-block, blockquote, [class*="quote"]')
  if (quoteEls.length >= 1) {
    const quoteEl = quoteEls[0]
    const textEl = quoteEl.querySelector('.quote-text, .og-quote-text, p') ?? quoteEl
    const authorEl = quoteEl.querySelector('.quote-author, .og-quote-attr, cite, footer, span:last-child')
    const text = cleanText(textEl.textContent ?? '').replace(/^[""]|[""]$/g, '')
    if (text) {
      const authorRaw = cleanText(authorEl?.textContent ?? '').replace(/^—\s*/, '')
      const [author, role] = authorRaw.split(',').map((s) => s.trim())
      blocks.push({
        type: 'quote',
        text,
        author: author || undefined,
        role: role || undefined
      })
    }
    quoteEls.forEach((q) => q.remove())
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  const tableEl = el.querySelector('table')
  if (tableEl) {
    const headers: string[] = []
    const rows: string[][] = []
    tableEl.querySelectorAll('thead th, thead td').forEach((th) =>
      headers.push(cleanText(th.textContent ?? ''))
    )
    tableEl.querySelectorAll('tbody tr').forEach((tr) => {
      const cells: string[] = []
      tr.querySelectorAll('td, th').forEach((td) => cells.push(cleanText(td.textContent ?? '')))
      if (cells.some((c) => c)) rows.push(cells)
    })
    if (headers.length > 0 || rows.length > 0) {
      blocks.push({ type: 'table', headers, rows })
    }
    tableEl.remove()
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  const imgEl = el.querySelector('img, figure, [class*="og-image"]')
  if (imgEl) {
    const src = imgEl.getAttribute('src') ||
                imgEl.querySelector('img')?.getAttribute('src') ||
                imgEl.getAttribute('data-prompt') ||
                ''
    const isPlaceholder = imgEl.classList.contains('og-image-placeholder') ||
                          !imgEl.getAttribute('src')
    if (!isPlaceholder && src) {
      blocks.push({
        type: 'image',
        src,
        alt: imgEl.getAttribute('alt') || '',
        fit: 'cover',
        rounded: true,
        scrim: layout === 'image-left' || layout === 'image-right'
      })
    }
    imgEl.remove()
  }

  // ── Bullet list (with bold prefix detection) ─────────────────────────────
  const ulEls = el.querySelectorAll('ul, ol')
  if (ulEls.length > 0) {
    const items: BulletItem[] = []
    ulEls.forEach((ul) => {
      ul.querySelectorAll(':scope > li').forEach((li) => {
        const nestedUl = li.querySelector('ul, ol')
        const children: string[] = []
        if (nestedUl) {
          nestedUl.querySelectorAll('li').forEach((child) => {
            const childText = cleanText(child.textContent ?? '')
            if (childText) children.push(childText)
          })
          nestedUl.remove()
        }

        const strongEl = li.querySelector('strong, b')
        const fullText = cleanText(li.textContent ?? '')
        let title: string | undefined = undefined
        let body: string | undefined = undefined

        if (strongEl) {
          title = cleanText(strongEl.textContent ?? '')
          if (title && fullText.startsWith(title)) {
            body = fullText.slice(title.length).replace(/^[\s—:–-]+/, '').trim()
          }
        } else {
          // Check for "Title — Description" or "Title: Description" pattern
          const match = /^([A-Za-z0-9\s/&,.-]{2,35})\s*([—–:])\s+(.+)$/.exec(fullText)
          if (match) {
            title = match[1].trim()
            body = match[3].trim()
          }
        }

        if (fullText) {
          items.push({
            text: fullText,
            title: title || undefined,
            body: body || undefined,
            children: children.length > 0 ? children : undefined
          })
        }
      })
    })
    if (items.length > 0) {
      blocks.push({ type: 'bullets', items })
    }
    ulEls.forEach((u) => u.remove())
  }

  // ── Subheadings (H3 / H4) remaining ───────────────────────────────────────
  el.querySelectorAll('h3, h4').forEach((h) => {
    const text = cleanText(h.textContent ?? '')
    if (text) {
      blocks.push({ type: 'heading', level: 3, text })
    }
    h.remove()
  })

  // ── CTA block ─────────────────────────────────────────────────────────────
  const ctaEl = el.querySelector('.cta-block, [class*="cta"]')
  if (ctaEl) {
    const text = cleanText(ctaEl.querySelector('p, strong, h3')?.textContent ?? ctaEl.textContent ?? '')
    if (text) {
      blocks.push({ type: 'cta', text })
    }
    ctaEl.remove()
  }

  // ── Remaining paragraphs ──────────────────────────────────────────────────
  el.querySelectorAll('p').forEach((p) => {
    const text = cleanText(p.textContent ?? '')
    if (text && text.length > 2) {
      blocks.push({ type: 'text', text, size: 'md', align: 'left' })
    }
  })

  return { blocks: blocks.filter((b) => b !== null), refinedLayout }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractNotes(section: Element): string {
  return cleanText(section.querySelector('aside.notes')?.textContent ?? '')
}

function extractListItems(el: Element): string[] {
  const items: string[] = []
  el.querySelectorAll('li').forEach((li) => {
    const text = cleanText(li.textContent ?? '')
    if (text) items.push(text)
  })
  if (items.length === 0) {
    el.querySelectorAll('p').forEach((p) => {
      const text = cleanText(p.textContent ?? '')
      if (text) items.push(text)
    })
  }
  return items
}

function cleanText(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function guessSlideType(section: Element): string {
  const type = section.getAttribute('data-slide-type')
  if (type) return type

  const hasH1 = !!section.querySelector('h1')
  const hasBullets = !!section.querySelector('ul, ol')
  const hasCards = section.querySelectorAll('.card').length >= 1
  const hasStats = section.querySelectorAll('.stat-block').length >= 1
  const hasTable = !!section.querySelector('table')
  const hasQuote = !!section.querySelector('blockquote, .quote-block')

  if (hasCards) return 'cards'
  if (hasStats) return 'stat'
  if (hasTable) return 'data'
  if (hasQuote) return 'quote'
  if (hasH1 && !hasBullets) return 'title'
  return 'content'
}
