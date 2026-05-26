import React, { useState, useEffect, useRef } from 'react'
import type { Slide, SlideStyle, Theme } from '../types'
import { compileSlideHtml } from '../lib/slideCompiler'
import { GLOBAL_LAYOUT_CSS } from '../lib/layoutStyles'
import { useElectron } from '../lib/useElectron'

export interface SlideEditModalProps {
  slide: Slide | null
  activeTheme: Theme
  isOpen: boolean
  onSave: (
    title: string,
    bullets: string[],
    notes: string,
    layout: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote',
    style: SlideStyle
  ) => void
  onClose: () => void
}

const HEADING_FONTS = [
  { name: 'Default Theme Font', value: '' },
  { name: 'Outfit (Sleek Geometric)', value: 'Outfit' },
  { name: 'Inter (Modern Clean)', value: 'Inter' },
  { name: 'Space Grotesk (Futuristic)', value: 'Space Grotesk' },
  { name: 'Playfair Display (Elegant Serif)', value: 'Playfair Display' },
  { name: 'Syne (Avant-Garde Bold)', value: 'Syne' },
  { name: 'Fredoka (Playful Rounded)', value: 'Fredoka' },
  { name: 'Sora (High-Tech Premium)', value: 'Sora' }
]

const BODY_FONTS = [
  { name: 'Default Theme Font', value: '' },
  { name: 'Inter (Highly Legible)', value: 'Inter' },
  { name: 'Roboto (Clean Standard)', value: 'Roboto' },
  { name: 'Atkinson Hyperlegible (Readability)', value: 'Atkinson Hyperlegible' },
  { name: 'JetBrains Mono (Technical Tech)', value: 'JetBrains Mono' },
  { name: 'Outfit (Modern Sans)', value: 'Outfit' },
  { name: 'Sora (Futuristic)', value: 'Sora' }
]

const COLOR_PRESETS = [
  {
    name: 'Cyber Neon',
    bg: '#0d0f14',
    text: '#f1f5f9',
    accent: '#e8ff57'
  },
  {
    name: 'Warm Sunset',
    bg: '#1a1615',
    text: '#fafaf9',
    accent: '#ff8a57'
  },
  {
    name: 'Mint Forest',
    bg: '#0a1210',
    text: '#f2fbf7',
    accent: '#34d399'
  },
  {
    name: 'Ocean Deep',
    bg: '#080f1a',
    text: '#f0f7ff',
    accent: '#38bdf8'
  },
  {
    name: 'Cosmic Violet',
    bg: '#120d1c',
    text: '#faf5ff',
    accent: '#c084fc'
  }
]

export const SlideEditModal: React.FC<SlideEditModalProps> = ({
  slide,
  activeTheme,
  isOpen,
  onSave,
  onClose
}) => {
  const electronAPI = useElectron()
  const previewIframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'design'>('content')

  // Form Fields State
  const [title, setTitle] = useState('')
  const [bulletsText, setBulletsText] = useState('')
  const [notes, setNotes] = useState('')
  const [accentText, setAccentText] = useState('')

  // Layout Specific Content States (Preserving across switches)
  const [splitLeftLabel, setSplitLeftLabel] = useState('Before')
  const [splitRightLabel, setSplitRightLabel] = useState('After')
  const [splitLeftBullets, setSplitLeftBullets] = useState('')
  const [splitRightBullets, setSplitRightBullets] = useState('')
  const [tableRows, setTableRows] = useState('')
  const [statNumber, setStatNumber] = useState('')
  const [statLabel, setStatLabel] = useState('')
  const [statDesc, setStatDesc] = useState('')
  const [quoteText, setQuoteText] = useState('')
  const [quoteAuthor, setQuoteAuthor] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageSourceMode, setImageSourceMode] = useState<'unsplash' | 'url' | 'upload'>('unsplash')
  const [unsplashKeyword, setUnsplashKeyword] = useState('')

  // Styling State
  const [layout, setLayout] = useState<
    'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote'
  >('content')
  const [titleSize, setTitleSize] = useState(1.0)
  const [contentSize, setContentSize] = useState(1.0)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [headingFont, setHeadingFont] = useState('')
  const [bodyFont, setBodyFont] = useState('')
  const [bgColor, setBgColor] = useState('')
  const [textColor, setTextColor] = useState('')
  const [accentColor, setAccentColor] = useState('')

  // 1. Initialise form inputs from slide data with DOMParser to prevent raw HTML leaks
  useEffect(() => {
    if (!slide || !isOpen) return

    setTitle(slide.title || '')
    setNotes(slide.notes || '')
    setLayout(slide.slideType || 'content')

    // Style properties
    const s = slide.style || {}
    setTitleSize(s.titleSize || 1.0)
    setContentSize(s.contentSize || 1.0)
    setTextAlign(s.textAlign || (slide.slideType === 'title' ? 'center' : 'left'))
    setHeadingFont(s.headingFont || '')
    setBodyFont(s.bodyFont || '')
    setBgColor(s.bgColor || '')
    setTextColor(s.textColor || '')
    setAccentColor(s.accentColor || '')

    // DOM Parser strategy for clean text extraction
    const html = slide.html || ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Extract image properties
    const imgEl = doc.querySelector('img')
    let currentImgUrl = ''
    if (imgEl) {
      currentImgUrl = imgEl.getAttribute('src') || ''
    }
    setImageUrl(currentImgUrl)

    const placeholderEl = doc.querySelector('.og-image-placeholder')
    const figureEl = doc.querySelector('.og-image-figure')
    let currentImgPrompt = ''
    if (placeholderEl) {
      currentImgPrompt = placeholderEl.getAttribute('data-prompt') || ''
    } else if (figureEl) {
      currentImgPrompt = figureEl.getAttribute('data-prompt') || ''
    }
    setImagePrompt(currentImgPrompt)

    // Select the initial image mode
    if (currentImgUrl.startsWith('data:image')) {
      setImageSourceMode('upload')
    } else if (currentImgUrl.includes('unsplash.com/featured') || currentImgUrl.includes('unsplash.com/photo')) {
      setImageSourceMode('unsplash')
      const keywordMatch = currentImgUrl.match(/\/\?(.+)$/)
      if (keywordMatch) {
        setUnsplashKeyword(decodeURIComponent(keywordMatch[1]))
      } else {
        setUnsplashKeyword(slide.title || '')
      }
    } else if (currentImgUrl) {
      setImageSourceMode('url')
    } else {
      setImageSourceMode('unsplash')
      setUnsplashKeyword(slide.title || '')
    }

    // Extract plain text bullets (filtering wrappers)
    const lis = doc.querySelectorAll('li')
    let plainBullets: string[] = []
    if (lis.length > 0) {
      plainBullets = Array.from(lis)
        .filter((li) => !li.closest('.cols, .stat-block, .quote-block, .cta-block'))
        .map((li) => li.textContent?.trim() || '')
        .filter((t) => t.length > 0)
    } else {
      const ps = doc.querySelectorAll('p')
      plainBullets = Array.from(ps)
        .filter((p) => !p.closest('.cols, .stat-block, .quote-block, .cta-block, .og-split-layout'))
        .map((p) => p.textContent?.trim() || '')
        .filter((t) => t.length > 0)
    }
    setBulletsText(plainBullets.join('\n'))

    // Extract split columns
    const splitCols = doc.querySelectorAll('.cols > div')
    let leftLabel = 'Before'
    let rightLabel = 'After'
    let leftBulletsList: string[] = []
    let rightBulletsList: string[] = []

    if (splitCols.length >= 2) {
      const leftH3 = splitCols[0].querySelector('h3')
      if (leftH3) leftLabel = leftH3.textContent?.trim() || ''
      leftBulletsList = Array.from(splitCols[0].querySelectorAll('li')).map((li) => li.textContent?.trim() || '')

      const rightH3 = splitCols[1].querySelector('h3')
      if (rightH3) rightLabel = rightH3.textContent?.trim() || ''
      rightBulletsList = Array.from(splitCols[1].querySelectorAll('li')).map((li) => li.textContent?.trim() || '')
    } else {
      const bulletsArray = slide.bullets || []
      const h3Indices = bulletsArray.reduce<number[]>((acc, b, i) => {
        if (b.trim().startsWith('<h3')) acc.push(i)
        return acc
      }, [])
      if (h3Indices.length >= 2) {
        leftLabel = bulletsArray[h3Indices[0]].replace(/<[^>]*>/g, '').trim()
        rightLabel = bulletsArray[h3Indices[1]].replace(/<[^>]*>/g, '').trim()
        leftBulletsList = bulletsArray.slice(h3Indices[0] + 1, h3Indices[1]).map((b) => b.replace(/<[^>]*>/g, '').trim())
        rightBulletsList = bulletsArray.slice(h3Indices[1] + 1).map((b) => b.replace(/<[^>]*>/g, '').trim())
      } else {
        const half = Math.ceil(plainBullets.length / 2)
        leftBulletsList = plainBullets.slice(0, half)
        rightBulletsList = plainBullets.slice(half)
      }
    }
    setSplitLeftLabel(leftLabel)
    setSplitRightLabel(rightLabel)
    setSplitLeftBullets(leftBulletsList.join('\n'))
    setSplitRightBullets(rightBulletsList.join('\n'))

    // Extract table rows (Data layout)
    const table = doc.querySelector('table')
    let rows: string[] = []
    if (table) {
      const headers = Array.from(table.querySelectorAll('th')).map((th) => th.textContent?.trim() || '')
      if (headers.length > 0) {
        rows.push(headers.join(' | '))
      }
      const trs = table.querySelectorAll('tbody tr')
      trs.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() || '')
        if (cells.length > 0) {
          rows.push(cells.join(' | '))
        }
      })
    } else {
      const bulletsArray = slide.bullets || []
      const hasPipe = bulletsArray.some((b) => b.includes('|'))
      if (hasPipe) {
        rows = bulletsArray.map((b) => b.replace(/<[^>]*>/g, '').trim())
      } else {
        const cards = doc.querySelectorAll('.stat-block, .card')
        if (cards.length > 0) {
          cards.forEach((c) => {
            const num = c.querySelector('.stat-number')?.textContent?.trim() || ''
            const label = c.querySelector('.stat-label')?.textContent?.trim() || ''
            const desc = c.querySelector('.stat-desc')?.textContent?.trim() || ''
            if (num || label) {
              rows.push(`${num} | ${label}${desc ? ` | ${desc}` : ''}`)
            }
          })
        }
      }
    }
    if (rows.length === 0) {
      rows = ['Metric | Value | Description']
    }
    setTableRows(rows.join('\n'))

    // Extract Stat block
    const statBlock = doc.querySelector('.stat-block, .card')
    let numVal = ''
    let labelVal = ''
    let descVal = ''
    if (statBlock) {
      numVal = statBlock.querySelector('.stat-number')?.textContent?.trim() || ''
      labelVal = statBlock.querySelector('.stat-label')?.textContent?.trim() || ''
      descVal = statBlock.querySelector('.stat-desc')?.textContent?.trim() || ''
    } else {
      const statHtml = (slide.bullets || []).find((b) => b.includes('stat-block') || b.includes('card'))
      if (statHtml) {
        const tempDoc = parser.parseFromString(statHtml, 'text/html')
        const block = tempDoc.querySelector('.stat-block, .card')
        if (block) {
          numVal = block.querySelector('.stat-number')?.textContent?.trim() || ''
          labelVal = block.querySelector('.stat-label')?.textContent?.trim() || ''
          descVal = block.querySelector('.stat-desc')?.textContent?.trim() || ''
        }
      }
    }
    setStatNumber(numVal || '40%+')
    setStatLabel(labelVal || 'Stat Label')
    setStatDesc(descVal)

    // Extract Quote block
    const quoteEl = doc.querySelector('.quote-block')
    let qText = ''
    let qAuthor = ''
    if (quoteEl) {
      qText = quoteEl.querySelector('.quote-text')?.textContent?.trim().replace(/^["']|["']$/g, '') || ''
      qAuthor = quoteEl.querySelector('.quote-author')?.textContent?.trim().replace(/^—\s*/, '') || ''
    } else {
      const quoteHtml = (slide.bullets || []).find((b) => b.includes('quote-block'))
      if (quoteHtml) {
        const tempDoc = parser.parseFromString(quoteHtml, 'text/html')
        const block = tempDoc.querySelector('.quote-block')
        if (block) {
          qText = block.querySelector('.quote-text')?.textContent?.trim().replace(/^["']|["']$/g, '') || ''
          qAuthor = block.querySelector('.quote-author')?.textContent?.trim().replace(/^—\s*/, '') || ''
        }
      }
    }
    if (!qText && plainBullets.length > 0) {
      qText = plainBullets[0]
      qAuthor = 'Source'
    }
    setQuoteText(qText)
    setQuoteAuthor(qAuthor)

    // Extract CTA statement
    const ctaTextEl = doc.querySelector('.cta-block p')
    let ctaStatementText = ''
    if (ctaTextEl) {
      ctaStatementText = ctaTextEl.textContent?.trim() || ''
    } else if (slide.style?.accentText) {
      ctaStatementText = slide.style.accentText
    } else if (slide.slideType === 'cta' && plainBullets.length > 0) {
      ctaStatementText = plainBullets[0]
    }
    setAccentText(ctaStatementText)
  }, [slide, isOpen])

  // Sync Unsplash Keyword URL automatically
  useEffect(() => {
    if (imageSourceMode === 'unsplash' && unsplashKeyword) {
      setImageUrl(`https://images.unsplash.com/featured/1024x576/?${encodeURIComponent(unsplashKeyword)}`)
    }
  }, [unsplashKeyword, imageSourceMode])

  // Non-destructive layout switching logic
  const handleLayoutChange = (newLayout: typeof layout) => {
    setLayout(newLayout)

    if (newLayout === 'split') {
      const current = bulletsText.split('\n').map((b) => b.trim()).filter(Boolean)
      if (current.length > 0 && !splitLeftBullets && !splitRightBullets) {
        const half = Math.ceil(current.length / 2)
        setSplitLeftBullets(current.slice(0, half).join('\n'))
        setSplitRightBullets(current.slice(half).join('\n'))
      }
    } else if (newLayout === 'content') {
      const left = splitLeftBullets.split('\n').map((b) => b.trim()).filter(Boolean)
      const right = splitRightBullets.split('\n').map((b) => b.trim()).filter(Boolean)
      if ((left.length > 0 || right.length > 0) && !bulletsText) {
        setBulletsText([...left, ...right].join('\n'))
      }
    } else if (newLayout === 'stat') {
      if (!statNumber) {
        setStatNumber('40%+')
        setStatLabel(title || 'Stat Label')
      }
    } else if (newLayout === 'quote') {
      if (!quoteText) {
        const current = bulletsText.split('\n').map((b) => b.trim()).filter(Boolean)
        setQuoteText(current.length > 0 ? current[0] : title || 'Premium Quote')
        setQuoteAuthor('Source')
      }
    } else if (newLayout === 'cta') {
      if (!accentText) {
        setAccentText('Get Started Today')
      }
    }
  }

  // Handle standard local file uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle native Electron file browser dialog as fallback
  const handleNativeImageUpload = async () => {
    try {
      const result = await electronAPI.openFileDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] }]
      })
      if (!result.canceled && result.filePaths.length > 0) {
        setImageUrl(`file://${result.filePaths[0]}`)
      }
    } catch (err) {
      console.error('[SlideEditModal] Native upload failed, fallback to browser upload:', err)
    }
  }

  // Live sidebar table parser
  const parsedTableData = () => {
    const lines = tableRows.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return { headers: [], rows: [] }
    const headers = lines[0].split('|').map((h) => h.trim())
    const rows = lines.slice(1).map((line) => line.split('|').map((c) => c.trim()))
    return { headers, rows }
  }

  // Serialize states cleanly into compiler bullets
  const getBulletsArray = (): string[] => {
    switch (layout) {
      case 'title': {
        const res: string[] = []
        if (accentText.trim()) {
          res.push(accentText.trim())
        }
        if (imageUrl) {
          res.push(`<figure class="og-image-figure"><img src="${imageUrl}" /></figure>`)
        } else if (imagePrompt) {
          res.push(`<figure class="og-image-placeholder" data-prompt="${imagePrompt}"></figure>`)
        }
        return res
      }
      case 'content': {
        const base = bulletsText
          .split('\n')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
        if (imageUrl) {
          base.push(`<figure class="og-image-figure"><img src="${imageUrl}" /></figure>`)
        } else if (imagePrompt) {
          base.push(`<figure class="og-image-placeholder" data-prompt="${imagePrompt}"></figure>`)
        }
        return base
      }
      case 'split': {
        const leftLabel = splitLeftLabel.trim() || 'Before'
        const rightLabel = splitRightLabel.trim() || 'After'
        const left = splitLeftBullets
          .split('\n')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
        const right = splitRightBullets
          .split('\n')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
        return [
          `<h3>${leftLabel}</h3>`,
          ...left,
          `<h3>${rightLabel}</h3>`,
          ...right
        ]
      }
      case 'data': {
        return tableRows
          .split('\n')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
      }
      case 'image': {
        const base: string[] = []
        if (imageUrl) {
          base.push(`<figure class="og-image-figure"><img src="${imageUrl}" /></figure>`)
        } else {
          base.push(`<figure class="og-image-placeholder" data-prompt="${imagePrompt || title || 'professional illustration'}"></figure>`)
        }
        const textPart = bulletsText
          .split('\n')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
        return [...base, ...textPart]
      }
      case 'stat': {
        const statHtml = `<div class="stat-block">
  <span class="stat-number">${statNumber}</span>
  <span class="stat-label">${statLabel}</span>
  ${statDesc ? `<span class="stat-desc">${statDesc}</span>` : ''}
</div>`
        const textPart = bulletsText
          .split('\n')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
        return [statHtml, ...textPart]
      }
      case 'quote': {
        const quoteHtml = `<div class="quote-block">
  <p class="quote-text">"${quoteText}"</p>
  <span class="quote-author">— ${quoteAuthor || 'Source'}</span>
</div>`
        const textPart = bulletsText
          .split('\n')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
        return [quoteHtml, ...textPart]
      }
      case 'cta': {
        return bulletsText
          .split('\n')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
      }
      default:
        return []
    }
  }

  // Compile active styling state
  const currentStyle: SlideStyle = {
    titleSize,
    contentSize,
    textAlign,
    headingFont,
    bodyFont,
    bgColor: bgColor || undefined,
    textColor: textColor || undefined,
    accentColor: accentColor || undefined,
    accentText: layout === 'cta' || layout === 'title' ? accentText : (slide?.style?.accentText || undefined),
    layout
  }

  // Compile full slide HTML using the compiler
  const compiledHtml = compileSlideHtml(
    title,
    getBulletsArray(),
    notes,
    layout,
    currentStyle,
    slide?.id
  )

  // Sync editor values immediately inside Reveal frame
  useEffect(() => {
    const iframe = previewIframeRef.current
    if (!iframe || !iframeLoaded || !isOpen) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow) return

    const cssWithLayout = `${activeTheme.cssTokens}\n${GLOBAL_LAYOUT_CSS}`
    try {
      if ((contentWindow as any).setTheme) {
        ;(contentWindow as any).setTheme(cssWithLayout)
      } else {
        contentWindow.postMessage({ type: 'SET_THEME', cssTokens: cssWithLayout }, '*')
      }

      if (activeTheme.revealTheme) {
        contentWindow.postMessage(
          { type: 'SET_REVEAL_THEME', themeName: activeTheme.revealTheme },
          '*'
        )
      }
    } catch (err) {
      console.warn('[SlideEditModal] Iframe styling failed:', err)
      contentWindow.postMessage({ type: 'SET_THEME', cssTokens: cssWithLayout }, '*')
    }

    contentWindow.postMessage({ type: 'SET_ASPECT_RATIO', aspectRatio: '16:9' }, '*')

    try {
      if ((contentWindow as any).clearSlides) {
        ;(contentWindow as any).clearSlides()
      } else {
        contentWindow.postMessage({ type: 'CLEAR_SLIDES' }, '*')
      }
    } catch {
      contentWindow.postMessage({ type: 'CLEAR_SLIDES' }, '*')
    }

    try {
      if ((contentWindow as any).addSlide) {
        ;(contentWindow as any).addSlide(compiledHtml)
      } else {
        contentWindow.postMessage({ type: 'ADD_SLIDE', html: compiledHtml }, '*')
      }
    } catch {
      contentWindow.postMessage({ type: 'ADD_SLIDE', html: compiledHtml }, '*')
    }
  }, [iframeLoaded, compiledHtml, isOpen, activeTheme])

  if (!isOpen || !slide) return null

  const handleSave = () => {
    onSave(title, getBulletsArray(), notes, layout, currentStyle)
  }

  // Helper to check if layout type contains an image
  const supportsImage = ['title', 'content', 'split', 'image'].includes(layout)

  const { headers: tableHeaders, rows: tableRowsParsed } = parsedTableData()

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-8 select-none no-drag">
      <div className="w-full h-full max-w-7xl bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-bounce">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#e8ff57]/10 text-[#e8ff57]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">Visual Slide Designer</h3>
              <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                Customize content, layouts, typography, sizes, and alignments on Slide{' '}
                {slide.index + 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Side-by-Side Main Container */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
          {/* LEFT: Designer Options Panel (5 columns) */}
          <div className="lg:col-span-5 flex flex-col h-full bg-[#141414] overflow-hidden">
            {/* Tab Header Navigation */}
            <div className="flex border-b border-white/5 bg-[#161616] px-6">
              <button
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  activeTab === 'content'
                    ? 'border-[#e8ff57] text-[#e8ff57]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Content Elements
              </button>
              <button
                onClick={() => setActiveTab('design')}
                className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  activeTab === 'design'
                    ? 'border-[#e8ff57] text-[#e8ff57]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Design & Style
              </button>
            </div>

            {/* Scrollable Tab Content Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {activeTab === 'content' ? (
                <>
                  {/* 1. Layout Archetype Selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Slide Layout Type
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'title', label: 'Title', icon: 'M4 6h16M4 12h16M4 18h7' },
                        { key: 'content', label: 'Bullet', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                        {
                          key: 'split',
                          label: 'Split',
                          icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m3-16h2a2 2 0 012 2v12a2 2 0 01-2 2h-2'
                        },
                        {
                          key: 'data',
                          label: 'Data',
                          icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                        },
                        { key: 'cta', label: 'CTA', icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5' },
                        {
                          key: 'image',
                          label: 'Image',
                          icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                        },
                        {
                          key: 'stat',
                          label: 'Stat',
                          icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2'
                        },
                        {
                          key: 'quote',
                          label: 'Quote',
                          icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                        }
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => handleLayoutChange(item.key as any)}
                          className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                            layout === item.key
                              ? 'border-[#e8ff57] bg-[#e8ff57]/10 text-[#e8ff57] shadow-md shadow-[#e8ff57]/5'
                              : 'border-white/5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                          }`}
                        >
                          <svg
                            className="w-4 h-4 mb-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d={item.icon}
                            />
                          </svg>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Core Title Text Field */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Slide Heading
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans"
                        placeholder="Enter main header text..."
                      />
                    </div>

                    {/* Subtitle / Tagline statement for Title layout */}
                    {layout === 'title' && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Subtitle / Tagline
                        </label>
                        <input
                          type="text"
                          value={accentText}
                          onChange={(e) => setAccentText(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans"
                          placeholder="Enter subtitle details..."
                        />
                      </div>
                    )}

                    {/* CTA Statement Accent Text */}
                    {layout === 'cta' && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          CTA Statement Text
                        </label>
                        <input
                          type="text"
                          value={accentText}
                          onChange={(e) => setAccentText(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans"
                          placeholder="e.g. Schedule a Demo Today"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Layout Specific Content Fields */}
                  <div className="space-y-4 border-t border-white/5 pt-4">
                    {layout === 'content' && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Bullet Points / Insights
                        </label>
                        <textarea
                          value={bulletsText}
                          onChange={(e) => setBulletsText(e.target.value)}
                          rows={6}
                          className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans resize-none custom-scrollbar"
                          placeholder="Enter bullet details, one per line..."
                        />
                      </div>
                    )}

                    {layout === 'split' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                              Left Column Header
                            </label>
                            <input
                              type="text"
                              value={splitLeftLabel}
                              onChange={(e) => setSplitLeftLabel(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all"
                              placeholder="Before"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                              Right Column Header
                            </label>
                            <input
                              type="text"
                              value={splitRightLabel}
                              onChange={(e) => setSplitRightLabel(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all"
                              placeholder="After"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                              Left Column Bullets
                            </label>
                            <textarea
                              value={splitLeftBullets}
                              onChange={(e) => setSplitLeftBullets(e.target.value)}
                              rows={5}
                              className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all font-sans resize-none custom-scrollbar"
                              placeholder="One bullet per line..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                              Right Column Bullets
                            </label>
                            <textarea
                              value={splitRightBullets}
                              onChange={(e) => setSplitRightBullets(e.target.value)}
                              rows={5}
                              className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all font-sans resize-none custom-scrollbar"
                              placeholder="One bullet per line..."
                            />
                          </div>
                        </div>

                        {/* Interactive Split Columns Preview */}
                        <div className="space-y-1.5">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Live Column Preview</span>
                          <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950 rounded-xl border border-white/5 text-[10px]">
                            <div>
                              <div className="font-bold text-[#e8ff57] uppercase tracking-wider mb-1 truncate">{splitLeftLabel || 'Left'}</div>
                              <ul className="list-disc list-inside space-y-0.5 text-neutral-400 text-[9px]">
                                {splitLeftBullets.split('\n').filter(Boolean).map((b, i) => (
                                  <li key={i} className="truncate">{b}</li>
                                ))}
                                {splitLeftBullets.split('\n').filter(Boolean).length === 0 && <span className="text-neutral-600">— Empty —</span>}
                              </ul>
                            </div>
                            <div>
                              <div className="font-bold text-neutral-200 uppercase tracking-wider mb-1 truncate opacity-80">{splitRightLabel || 'Right'}</div>
                              <ul className="list-disc list-inside space-y-0.5 text-neutral-400 text-[9px]">
                                {splitRightBullets.split('\n').filter(Boolean).map((b, i) => (
                                  <li key={i} className="truncate">{b}</li>
                                ))}
                                {splitRightBullets.split('\n').filter(Boolean).length === 0 && <span className="text-neutral-600">— Empty —</span>}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {layout === 'data' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                              Table Data Grid (Pipe "|" Separated)
                            </label>
                            <span className="text-[9px] text-neutral-500">Header | Col 2 | Col 3</span>
                          </div>
                          <textarea
                            value={tableRows}
                            onChange={(e) => setTableRows(e.target.value)}
                            rows={5}
                            className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-mono resize-none custom-scrollbar"
                            placeholder="Metric | Value | Description&#10;Users | 120,400 | +12% YoY&#10;Revenue | $450K | Target met"
                          />
                        </div>

                        {/* Interactive Sidebar Live Table Preview */}
                        {tableRows.split('\n').filter(Boolean).length > 0 && (
                          <div className="space-y-1.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Live Table Preview</span>
                            <div className="border border-white/5 rounded-xl overflow-hidden bg-neutral-950">
                              <table className="w-full text-[9px] text-neutral-300">
                                <thead>
                                  <tr className="bg-neutral-900/40 border-b border-white/5">
                                    {tableHeaders.map((h, i) => (
                                      <th key={i} className="px-3 py-2 text-left font-bold text-neutral-400">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {tableRowsParsed.map((row, ri) => (
                                    <tr key={ri} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                      {row.map((cell, ci) => (
                                        <td key={ci} className="px-3 py-1.5 text-left text-neutral-400">{cell}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <div className="p-3 bg-neutral-950 rounded-xl border border-white/5 text-[9px] text-neutral-500 leading-normal">
                          <strong className="text-neutral-400">Tip:</strong> First line acts as the table headers. Subsequent lines specify rows. Values are divided cleanly by pipes (<span className="text-[#e8ff57]">|</span>).
                        </div>
                      </div>
                    )}

                    {layout === 'stat' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5 col-span-1">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                              Stat Number
                            </label>
                            <input
                              type="text"
                              value={statNumber}
                              onChange={(e) => setStatNumber(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all"
                              placeholder="e.g. 94.2%"
                            />
                          </div>
                          <div className="space-y-1.5 col-span-2">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                              Stat Label
                            </label>
                            <input
                              type="text"
                              value={statLabel}
                              onChange={(e) => setStatLabel(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all"
                              placeholder="e.g. User Retention Rate"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Stat Short Description
                          </label>
                          <input
                            type="text"
                            value={statDesc}
                            onChange={(e) => setStatDesc(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all"
                            placeholder="e.g. Calculated over the trailing 12 months"
                          />
                        </div>

                        {/* Interactive Stat Widget Preview */}
                        <div className="space-y-1.5">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Live Stat Preview</span>
                          <div className="p-4 bg-neutral-950 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center space-y-1">
                            <div className="text-[28px] font-extrabold text-[#e8ff57] tracking-tight">{statNumber || '—'}</div>
                            <div className="text-[11px] font-bold text-neutral-200">{statLabel || 'Metric'}</div>
                            {statDesc && <div className="text-[9px] text-neutral-500 italic mt-0.5">{statDesc}</div>}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Supporting Bullets
                          </label>
                          <textarea
                            value={bulletsText}
                            onChange={(e) => setBulletsText(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all resize-none font-sans"
                            placeholder="Enter any optional details, one per line..."
                          />
                        </div>
                      </div>
                    )}

                    {layout === 'quote' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Quote Content
                          </label>
                          <textarea
                            value={quoteText}
                            onChange={(e) => setQuoteText(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all resize-none font-sans"
                            placeholder="Enter quotation..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Quote Author / Source
                          </label>
                          <input
                            type="text"
                            value={quoteAuthor}
                            onChange={(e) => setQuoteAuthor(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all"
                            placeholder="e.g. Jane Doe, CEO at Fintech"
                          />
                        </div>

                        {/* Interactive Quote Preview */}
                        <div className="space-y-1.5">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Live Quote Preview</span>
                          <div className="p-4 bg-neutral-950 rounded-xl border border-white/5 relative space-y-1.5">
                            <div className="text-xs italic text-neutral-300 font-serif leading-relaxed">
                              "{quoteText || 'An impactful quote here.'}"
                            </div>
                            <div className="text-[9px] font-bold text-[#e8ff57] text-right">— {quoteAuthor || 'Source'}</div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Supporting Details
                          </label>
                          <textarea
                            value={bulletsText}
                            onChange={(e) => setBulletsText(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all resize-none font-sans"
                            placeholder="Supporting comments, one per line..."
                          />
                        </div>
                      </div>
                    )}

                    {layout === 'image' && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Supporting Bullets / Explainer
                        </label>
                        <textarea
                          value={bulletsText}
                          onChange={(e) => setBulletsText(e.target.value)}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans resize-none custom-scrollbar"
                          placeholder="Details that sit adjacent to the graphic..."
                        />
                      </div>
                    )}

                    {layout === 'cta' && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          CTA Action Items
                        </label>
                        <textarea
                          value={bulletsText}
                          onChange={(e) => setBulletsText(e.target.value)}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans resize-none custom-scrollbar"
                          placeholder="Supporting list details, one per line..."
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. Visual Image Actions Panel */}
                  {supportsImage && (
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Slide Graphic / Cover Image
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 border border-white/5 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setImageSourceMode('unsplash')}
                          className={`py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                            imageSourceMode === 'unsplash'
                              ? 'bg-[#e8ff57] text-black shadow'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Unsplash
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageSourceMode('url')}
                          className={`py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                            imageSourceMode === 'url'
                              ? 'bg-[#e8ff57] text-black shadow'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Web URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageSourceMode('upload')}
                          className={`py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                            imageSourceMode === 'upload'
                              ? 'bg-[#e8ff57] text-black shadow'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Upload
                        </button>
                      </div>

                      {imageSourceMode === 'unsplash' && (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={unsplashKeyword}
                            onChange={(e) => setUnsplashKeyword(e.target.value)}
                            placeholder="e.g. analytics dashboard, clean code"
                            className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all"
                          />
                          <span className="block text-[8px] text-neutral-500 font-medium">
                            Automatically loads high-quality stock imagery matching keyword
                          </span>
                        </div>
                      )}

                      {imageSourceMode === 'url' && (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 transition-all font-mono"
                          />
                          <span className="block text-[8px] text-neutral-500 font-medium">
                            Paste any HTTP or HTTPS image URL address
                          </span>
                        </div>
                      )}

                      {imageSourceMode === 'upload' && (
                        <div className="flex gap-2">
                          <label
                            htmlFor="image-file-upload"
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl text-[9px] font-bold text-neutral-300 hover:text-white transition-all cursor-pointer select-none"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            Browser Picker
                          </label>
                          <input
                            type="file"
                            id="image-file-upload"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={handleNativeImageUpload}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl text-[9px] font-bold text-neutral-300 hover:text-white transition-all cursor-pointer select-none"
                          >
                            Native OS Picker
                          </button>
                        </div>
                      )}

                      {imageUrl && (
                        <div className="relative group border border-white/5 rounded-xl overflow-hidden bg-neutral-950 p-1 flex items-center justify-center">
                          <img
                            src={imageUrl}
                            alt="Active Graphic"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setImageUrl('')
                              setUnsplashKeyword('')
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-neutral-300 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                            title="Remove graphic"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* DESIGN TAB CONTROLS */}
                  {/* 1. Alignment */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Content Layout Alignment
                    </label>
                    <div className="flex rounded-xl bg-neutral-950 p-1 border border-white/5">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => setTextAlign(align)}
                          className={`flex-1 py-2 flex items-center justify-center rounded-lg cursor-pointer transition-all ${
                            textAlign === align
                              ? 'bg-[#e8ff57] text-black shadow-md shadow-[#e8ff57]/5'
                              : 'text-neutral-500 hover:text-white'
                          }`}
                        >
                          {align === 'left' ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h10M4 18h14" />
                            </svg>
                          ) : align === 'center' ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M7 12h10M5 18h14" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M10 12h10M6 18h14" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Text Sizes */}
                  <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/5 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Title Font Size
                        </span>
                        <span className="text-[10px] font-bold text-[#e8ff57]">
                          {titleSize.toFixed(1)}em
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="4.0"
                        step="0.1"
                        value={titleSize}
                        onChange={(e) => setTitleSize(parseFloat(e.target.value))}
                        className="w-full accent-[#e8ff57] h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {layout !== 'data' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Content Body Size
                          </span>
                          <span className="text-[10px] font-bold text-[#e8ff57]">
                            {contentSize.toFixed(1)}em
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.1"
                          value={contentSize}
                          onChange={(e) => setContentSize(parseFloat(e.target.value))}
                          className="w-full accent-[#e8ff57] h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Fonts */}
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Typography Overrides
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                          Heading Font
                        </span>
                        <select
                          value={headingFont}
                          onChange={(e) => setHeadingFont(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 cursor-pointer"
                        >
                          {HEADING_FONTS.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                          Body Font
                        </span>
                        <select
                          value={bodyFont}
                          onChange={(e) => setBodyFont(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 cursor-pointer"
                        >
                          {BODY_FONTS.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 4. Quick Designer Color Presets */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Quick Color Presets
                    </span>
                    <div className="grid grid-cols-5 gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setBgColor(preset.bg)
                            setTextColor(preset.text)
                            setAccentColor(preset.accent)
                          }}
                          className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-900 border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                          title={preset.name}
                        >
                          <div className="flex gap-0.5 w-full h-3.5 rounded overflow-hidden shadow">
                            <div className="flex-1" style={{ backgroundColor: preset.bg }} />
                            <div className="flex-1" style={{ backgroundColor: preset.text }} />
                            <div className="flex-1" style={{ backgroundColor: preset.accent }} />
                          </div>
                          <span className="text-[7px] text-neutral-500 group-hover:text-neutral-300 mt-1 truncate max-w-full font-medium">
                            {preset.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Custom Manual Colors */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Custom Color Overrides (Fine-tuning)
                    </label>
                    <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-900/40 border border-white/5">
                      <div className="space-y-1.5 flex flex-col items-center">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                          Background
                        </span>
                        <div className="flex flex-col items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={bgColor || '#0d0d0d'}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0"
                          />
                          {bgColor && (
                            <button
                              onClick={() => setBgColor('')}
                              className="text-[8px] text-neutral-400 hover:text-white bg-white/5 px-1 py-0.5 rounded cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 flex flex-col items-center">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                          Text Color
                        </span>
                        <div className="flex flex-col items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={textColor || '#ede9e1'}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0"
                          />
                          {textColor && (
                            <button
                              onClick={() => setTextColor('')}
                              className="text-[8px] text-neutral-400 hover:text-white bg-white/5 px-1 py-0.5 rounded cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 flex flex-col items-center">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                          Accent Color
                        </span>
                        <div className="flex flex-col items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={accentColor || '#e8ff57'}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0"
                          />
                          {accentColor && (
                            <button
                              onClick={() => setAccentColor('')}
                              className="text-[8px] text-neutral-400 hover:text-white bg-white/5 px-1 py-0.5 rounded cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Live Visual Sandboxed Screen (7 columns) */}
          <div className="lg:col-span-7 flex flex-col h-full bg-[#0d0d0d] p-6 lg:p-8 min-h-0 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Editor WYSIWYG
              </span>
              <span className="text-[9px] text-neutral-500 font-medium">
                Updates automatically in 16:9 ratio
              </span>
            </div>

            {/* Scale aspect-ratio container for the preview iframe */}
            <div className="flex-1 flex items-center justify-center min-h-[300px] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative bg-[#090909]">
              <iframe
                ref={previewIframeRef}
                src="./reveal-host.html"
                onLoad={() => setIframeLoaded(true)}
                className="w-full h-full border-none outline-none bg-transparent"
                style={{ aspectRatio: '16/9', maxHeight: '100%', maxWidth: '100%' }}
                title="Live Slide Preview WYSIWYG"
              />
            </div>

            {/* Slide Presentation Scripts / Speaker Notes */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Speaker Notes / Presentation Script
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans resize-none custom-scrollbar"
                placeholder="Include speaker notes, speaking prompts, or full script to assist the presenter during delivery..."
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-3 px-6 py-4.5 bg-[#161616] border-t border-white/5">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-[11px] font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-white/5 transition-all select-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-[11px] font-bold text-black bg-gradient-to-r from-[#e8ff57] to-[#dfff3d] hover:opacity-95 active:scale-95 transition-all select-none cursor-pointer shadow-md shadow-[#e8ff57]/10"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SlideEditModal
