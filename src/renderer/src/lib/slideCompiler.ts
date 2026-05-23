import type { SlideStyle } from '../types'

// ─── Bullet Item Renderer ──────────────────────────────────────────────────────
/**
 * Renders a single bullet item. Images get a special no-bullet centred wrapper.
 */
function compileBulletItem(b: string): string {
  const trimmed = b.trim()
  if (trimmed.startsWith('<img') || trimmed.includes('<img')) {
    return `<li style="list-style-type: none !important; margin: 12px 0; padding: 0; display: flex; justify-content: center; width: 100%;">${b}</li>`
  }
  if (trimmed.startsWith('<li')) return b
  if (trimmed.startsWith('<') && (trimmed.endsWith('>') || trimmed.includes('</'))) return b
  return `<li>${b}</li>`
}

// ─── Items → HTML Block Renderer ──────────────────────────────────────────────
/**
 * Converts an array of bullet strings into semantic HTML, intelligently grouping
 * card/stat-block elements into auto-grid cols, and items into <ul> blocks.
 */
function compileItemsToHtml(bullets: string[], contentStyle = ''): string {
  const parts: string[] = []
  let listBuf: string[] = []
  let colsBuf: string[] = []

  const flushList = () => {
    if (listBuf.length > 0) {
      parts.push(`<ul${contentStyle}>\n      ${listBuf.join('\n      ')}\n    </ul>`)
      listBuf = []
    }
  }

  const flushCols = () => {
    if (colsBuf.length > 0) {
      parts.push(`<div class="cols">\n      ${colsBuf.join('\n      ')}\n    </div>`)
      colsBuf = []
    }
  }

  bullets.forEach((b) => {
    const t = b.trim()
    if (!t) return

    if (t.startsWith('<img') || t.includes('<img')) {
      // Centred image block
      flushList()
      flushCols()
      parts.push(`<div style="margin: 16px 0; display: flex; justify-content: center; width: 100%;">${t}</div>`)
    } else if (
      t.startsWith('<div class="card"') ||
      t.startsWith('<div class="stat-block"')
    ) {
      // Card / stat-block → collect into auto-grid cols
      flushList()
      colsBuf.push(t)
    } else if (t.startsWith('<div class="quote-block"')) {
      // Quote blocks stand alone
      flushList()
      flushCols()
      parts.push(t)
    } else if (t.startsWith('<li') || !t.startsWith('<')) {
      // Plain text or li elements → ul list
      flushCols()
      listBuf.push(t.startsWith('<li') ? t : `<li>${t}</li>`)
    } else {
      // Everything else (p, h3, table, …) stands alone
      flushList()
      flushCols()
      parts.push(t)
    }
  })

  flushList()
  flushCols()
  return parts.join('\n  ')
}

// ─── Main Compiler ─────────────────────────────────────────────────────────────
/**
 * Compiles slide text, layout type, and custom styles into a
 * production-ready Reveal.js `<section>` block.
 */
export function compileSlideHtml(
  title: string,
  bullets: string[],
  notes: string,
  slideType: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote',
  style: SlideStyle = {},
  slug?: string
): string {
  // ── CSS variable injection ───────────────────────────────────────────────────
  const vars: string[] = []
  if (style.textAlign)   vars.push(`text-align: ${style.textAlign}`)
  if (style.bgColor)     { vars.push(`--og-slide-bg: ${style.bgColor}`); vars.push(`background: ${style.bgColor} !important`) }
  if (style.textColor)   { vars.push(`--og-slide-text: ${style.textColor}`); vars.push(`color: ${style.textColor} !important`) }
  if (style.accentColor) vars.push(`--og-slide-accent: ${style.accentColor}`)
  if (style.headingFont) vars.push(`--og-slide-font-heading: '${style.headingFont}', sans-serif`)
  if (style.bodyFont)    vars.push(`--og-slide-font-body: '${style.bodyFont}', sans-serif`)

  const styleAttr   = vars.length > 0 ? ` style="${vars.join('; ')}"` : ''
  const slugAttr    = slug ? ` data-slug="${slug}"` : ''
  const typeAttr    = ` data-slide-type="${slideType}"`
  const titleStyle  = style.titleSize   ? ` style="font-size: ${style.titleSize}em !important;"` : ''
  const contentStyle = style.contentSize ? ` style="font-size: ${style.contentSize}em !important;"` : ''

  let contentHtml = ''

  switch (slideType) {

    // ── TITLE ────────────────────────────────────────────────────────────────
    case 'title': {
      const heading = `<h1 class="accent"${titleStyle}>${title || 'Untitled Presentation'}</h1>`
      const sub = bullets.length > 0
        ? `<p${contentStyle}>${bullets[0]}</p>`
        : style.accentText
          ? `<p${contentStyle}>${style.accentText}</p>`
          : ''
      contentHtml = `\n  ${heading}\n  ${sub}`
      break
    }

    // ── CONTENT ──────────────────────────────────────────────────────────────
    case 'content': {
      const heading = `<h2${titleStyle}>${title || 'Core Insights'}</h2>`

      // Check if any bullet contains an <img> — if so, do a 2-column layout
      const imgBulletIdx = bullets.findIndex((b) => b.includes('<img'))
      if (imgBulletIdx !== -1) {
        const imgBullet = bullets[imgBulletIdx]
        const otherBullets = bullets.filter((_, i) => i !== imgBulletIdx)
        const leftHtml = compileItemsToHtml(otherBullets, contentStyle)
        let imgHtml = imgBullet
        // Ensure image is sized for the right column
        imgHtml = imgHtml.includes('max-height')
          ? imgHtml.replace(/max-height:\s*\d+px/gi, 'max-height: 360px')
          : imgHtml.replace('<img', '<img style="max-height: 360px; width: 100%; border-radius: 12px; object-fit: cover;"')

        contentHtml = `
  ${heading}
  <div class="cols" style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 36px; margin-top: 24px; align-items: center; ${style.contentSize ? `font-size: ${style.contentSize}em;` : ''}">
    <div style="text-align: left;">
      ${leftHtml}
    </div>
    <div style="display: flex; justify-content: center; align-items: center;">
      ${imgHtml}
    </div>
  </div>`
      } else {
        const groupedHtml = compileItemsToHtml(bullets, contentStyle)
        contentHtml = `\n  ${heading}\n  ${groupedHtml}`
      }
      break
    }

    // ── SPLIT ────────────────────────────────────────────────────────────────
    case 'split': {
      const heading = `<h2${titleStyle}>${title || 'Comparison'}</h2>`

      // Extract h3 labels from bullets if present, otherwise split evenly
      const h3Indices = bullets.reduce<number[]>((acc, b, i) => {
        if (b.trim().startsWith('<h3')) acc.push(i)
        return acc
      }, [])

      let leftLabel = 'Before'
      let rightLabel = 'After'
      let leftBullets: string[] = []
      let rightBullets: string[] = []

      if (h3Indices.length >= 2) {
        // Use h3 text as labels; content between h3s as bullets
        const leftH3 = bullets[h3Indices[0]]
        const rightH3 = bullets[h3Indices[1]]
        leftLabel  = leftH3.replace(/<[^>]*>/g, '').trim() || leftLabel
        rightLabel = rightH3.replace(/<[^>]*>/g, '').trim() || rightLabel

        leftBullets  = bullets.slice(h3Indices[0] + 1, h3Indices[1])
        rightBullets = bullets.slice(h3Indices[1] + 1)
      } else if (h3Indices.length === 1) {
        leftLabel    = bullets[h3Indices[0]].replace(/<[^>]*>/g, '').trim() || leftLabel
        leftBullets  = bullets.slice(h3Indices[0] + 1, Math.ceil(bullets.length / 2))
        rightBullets = bullets.slice(Math.ceil(bullets.length / 2))
      } else {
        // Even split
        const half   = Math.ceil(bullets.length / 2)
        leftBullets  = bullets.slice(0, half)
        rightBullets = bullets.slice(half)
      }

      const leftHtml  = leftBullets.map(compileBulletItem).join('\n        ')
      const rightHtml = rightBullets.map(compileBulletItem).join('\n        ')

      contentHtml = `
  ${heading}
  <div class="cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 28px; ${style.contentSize ? `font-size: ${style.contentSize}em;` : ''}">
    <div>
      <h3 style="font-size: 1.05em; color: var(--og-slide-accent, #e8ff57); text-align: left; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.06em;">${leftLabel}</h3>
      <ul style="text-align: left; margin: 0; padding-left: 20px;">
        ${leftHtml || '<li>—</li>'}
      </ul>
    </div>
    <div>
      <h3 style="font-size: 1.05em; color: var(--og-slide-text, #ede9e1); text-align: left; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8;">${rightLabel}</h3>
      <ul style="text-align: left; margin: 0; padding-left: 20px;">
        ${rightHtml || '<li>—</li>'}
      </ul>
    </div>
  </div>`
      break
    }

    // ── DATA ─────────────────────────────────────────────────────────────────
    case 'data': {
      const heading = `<h2${titleStyle}>${title || 'Metric Insights'}</h2>`

      // Detect if bullets contain stat-blocks (the LLM used the design components)
      const hasStatBlocks = bullets.some(
        (b) => b.trim().startsWith('<div class="stat-block"') || b.trim().startsWith('<div class="card"')
      )

      if (hasStatBlocks) {
        // Render stat-blocks in auto-grid cols
        const groupedHtml = compileItemsToHtml(bullets, contentStyle)
        contentHtml = `\n  ${heading}\n  ${groupedHtml}`
      } else {
        // Parse bullets into table rows via | separator
        let headers = ['Metric', 'Value', 'Trend']
        const rows: string[][] = []

        bullets.forEach((bullet, idx) => {
          const parts = bullet.replace(/<[^>]*>/g, '').split('|').map((p) => p.trim())
          if (idx === 0 && parts.length >= 2) {
            headers = parts
            return
          }
          if (parts.length > 0 && bullet.trim().length > 0) rows.push(parts)
        })

        if (rows.length === 0) {
          rows.push(['Metric A', '124,500', '↑ 18.4% YoY'])
          rows.push(['Metric B', '84,100', '↑ 12.1% YoY'])
        }

        const thead = headers
          .map((h) => `<th style="padding: 12px 16px; font-weight: 800; border-bottom: 2px solid var(--og-slide-accent, #e8ff57); text-align: left;">${h}</th>`)
          .join('')
        const tbody = rows
          .map((r) => {
            const cells = r.map((c) => `<td style="padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); text-align: left;">${c}</td>`).join('')
            return `<tr>${cells}</tr>`
          })
          .join('\n      ')

        contentHtml = `
  ${heading}
  <div style="overflow-x: auto; margin-top: 28px; width: 100%;">
    <table style="width: 100%; border-collapse: collapse; font-family: var(--og-slide-font-body, sans-serif); ${style.contentSize ? `font-size: ${style.contentSize}em;` : 'font-size: 0.82em;'}">
      <thead><tr>${thead}</tr></thead>
      <tbody>
        ${tbody}
      </tbody>
    </table>
  </div>`
      }
      break
    }

    // ── IMAGE ─────────────────────────────────────────────────────────────────
    // This slide type signals that a generated image should fill the visual focus.
    // The generator replaces <figure class="og-image-placeholder"> at runtime.
    // The compiler produces a left-text / right-image two-column layout.
    case 'image': {
      const heading = `<h2${titleStyle}>${title || 'Visual Context'}</h2>`

      // Separate any figure placeholder from supporting bullets
      const figureBullets = bullets.filter((b) => b.includes('og-image-placeholder'))
      const textBullets   = bullets.filter((b) => !b.includes('og-image-placeholder'))

      const figureHtml = figureBullets.length > 0
        ? figureBullets[0]
        : `<figure class="og-image-placeholder" data-prompt="${title} professional illustration, wide landscape, clean modern style, no text"></figure>`

      const textHtml = textBullets.length > 0
        ? compileItemsToHtml(textBullets, contentStyle)
        : ''

      contentHtml = `
  ${heading}
  <div class="cols" style="display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 36px; margin-top: 24px; align-items: center; ${style.contentSize ? `font-size: ${style.contentSize}em;` : ''}">
    <div style="text-align: left;">
      ${textHtml}
    </div>
    <div style="display: flex; justify-content: center; align-items: center; min-height: 280px;">
      ${figureHtml}
    </div>
  </div>`
      break
    }

    // ── STAT ─────────────────────────────────────────────────────────────────
    // Single big focal statistic with supporting prose
    case 'stat': {
      const heading = `<h2${titleStyle}>${title || 'Key Metric'}</h2>`

      const statBlocks = bullets.filter(
        (b) => b.trim().startsWith('<div class="stat-block"') || b.trim().startsWith('<div class="card"')
      )
      const prose = bullets.filter(
        (b) => !b.trim().startsWith('<div class="stat-block"') && !b.trim().startsWith('<div class="card"')
      )

      const statsHtml = statBlocks.length > 0
        ? `<div class="cols" style="margin: 28px 0;">${statBlocks.join('\n  ')}</div>`
        : `<div class="stat-block" style="margin: 28px auto; max-width: 480px;">
    <span class="stat-number">${title || '—'}</span>
    <span class="stat-label">Key Metric</span>
  </div>`

      const proseHtml = prose.length > 0
        ? compileItemsToHtml(prose, contentStyle)
        : ''

      contentHtml = `\n  ${heading}\n  ${statsHtml}\n  ${proseHtml}`
      break
    }

    // ── QUOTE ─────────────────────────────────────────────────────────────────
    case 'quote': {
      const heading = `<h2${titleStyle}>${title || 'Testimonial'}</h2>`

      const quoteBlocks = bullets.filter((b) => b.trim().startsWith('<div class="quote-block"'))
      const supporting  = bullets.filter((b) => !b.trim().startsWith('<div class="quote-block"'))

      const quoteHtml = quoteBlocks.length > 0
        ? quoteBlocks.join('\n  ')
        : `<div class="quote-block">
    <p class="quote-text">"${bullets[0]?.replace(/<[^>]*>/g, '') || 'An impactful quote here.'}"</p>
    <span class="quote-author">— Source</span>
  </div>`

      const supportHtml = supporting.length > 0
        ? compileItemsToHtml(supporting, contentStyle)
        : ''

      contentHtml = `\n  ${heading}\n  ${quoteHtml}\n  ${supportHtml}`
      break
    }

    // ── CTA ──────────────────────────────────────────────────────────────────
    case 'cta': {
      const heading = `<h2${titleStyle}>${title || 'Take Action Now'}</h2>`
      const ctaText  = style.accentText || bullets.find((b) => !b.startsWith('<li')) || 'Act today'
      const listBullets = bullets.filter((b) => b.trim().startsWith('<li') || (!b.trim().startsWith('<') && !b.includes(ctaText)))
      const listHtml = listBullets.map(compileBulletItem).join('\n      ')

      contentHtml = `
  ${heading}
  <div class="cta-block" style="background: var(--og-slide-accent, #e8ff57) !important; color: #000000 !important; padding: 28px 32px; border-radius: 14px; margin-top: 32px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
    <p style="font-size: 1.3em; font-weight: 900; margin: 0; font-family: var(--og-slide-font-heading, sans-serif); letter-spacing: -0.02em;">${ctaText}</p>
  </div>
  ${listBullets.length > 0
    ? `<ul style="margin-top: 24px; padding-left: 20px; text-align: left; ${style.contentSize ? `font-size: ${style.contentSize}em;` : 'font-size: 0.85em;'}">
    ${listHtml}
  </ul>`
    : ''
  }`
      break
    }
  }

  const asideNotes = notes ? `\n  <aside class="notes">\n    ${notes}\n  </aside>` : ''
  return `<section${slugAttr}${typeAttr}${styleAttr}>${contentHtml}${asideNotes}\n</section>`
}
