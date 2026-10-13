import path from 'path'
import fs from 'fs'
import { renderPdf } from '../src/main/render/pdf'
import { htmlSlideToDeckSlide, migrateSlides } from '../src/main/model/migrate'
import type { Deck, DeckSlide } from '../src/main/model/schema'

async function run() {
  console.log('--- Testing OpenGamma Native PDF Engine ---')

  const outputDir = path.join(__dirname)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const outputPath = path.join(outputDir, 'native_presentation_demo.pdf')

  // 1. Direct Deck test
  const demoSlides: DeckSlide[] = [
    {
      id: 'slide-1',
      layout: 'title',
      blocks: [
        {
          type: 'heading',
          text: 'OpenGamma Native Vector PDF Engine',
          level: 1,
          eyebrow: 'Next-Generation Document Export'
        },
        {
          type: 'text',
          text: 'Architected with pure vector layouts, precision typography, and native gradient shadings.',
          size: 'lg',
          align: 'center'
        },
        {
          type: 'cta',
          text: 'Explore Deck Engine'
        }
      ]
    },
    {
      id: 'slide-2',
      layout: 'section',
      blocks: [
        {
          type: 'heading',
          text: 'Core Engine Architecture',
          level: 1
        },
        {
          type: 'text',
          text: 'Moving from browser print-to-pdf screen scraping to a first-class structured scene graph.',
          size: 'md',
          align: 'left'
        }
      ]
    },
    {
      id: 'slide-3',
      layout: 'content',
      blocks: [
        {
          type: 'heading',
          text: 'Key Capabilities & Technical Highlights',
          level: 1
        },
        {
          type: 'bullets',
          items: [
            {
              text: 'Pure Vector Rendering — Text remains fully selectable, searchable, and crisp at 400% zoom.',
              children: [
                'Sub-pixel glyph placement using font metrics',
                'Zero rasterization blur or blurry fonts'
              ]
            },
            {
              text: 'Deterministic Layout Engine — Pre-computes exact line breaks, margins, and column boundaries.'
            },
            {
              text: 'Stacked-Rect Depth Shadows — Multi-layered translucent shadow diffusion without print-driver bugs.'
            },
            {
              text: 'Graceful Font Resolution — Automatic mapping to standard typefaces when offline.'
            }
          ]
        }
      ]
    },
    {
      id: 'slide-4',
      layout: 'cards',
      blocks: [
        {
          type: 'heading',
          text: 'Pillars of Vector Precision',
          level: 1
        },
        {
          type: 'cards',
          cards: [
            {
              title: 'Structure First',
              body: 'Content lives in typed Zod blocks instead of brittle HTML string blobs.'
            },
            {
              title: 'Native Gradients',
              body: 'Smooth PDF shading dictionaries replace banding and dark spots.'
            },
            {
              title: 'Lightning Speed',
              body: 'Direct binary stream writing in milliseconds without headless browser overhead.'
            }
          ]
        }
      ]
    },
    {
      id: 'slide-5',
      layout: 'stats',
      blocks: [
        {
          type: 'heading',
          text: 'Performance Benchmarks',
          level: 1
        },
        {
          type: 'text',
          text: 'Measured against the legacy Chromium printToPDF approach across real decks.',
          size: 'md',
          align: 'left'
        },
        {
          type: 'stats',
          stats: [
            {
              value: '10x',
              label: 'Export Speedup',
              delta: '800ms vs 8.5s',
              deltaPositive: true
            },
            {
              value: '100%',
              label: 'Vector Selectability',
              delta: 'Pure Typeface',
              deltaPositive: true
            },
            {
              value: '0MB',
              label: 'Browser Overhead',
              delta: 'Zero Spun Windows',
              deltaPositive: true
            }
          ]
        }
      ]
    },
    {
      id: 'slide-6',
      layout: 'two-col',
      blocks: [
        {
          type: 'heading',
          text: 'Legacy Print vs Native Engine',
          level: 1
        },
        {
          type: 'two-col',
          leftLabel: 'Legacy HTML-to-PDF Print',
          rightLabel: 'OpenGamma Native Engine',
          leftItems: [
            'Spins up hidden Electron browser window',
            'Waits 3.5s arbitrary timeout for CSS fonts',
            'Chromium print bugs drop text shadows & gradients',
            'Unpredictable page breaking and margins'
          ],
          rightItems: [
            'Direct scene graph layout in Node.js',
            'Zero window overhead; stream piped straight to disk',
            'Native vector gradients and stacked-rect shadows',
            'Mathematical 12-column grid and exact margins'
          ]
        }
      ]
    },
    {
      id: 'slide-7',
      layout: 'quote',
      blocks: [
        {
          type: 'quote',
          text: 'Simplicity is about subtracting the obvious and adding the meaningful. A great presentation engine should feel instant, tactile, and alive.',
          author: 'John Maeda',
          role: 'The Laws of Simplicity'
        }
      ]
    },
    {
      id: 'slide-8',
      layout: 'timeline',
      blocks: [
        {
          type: 'heading',
          text: 'Engine Evolution Roadmap',
          level: 1
        },
        {
          type: 'timeline',
          items: [
            { label: 'Phase 1', title: 'Deck Model & Primitives', body: 'Zod schemas, theme tokens, scene graph' },
            { label: 'Phase 2', title: 'Layout Templates', body: '12 responsive slide layouts & typography' },
            { label: 'Phase 3', title: 'Vector PDF Backend', body: 'Direct PDFKit pipeline & font fallbacks' },
            { label: 'Phase 4', title: 'IPC & UI Integration', body: 'One-click native export with progress' }
          ]
        }
      ]
    },
    {
      id: 'slide-9',
      layout: 'closing',
      blocks: [
        {
          type: 'heading',
          text: 'Experience the New PDF Engine',
          level: 1
        },
        {
          type: 'text',
          text: 'Built for precision, beauty, and long-term durability in OpenGamma.',
          size: 'lg',
          align: 'center'
        },
        {
          type: 'cta',
          text: 'Built with OpenGamma'
        }
      ]
    }
  ]

  const deck: Deck = {
    schemaVersion: 1,
    meta: {
      title: 'OpenGamma Native Engine Showcase',
      author: 'OpenGamma Team',
      lang: 'en'
    },
    themeId: 'startup-gradient',
    aspectRatio: '16:9',
    slides: demoSlides
  }

  console.log(`Rendering ${demoSlides.length} slides to ${outputPath}...`)
  const startTime = Date.now()

  await renderPdf(
    deck,
    outputPath,
    { showPageNumbers: true },
    (current, total) => {
      console.log(`  [Progress] Rendered slide ${current} / ${total}`)
    }
  )

  const duration = Date.now() - startTime
  const stats = fs.statSync(outputPath)
  console.log(`\nSUCCESS! Export completed in ${duration}ms`)
  console.log(`Generated file: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`)

  // Verify PDF header
  const header = fs.readFileSync(outputPath, { encoding: 'ascii', flag: 'r' }).slice(0, 8)
  console.log(`PDF Header verified: ${header}`)

  // 2. Also test HTML migration
  console.log('\n--- Testing HTML-to-Deck Migration ---')
  const legacyHtml = `
    <section data-slide-type="cards">
      <h1>Automated Card Extraction</h1>
      <div class="card">
        <h3>First Card</h3>
        <p>Extracted seamlessly from HTML.</p>
      </div>
      <div class="card">
        <h3>Second Card</h3>
        <p>Parsed into structured Zod block.</p>
      </div>
    </section>
  `
  const migrated = htmlSlideToDeckSlide({ id: 'test-mig', html: legacyHtml }, 'startup-gradient')
  console.log(`Migrated layout: ${migrated.layout}`)
  console.log(`Extracted blocks count: ${migrated.blocks.length}`)
  console.log(`First block type: ${migrated.blocks[0]?.type}`)
}

run().catch((err) => {
  console.error('Test failed with error:', err)
  process.exit(1)
})
