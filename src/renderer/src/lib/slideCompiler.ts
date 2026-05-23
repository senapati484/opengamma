import type { SlideStyle } from '../types'

/**
 * Renders a slide bullet item.
 * If the bullet contains an <img> tag, we render it without a list bullet dot
 * and center it beautifully.
 */
function compileBulletItem(b: string): string {
  const trimmed = b.trim()
  if (trimmed.startsWith('<img') || trimmed.includes('<img')) {
    return `<li style="list-style-type: none !important; margin: 15px 0; padding: 0; display: flex; justify-content: center; width: 100%;">${b}</li>`
  }
  if (trimmed.startsWith('<li')) {
    return b
  }
  if (trimmed.startsWith('<') && (trimmed.endsWith('>') || trimmed.includes('</'))) {
    return b
  }
  return `<li>${b}</li>`
}

function compileItemsToHtml(bullets: string[], contentStyle: string = ''): string {
  const compiledParts: string[] = []
  let currentList: string[] = []
  let currentCols: string[] = []

  const flushList = () => {
    if (currentList.length > 0) {
      compiledParts.push(`<ul${contentStyle}>\n      ${currentList.join('\n      ')}\n    </ul>`)
      currentList = []
    }
  }

  const flushCols = () => {
    if (currentCols.length > 0) {
      compiledParts.push(`<div class="cols">\n      ${currentCols.join('\n      ')}\n    </div>`)
      currentCols = []
    }
  }

  bullets.forEach((b) => {
    const trimmed = b.trim()
    if (!trimmed) return

    if (trimmed.startsWith('<img') || trimmed.includes('<img')) {
      flushList()
      flushCols()
      compiledParts.push(`<div style="margin: 20px 0; display: flex; justify-content: center; width: 100%;">${b}</div>`)
    } else if (trimmed.startsWith('<div class="card"') || trimmed.startsWith('<div class="stat-block"') || trimmed.startsWith('<div class="quote-block"')) {
      flushList()
      if (trimmed.startsWith('<div class="quote-block"')) {
        flushCols()
        compiledParts.push(trimmed)
      } else {
        currentCols.push(trimmed)
      }
    } else if (trimmed.startsWith('<li') || !trimmed.startsWith('<')) {
      flushCols()
      let liContent = trimmed
      if (!trimmed.startsWith('<li')) {
        liContent = `<li>${trimmed}</li>`
      }
      currentList.push(liContent)
    } else {
      flushList()
      flushCols()
      compiledParts.push(trimmed)
    }
  })

  flushList()
  flushCols()
  return compiledParts.join('\n  ')
}

/**
 * Compiles slide text elements, layout types, and custom design styles
 * into a valid, optimized Reveal.js `<section>` HTML block.
 *
 * @param title The slide title text
 * @param bullets Bullet points (array of strings)
 * @param notes Speaker notes text
 * @param slideType Slide layout template type
 * @param style Style customization configuration
 * @param slug Optional custom slug for element identification (e.g. preservation of database slide id)
 */
export function compileSlideHtml(
  title: string,
  bullets: string[],
  notes: string,
  slideType: 'title' | 'content' | 'split' | 'data' | 'cta',
  style: SlideStyle = {},
  slug?: string
): string {
  // Set up inline CSS variables and custom styles
  const styles: string[] = []

  // Horizontal Alignment
  if (style.textAlign) {
    styles.push(`text-align: ${style.textAlign}`)
  }

  // Custom Colors
  if (style.bgColor) {
    styles.push(`--og-slide-bg: ${style.bgColor}`)
    styles.push(`background: ${style.bgColor} !important`)
  }
  if (style.textColor) {
    styles.push(`--og-slide-text: ${style.textColor}`)
    styles.push(`color: ${style.textColor} !important`)
  }
  if (style.accentColor) {
    styles.push(`--og-slide-accent: ${style.accentColor}`)
  }

  // Typography
  if (style.headingFont) {
    styles.push(`--og-slide-font-heading: '${style.headingFont}', sans-serif`)
  }
  if (style.bodyFont) {
    styles.push(`--og-slide-font-body: '${style.bodyFont}', sans-serif`)
  }

  const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
  const slugAttr = slug ? ` data-slug="${slug}"` : ''
  const typeAttr = ` data-slide-type="${slideType}"`

  // Inline font sizes for text elements
  const titleStyle = style.titleSize ? ` style="font-size: ${style.titleSize}em !important;"` : ''
  const contentStyle = style.contentSize
    ? ` style="font-size: ${style.contentSize}em !important;"`
    : ''

  let contentHtml = ''

  switch (slideType) {
    case 'title': {
      const heading = `<h1 class="accent"${titleStyle}>${title || 'Untitled Presentation'}</h1>`
      const accentPara = style.accentText || (bullets && bullets.length > 0 ? bullets[0] : '')
      const sub = accentPara ? `<p${contentStyle}>${accentPara}</p>` : ''
      contentHtml = `\n  ${heading}\n  ${sub}`
      break
    }

    case 'split': {
      const heading = `<h2${titleStyle}>${title || 'Insights comparison'}</h2>`

      // Heuristic to split bullets into two columns
      const half = Math.ceil(bullets.length / 2)
      const leftColBullets = bullets.slice(0, half)
      const rightColBullets = bullets.slice(half)

      const leftList = leftColBullets.map(compileBulletItem).join('\n        ')
      const rightList = rightColBullets.map(compileBulletItem).join('\n        ')

      contentHtml = `
  ${heading}
  <div class="cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; ${style.contentSize ? `font-size: ${style.contentSize}em;` : ''}">
    <div>
      <h3 style="font-size: 1.1em; color: var(--og-slide-accent, #e8ff57); text-align: left; margin-bottom: 10px;">Accent Focus</h3>
      <ul style="text-align: left; margin: 0; padding-left: 20px;">
        ${leftList || '<li>No bullet content configured</li>'}
      </ul>
    </div>
    <div>
      <h3 style="font-size: 1.1em; color: var(--og-slide-text, #ede9e1); text-align: left; margin-bottom: 10px;">Key Takeaways</h3>
      <ul style="text-align: left; margin: 0; padding-left: 20px;">
        ${rightList || '<li>No bullet content configured</li>'}
      </ul>
    </div>
  </div>`
      break
    }

    case 'data': {
      const heading = `<h2${titleStyle}>${title || 'Metric Insights'}</h2>`

      // Parse bullets by pipe '|' into table headers and rows
      let headers = ['Metric', 'Current Value', 'Growth Status']
      const rows: string[][] = []

      bullets.forEach((bullet, idx) => {
        const parts = bullet.split('|').map((p) => p.trim())
        if (
          (idx === 0 && parts.length >= 2 && bullet.toLowerCase().includes('category')) ||
          bullet.toLowerCase().includes('metric') ||
          bullet.toLowerCase().includes('|')
        ) {
          // If first line contains pipe, we can optionally use it as headers or as a data row
          if (parts.length >= 2) {
            headers = parts
            return
          }
        }
        if (parts.length > 0 && bullet.trim().length > 0) {
          rows.push(parts)
        }
      })

      // Fill in fallback data if no bullet rows exist
      if (rows.length === 0) {
        rows.push(['Metric A', '124,500', '+18.4% YoY'])
        rows.push(['Metric B', '84,100', '+12.1% YoY'])
      }

      const thead = headers
        .map(
          (h) =>
            `<th style="padding: 12px; font-weight: bold; border-bottom: 2px solid var(--og-slide-accent, #e8ff57); text-align: left;">${h}</th>`
        )
        .join('')
      const tbody = rows
        .map((r) => {
          const cells = r
            .map(
              (c) =>
                `<td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left;">${c}</td>`
            )
            .join('')
          return `<tr style="transition: background-color 0.2s hover: bg-white/5">${cells}</tr>`
        })
        .join('\n      ')

      contentHtml = `
  ${heading}
  <div style="overflow-x: auto; margin-top: 30px; width: 100%;">
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: var(--og-slide-font-body, sans-serif); ${style.contentSize ? `font-size: ${style.contentSize}em;` : 'font-size: 0.8em;'}">
      <thead>
        <tr>${thead}</tr>
      </thead>
      <tbody>
        ${tbody}
      </tbody>
    </table>
  </div>`
      break
    }

    case 'cta': {
      const heading = `<h2${titleStyle}>${title || 'Join the movement'}</h2>`
      const statement = style.accentText || 'Take immediate action now'
      const listItems = bullets.map(compileBulletItem).join('\n      ')

      contentHtml = `
  ${heading}
  <div class="cta-block" style="background: var(--og-slide-accent, #e8ff57) !important; color: #000000 !important; padding: 24px; border-radius: 12px; margin-top: 30px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
    <p style="font-size: 1.25em; font-weight: 800; margin: 0; font-family: var(--og-slide-font-heading, sans-serif);">${statement}</p>
  </div>
  ${
    bullets.length > 0
      ? `
  <ul style="margin-top: 25px; padding-left: 20px; text-align: left; ${style.contentSize ? `font-size: ${style.contentSize}em;` : 'font-size: 0.9em;'}">
    ${listItems}
  </ul>`
      : ''
  }`
      break
    }

    case 'content':
    default: {
      const heading = `<h2${titleStyle}>${title || 'Core insights'}</h2>`
      const imgBulletIndex = bullets.findIndex((b) => b.includes('<img'))
      if (imgBulletIndex !== -1) {
        const imgBullet = bullets[imgBulletIndex]
        const otherBullets = bullets.filter((_, idx) => idx !== imgBulletIndex)
        const groupedHtml = compileItemsToHtml(otherBullets, contentStyle)
        
        let imgHtml = imgBullet
        if (!imgHtml.includes('style=')) {
          imgHtml = imgHtml.replace('<img', '<img style="max-height: 380px; border-radius: 10px; object-fit: contain;"')
        } else {
          imgHtml = imgHtml.replace(/max-height:\s*\d+px/gi, 'max-height: 380px')
        }

        contentHtml = `
  ${heading}
  <div class="cols" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 35px; margin-top: 25px; align-items: center; ${style.contentSize ? `font-size: ${style.contentSize}em;` : ''}">
    <div style="text-align: left;">
      ${groupedHtml}
    </div>
    <div style="display: flex; justify-content: center; align-items: center; width: 100%;">
      ${imgHtml}
    </div>
  </div>`
      } else {
        const groupedHtml = compileItemsToHtml(bullets, contentStyle)
        contentHtml = `\n  ${heading}\n  ${groupedHtml}`
      }
      break
    }
  }

  const asideNotes = notes ? `\n  <aside class="notes">\n    ${notes}\n  </aside>` : ''

  return `<section${slugAttr}${typeAttr}${styleAttr}>${contentHtml}${asideNotes}\n</section>`
}
