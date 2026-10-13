# OpenGamma: Native PDF Export Rebuild Plan

**Goal:** Replace the HTML/CSS "print to PDF" export with a native, vector PDF generated directly from structured slide data, so the output matches the quality of Gamma.app's PDFs (and Gemini's): crisp text, embedded fonts, precise layout, no web-page artifacts.

**Repo:** github.com/senapati484/opengamma
**Status of this document:** Plan. Written from the README and architecture diagram only. GitHub blocked automated access to the source tree, so items marked **[VERIFY]** are inferences that must be confirmed against the real code in Phase 0.

---

## 1. Problem Statement

### 1.1 Current pipeline (from README)

```
Prompt → LLM → "JSON Slide AST" → Presentation Compiler
       → CSS tokens / HSL variables → Reveal.js canvas
       → Export Studio:
            PDF  ← "Print Layout"   (exporter.ts)
            PPTX ← "DOM Parsing"    (htmlToPptx.ts)
            HTML ← asset bundling
```

### 1.2 Why the PDF looks bad **[VERIFY]**

The PDF is a browser print of a Reveal.js page. Consequences:

| Symptom | Cause |
|---|---|
| Content clipped, drifting page breaks, odd margins | Browser pagination rules, not slide rules |
| Flat/banded gradients, missing shadows and blur | Print path flattens or rasterizes `filter`, `backdrop-filter`, `box-shadow` |
| Font fallback differences between machines | Layout depends on installed/loaded web fonts |
| No bookmarks, thin metadata, no accessibility tags | Browser print does not produce them meaningfully |
| PPTX is fragile | `htmlToPptx.ts` guesses structure from the rendered DOM |

### 1.3 Key unknown **[VERIFY]**

`htmlToPptx.ts` and `slideParser.ts` ("raw slide markdown parser") suggest the LLM may output **HTML or markdown per slide** rather than true structured data, despite the "JSON Slide AST" label in the diagram. If slides are free-form HTML, a native PDF is impossible without first making slides structured. That is the central architectural change in this plan.

---

## 2. Goals and Non-Goals

### Goals
1. Vector PDF: selectable/searchable text, embedded font subsets, vector shapes and charts.
2. Pixel-predictable layout: what the editor preview shows is what the PDF contains.
3. Gamma-like visual quality: strong type scale, whitespace, rounded cards, gradient backgrounds, image masks.
4. One source of truth (the deck model) feeding PDF, PPTX, HTML and PNG.
5. Works fully offline (fonts bundled, no network at export time).
6. Accessible output: document title, language, bookmarks, alt text, tagged PDF where feasible.
7. No watermark. Export of a 40-slide deck stays responsive (UI does not freeze).

### Non-Goals (for this effort)
- Arbitrary HTML/CSS in slides (replaced by a typed block set plus a limited escape hatch).
- Real-time collaborative editing.
- Pixel-identical copying of Gamma's proprietary designs (we match quality, not assets).

---

## 3. Target Architecture

```
Prompt
  │
  ▼
LLM (BYOK / local CLI) ── JSON constrained by schema
  │
  ▼
Deck Model  (zod-validated, versioned)           ← single source of truth
  │
  ▼
Layout Engine (pure TypeScript)
  • resolves theme tokens → concrete values
  • picks/validates layout template per slide
  • measures text with the real font files
  • autofits, splits, or flags overflow
  │
  ▼
Scene Graph (positioned primitives in points)
  rect · roundedRect · text runs · image · svg path · gradient · line · link
  │
  ├──► PDF backend   (PDFKit)        → .pdf
  ├──► PPTX backend  (pptxgenjs)     → .pptx (native shapes/text)
  ├──► HTML backend  (Reveal.js)     → live preview + standalone .html
  └──► PNG           (rasterize PDF page) → .png
```

**Principle:** Reveal.js is demoted to a *preview/HTML-export renderer*. It is no longer the source for PDF or PPTX.

### 3.1 Page geometry
- Page size: **960 × 540 pt** (13.333 × 7.5 in, 16:9).
- Configure Reveal with `width: 960, height: 540` so 1 CSS px ≈ 1 pt and preview/PDF coordinates line up.
- 12-column grid, outer margin 56 pt, gutter 24 pt (tunable per theme).
- Optional later: 4:3 and A4 portrait "document" mode (Gamma supports document-style cards).

---

## 4. Technology Decisions

| Concern | Choice | Rationale | Alternatives rejected |
|---|---|---|---|
| PDF drawing | **PDFKit** | Real vectors, gradients, clipping, link annotations, outlines, embedded font subsets; runs in Electron main process; you own layout, PDFKit only draws | `@react-pdf/renderer` (limited CSS-like model, awkward gradients/shadows, weaker autofit control); Typst/LaTeX (per-OS binaries, hard theme mapping); `pdf-lib` (weak text layout) |
| Text measuring | **fontkit** (same font files embedded in PDF) | Guarantees measure == draw. PDFKit uses fontkit internally | Measuring in a browser canvas (font differences) |
| Line breaking | `Intl.Segmenter` + greedy wrapping | Handles Latin and Indic word boundaries reasonably | Naive split on spaces |
| Schema/validation | **zod** | TypeScript inference, runtime validation, good error messages for repair loop | Hand-rolled checks |
| Streaming partial JSON | `partial-json` (or equivalent) | Keeps "slides appear live" behavior | Waiting for full response |
| Image processing | `sharp` (resample/convert) | Control DPI/size; needs `asarUnpack` and per-platform prebuilds | Embedding raw originals (huge PDFs) |
| SVG (charts/icons) | `svg-to-pdfkit` | Keeps charts vector | Rasterizing charts |
| PPTX | **pptxgenjs** driven by the scene graph | Native editable shapes/text | Continuing DOM parsing |
| Export preview | `pdfjs-dist` | Show the real PDF in-app | Showing the Reveal view as "preview" |
| Visual tests | `pdfjs-dist` + canvas rasterizer + `pixelmatch` | Regression detection | Manual eyeballing |

> **Spike (Day 1 of Phase 4):** confirm PDFKit with (a) a theme gradient, (b) rounded image clip, (c) Bengali/Devanagari text shaping, (d) a 40-slide deck timing. If (c) fails, evaluate alternatives before committing further.

---

## 5. Deck Model (Phase 1 detail)

All downstream code consumes this. Version it (`schemaVersion`) so future migrations are possible.

```ts
// src/main/model/schema.ts  (sketch)
import { z } from 'zod'

export const Run = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  code: z.boolean().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  href: z.string().url().optional(),
})
export const Rich = z.array(Run)

export const Block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'),   level: z.union([z.literal(1), z.literal(2), z.literal(3)]), text: Rich }),
  z.object({ type: z.literal('paragraph'), text: Rich }),
  z.object({ type: z.literal('bullets'),   items: z.array(Rich).max(8), ordered: z.boolean().default(false) }),
  z.object({ type: z.literal('image'),     src: z.string(), alt: z.string(), fit: z.enum(['cover', 'contain']).default('cover') }),
  z.object({ type: z.literal('stat'),      value: z.string(), label: z.string() }),
  z.object({ type: z.literal('quote'),     text: Rich, by: z.string().optional() }),
  z.object({ type: z.literal('table'),     head: z.array(Rich), rows: z.array(z.array(Rich)) }),
  z.object({ type: z.literal('chart'),     kind: z.enum(['bar', 'line', 'pie']),
             series: z.array(z.object({ name: z.string(), points: z.array(z.object({ x: z.string(), y: z.number() })) })) }),
  z.object({ type: z.literal('cards'),     items: z.array(z.object({ title: z.string(), body: Rich, icon: z.string().optional() })).max(6) }),
  z.object({ type: z.literal('timeline'),  items: z.array(z.object({ label: z.string(), title: z.string(), body: Rich.optional() })).max(6) }),
  z.object({ type: z.literal('code'),      lang: z.string().optional(), source: z.string() }),
  z.object({ type: z.literal('rawHtml'),   html: z.string() }), // escape hatch, rasterized, see §10
])

export const Slide = z.object({
  id: z.string(),
  layout: z.enum(['title','section','content','two-col','image-left','image-right',
                  'cards','stats','quote','timeline','table','chart','closing']),
  blocks: z.array(Block),
  background: z.object({ kind: z.enum(['solid','gradient','image']), value: z.any() }).optional(),
  notes: z.string().optional(),
})

export const Deck = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({ title: z.string(), author: z.string().optional(), lang: z.string().default('en') }),
  themeId: z.string(),
  slides: z.array(Slide),
})
```

### 5.1 Themes become pure data
Replace CSS variables/HSL strings with a resolved token object:

```ts
type Theme = {
  id: string; name: string
  colors: { bg: string; surface: string; text: string; muted: string; accent: string; accent2?: string }
  fonts: { heading: FontRef; body: FontRef; mono: FontRef }   // refs to bundled files
  type:  { h1: number; h2: number; h3: number; body: number; small: number; lineHeight: number }
  space: { margin: number; gutter: number; cardPad: number; radius: number }
  backgrounds: { title: Background; content: Background; section: Background }
  effects: { cardShadow: 'none' | 'soft' }
}
```

- The 15+ existing themes (*Startup Gradient*, *Noir Gold*, *Terminal Green*, *Void Lime*, …) are ported one by one. HSL values are converted to hex at theme-load time.
- Each theme must pass a **contrast check** (WCAG AA for body text vs. background) in a unit test.

---

## 6. Layout Engine (Phase 3 detail)

### 6.1 Responsibilities
1. Validate that blocks fit the chosen layout (e.g., `cards` layout accepts one heading + one `cards` block).
2. Convert blocks to boxes on the 12-column grid.
3. Measure text, wrap lines, compute heights.
4. **Autofit:** if content overflows its region:
   1. Reduce font size stepwise down to a per-style minimum (e.g., body min 16 pt).
   2. Tighten line height slightly (not below 1.2).
   3. If still overflowing: **split into a continuation slide** (for bullets/paragraphs/tables) or **emit a warning** surfaced in the UI.
5. Emit a flat scene graph of primitives in absolute points.

### 6.2 Text measuring
- Load fonts with `fontkit.openSync(path)`; compute advance widths per glyph with kerning.
- Wrap greedily using `Intl.Segmenter(lang, { granularity: 'word' })`.
- Cache measurements by `(fontId, size, text)`.
- The same font file objects/paths are passed to the PDF backend so wrapping is identical.

### 6.3 Layout templates
Each template is a function `(slide, theme, page) => SceneNode[]`:

| Template | Notes |
|---|---|
| `title` | Large heading, subtitle, gradient/image background, optional author/date |
| `section` | Big number or label, one heading |
| `content` | Heading + bullets/paragraph, optional side image |
| `two-col` | Two text columns or text + chart |
| `image-left` / `image-right` | Full-bleed or inset image with rounded clip |
| `cards` | 2–4 equal cards, icon + title + body |
| `stats` | 2–4 large numbers with labels |
| `quote` | Oversized quote mark, attribution |
| `timeline` | Horizontal steps with connector line |
| `table` | Header row styling, zebra optional, auto column widths |
| `chart` | Vector chart with title and optional caption |
| `closing` | Thank you / contact / CTA |

### 6.4 Gamma-like visual rules (apply in every template)
- Generous margins; never fill the page edge to edge with text.
- Strict type scale (use theme `type` tokens only; no ad-hoc sizes).
- Cards: rounded corners (theme radius), subtle fill from `surface`, optional soft shadow.
- Images: rounded-rect clip, `cover` fit, consistent aspect ratios.
- One focal point per slide; max 6–8 bullets (enforced by schema and prompt).
- Accent color used sparingly (numbers, bullets, underline, icons).
- Optional footer: slide number only (no branding/watermark).

---

## 7. PDF Backend (Phase 4 detail)

### 7.1 Module layout
```
src/main/render/pdf/
  index.ts        // renderPdf(scene, deck, opts) → Buffer | file
  fonts.ts        // registerFont for all theme fonts (static instances)
  primitives.ts   // draw functions per scene node type
  images.ts       // sharp-based resample + format selection + cache
  svg.ts          // svg-to-pdfkit wrapper for charts/icons
  meta.ts         // info dict, outline, tagged-PDF structure
```

### 7.2 Drawing details
- **Text:** `doc.font(...).fontSize(...).fillColor(...).text(str, x, y, { width, lineBreak: false })` per pre-wrapped line (the layout engine owns wrapping, so PDFKit never re-wraps).
- **Gradients:** `doc.linearGradient(...)` / `radialGradient` as native PDF shadings.
- **Rounded shapes / clipping:** `roundedRect` + `clip()` for image masks.
- **Opacity:** `fillOpacity` / `opacity` for glassy cards and overlays.
- **Shadows:** approximate with 3–5 stacked low-opacity rounded rects, or a pre-rendered blurred PNG; keep subtle so it prints well.
- **Fonts:** bundle **static** TTF/OTF files (variable fonts are unreliable here); PDFKit embeds subsets automatically. Include a fallback font stack for symbols; emoji handled as bundled SVG/PNG glyphs, not text.
- **Images:** decode with `sharp`, downscale to ≤ 200–220 DPI at placed size, JPEG for photos (q≈85), PNG for graphics/transparency.
- **Charts:** rendered to SVG from the chart block, drawn through `svg-to-pdfkit` (vector).
- **Links:** `doc.link(x, y, w, h, url)` for runs with `href`.
- **Bookmarks:** outline entries from each slide's first heading.
- **Metadata:** title, author, language, creator = "Open Gamma", creation date.
- **Accessibility [VERIFY with current PDFKit version]:** enable tagged PDF options, set display title, add alt text for images and mark decorative shapes as artifacts.
- **Page boxes:** set page size explicitly to 960×540; no browser-style margins.

### 7.3 Performance and isolation
- Run export in an Electron `utilityProcess` (or worker thread) and stream progress (`slide n / total`) over IPC.
- Cache decoded/resampled images by content hash within a single export.
- Target: 40 slides with images in under ~10 s on a mid-range laptop **[VERIFY by benchmark]**.

---

## 8. Generator Changes (Phase 2 detail)

### 8.1 Prompting
- Provide the schema (as TypeScript or JSON Schema) and 2–3 compact examples.
- Constrain: max 8 bullets, max ~25 words per bullet, heading ≤ 12 words, choose from the layout list, include `alt` text for every image, include `lang`.
- Use provider-native structured output / tool-calling when available (Anthropic, OpenAI, Gemini). For local CLIs (see `cliRunner.ts`), fall back to "output only JSON" + extraction.

### 8.2 Parsing pipeline
```
raw stream → partial-json parse (live preview) → on completion: JSON.parse
          → zod.safeParse → if invalid: one repair call with the zod error summary
          → if still invalid: salvage valid slides, mark bad ones, surface UI error
```

### 8.3 Per-slide regeneration
Existing "AI regeneration of a single slide" must target one `Slide` object and re-validate only that slide.

### 8.4 Image sourcing
Decide how images get into the model (user uploads, local assets, or generated). All images referenced by `src` must be resolvable offline at export time (local path or data URI inside the SQLite asset store).

---

## 9. Data and Migration

- Add a `deck_json` (or `schema_version` + JSON) column via the existing SQLite migration mechanism in `db.ts`.
- **Legacy decks** (HTML/markdown based) **[VERIFY format]**:
  - Option A (recommended): keep a `legacy` flag; legacy decks still export via the old HTML path, with a banner offering "Upgrade to new format (re-generate)".
  - Option B: best-effort converter from legacy slides to blocks (heading/paragraph/list/image extraction); flag anything lossy.
- Keep the old exporter code behind a feature flag for one or two releases, then remove.

---

## 10. Escape Hatch for Unstructured Content

For content that doesn't fit blocks (custom HTML snippets, exotic visuals):
- `rawHtml` block renders in a hidden Chromium window at 2–3× scale and is embedded as an **image** in the PDF/PPTX.
- Clearly mark it in the UI as "rasterized, not editable text".
- Cap usage in the prompt; prefer real blocks.

---

## 11. Editor and Preview Changes

1. Editor edits the Deck Model (block-level editing), not raw HTML.
2. Reveal preview is generated from the same model via the HTML backend, so it matches layout intent.
3. **Export Studio gains "PDF Preview":** renders the actual generated PDF with `pdfjs-dist`, with page thumbnails and zoom. Users see the true output before saving.
4. Overflow/autofit warnings appear as per-slide badges in the slide list.
5. Keep existing shortcuts (`Cmd/Ctrl+E` opens Export Studio).

---

## 12. PPTX and HTML Backends (Phase 6)

### PPTX
- Replace `htmlToPptx.ts` with `render/pptx/` mapping scene nodes → pptxgenjs text boxes, shapes, images, tables, and native charts where possible.
- Use the same fonts where licensing allows; otherwise map to safe equivalents and document it.
- Result: editable text and shapes in PowerPoint/Keynote/Google Slides.

### HTML
- Standalone HTML export = Reveal renderer fed by the model, assets inlined (as today).

### PNG
- Rasterize PDF pages at a chosen scale (1×, 2×) so PNGs match the PDF exactly.

---

## 13. Testing Strategy

### 13.1 Unit tests
- Schema accepts valid fixtures and rejects invalid ones.
- Text measurement/wrapping: known strings, widths, languages (Latin, Bengali, Devanagari, Arabic RTL **[verify feasibility]**).
- Autofit decisions: overflow → shrink → split → warn.
- Theme contrast checks.

### 13.2 Golden-file / visual regression
- Fixture decks (≥ 10) covering every layout and edge case.
- Rasterize each PDF page (pdf.js) and compare against committed PNGs with `pixelmatch` (small tolerance); CI fails on drift.

### 13.3 Edge-case fixtures
- Very long title; 12 bullets; empty slide; 1 huge image; transparent PNG; emoji; code block with long lines; table with 8 columns; chart with 1 and 50 points; RTL text; missing image (graceful placeholder).

### 13.4 PDF validity checks
- Open with pdf.js; validate with `qpdf --check` or similar in CI; confirm fonts are embedded (`pdffonts`), page count equals slide count, text is extractable.

### 13.5 Performance benchmark
- 10/40/100-slide decks; record time and PDF size; set budgets.

---

## 14. Packaging (electron-builder)

- Fonts and any native assets in `resources/` → `extraResources` or `asarUnpack` so PDFKit/fontkit can read them from disk in packaged builds.
- `sharp` requires platform-specific binaries: verify for Windows x64, macOS x64 and arm64, Linux (the README lists Linux arm64 AppImage; consider adding x64).
- Confirm the packaged app exports a PDF identically to dev on all three OSes (add to release checklist).
- Watch installer size (currently ~215–255 MB); bundle only needed font weights.

---

## 15. Phased Roadmap

Estimates are for roughly one focused developer and are approximate.

### Phase 0: Audit and hotfix (1–2 days)
- [ ] Read `exporter.ts`, `generator.ts` (system prompt), `slideParser.ts`, `htmlToPptx.ts`, `db.ts`, and the compiler in `renderer/src/lib/`.
- [ ] Document the exact current slide format (HTML? markdown? JSON?) and how themes are applied.
- [ ] Hotfix legacy PDF: `printBackground: true`, `preferCSSPageSize`, `@page { size: 960px 540px; margin: 0 }`, disable Reveal transitions/animations in print, wait for fonts (`document.fonts.ready`), avoid unsupported filters.
- [ ] Collect 5 representative decks as fixtures.

### Phase 1: Deck model (3–4 days)
- [ ] `model/schema.ts` with zod types and `schemaVersion`.
- [ ] `model/themes.ts`: port 15+ themes to token data; contrast tests.
- [ ] Fixture decks in JSON.
- [ ] DB migration for storing the new model.

### Phase 2: Generator rewrite (3–4 days)
- [ ] New prompt + schema injection; structured output for supported providers.
- [ ] Streaming partial-JSON → live slide preview.
- [ ] Validate → repair → salvage pipeline.
- [ ] Per-slide regeneration on the new model.
- [ ] Local CLI path (`cliRunner.ts`) JSON extraction fallback.

### Phase 3: Layout engine (7–10 days)
- [ ] Font loading + fontkit measurer + wrapping + cache.
- [ ] Grid utilities and the 12 templates.
- [ ] Autofit/split/warn logic.
- [ ] Scene graph types.
- [ ] Unit tests and first visual fixtures.

### Phase 4: PDF backend (5–7 days)
- [ ] Day-1 spike (gradient, clip, Indic shaping, timing).
- [ ] Primitives: text, shapes, gradients, images, SVG, links.
- [ ] Fonts bundling and registration.
- [ ] Metadata, outline, accessibility tags.
- [ ] `utilityProcess` export with progress IPC.
- [ ] Wire into Export Studio (`ipc.ts`), keep legacy path behind flag.

### Phase 5: Preview parity and QA (4–5 days)
- [ ] HTML/Reveal backend from the model.
- [ ] PDF Preview panel (pdf.js) in Export Studio.
- [ ] Overflow badges in the editor.
- [ ] Golden-image CI job.
- [ ] Fix discrepancies found.

### Phase 6: PPTX / HTML / PNG from scene graph (5–7 days)
- [ ] pptxgenjs backend; remove `htmlToPptx.ts` once parity is reached.
- [ ] PNG export via PDF rasterization.
- [ ] Standalone HTML from the model.

### Phase 7: Release (2–3 days)
- [ ] Packaging verification on all OSes.
- [ ] Update README architecture diagram, `CHANGELOG.md`, docs.
- [ ] Remove legacy exporter (or schedule removal).
- [ ] Tag release (e.g., v2.0.0, since the deck format changes).

**Total:** roughly 5–7 weeks. Phases 0–4 deliver a working native PDF in about 3–4 weeks.

---

## 16. File-Level Change Map **[VERIFY against actual repo]**

| Existing file | Action |
|---|---|
| `src/main/exporter.ts` | Keep as legacy path behind flag; add new `export/` orchestrator; eventually delete HTML-print code |
| `src/main/htmlToPptx.ts` | Replace with `render/pptx/`; delete after parity |
| `src/main/generator.ts` | New prompt, schema validation, repair loop, streaming parser |
| `src/main/slideParser.ts` | Replace/retire (markdown parser) or keep only for legacy decks |
| `src/main/db.ts` | Migration for model JSON + `schema_version` + `legacy` flag |
| `src/main/ipc.ts` | New channels: `export:pdf`, `export:progress`, `export:cancel`, `deck:validate` |
| `src/main/cliRunner.ts` / `cliScanner.ts` | JSON-output mode and extraction fallback |
| `src/renderer/src/lib/*` (compiler, theme tokens) | Theme data port; Reveal renderer fed by model |
| `src/renderer/src/components/*` | Block-based editor, PDF Preview, overflow badges |
| `electron-builder.yml` | `extraResources` for fonts, `asarUnpack` for native modules |
| `docs/` | Add schema docs and theme authoring guide |

**New directories**
```
src/main/model/        schema.ts  themes.ts  migrate.ts
src/main/layout/       engine.ts  measure.ts  autofit.ts  grid.ts  templates/
src/main/render/pdf/   index.ts   fonts.ts  primitives.ts  images.ts  svg.ts  meta.ts
src/main/render/pptx/  index.ts
src/main/render/html/  index.ts
src/main/export/       worker.ts  orchestrator.ts
resources/fonts/       (static TTF/OTF files + licenses)
tests/fixtures/        decks/*.json  golden/*.png
```

---

## 17. Acceptance Criteria

The rebuild is done when:

1. A 20-slide generated deck exports to PDF with **no clipped text, no stray margins, and exactly 20 pages**.
2. Text in the PDF is selectable/searchable; all fonts are embedded (`pdffonts` confirms).
3. Gradients are smooth, images are rounded/clipped correctly, charts are vector.
4. PDF Preview in-app is visually identical to the saved file.
5. PPTX opens in PowerPoint with editable text boxes (no flattened screenshots except `rawHtml` blocks).
6. Golden-image tests pass in CI on at least one OS; packaged apps verified on Windows, macOS, Linux.
7. 40-slide export completes with the UI responsive and a progress indicator.
8. A deck in English and one in an Indic language both render correctly.
9. Document metadata, bookmarks and image alt text are present.
10. No network access needed for export.

---

## 18. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LLM emits invalid/unsafe JSON, especially smaller local models | Failed generations | Schema in prompt, repair retry, salvage valid slides, JSON-extraction fallback |
| Loss of free-form HTML creativity | Less flexible slides | Rich block set, `rawHtml` escape hatch, more templates over time |
| Measure/draw mismatch → overflow | Visible defects | Use same font files for both; golden tests |
| Complex-script shaping gaps in PDFKit/fontkit | Broken Bengali/Hindi/Arabic | Day-1 spike; fall back to pre-shaped runs or rasterize affected text |
| `sharp` packaging issues | Broken builds on some OS | Test in CI per platform; fallback to PDFKit's native image handling |
| Scope creep (rewriting everything) | Delays | Ship Phases 0–4 first behind a feature flag; PPTX/HTML migration later |
| Existing user decks break | User trust | Legacy flag + old exporter for 1–2 releases, upgrade path |
| Font licensing | Legal | Use OFL fonts (Inter, etc.), ship license files |
| Installer size growth | Slower downloads | Subset/limit font weights, static instances only |

---

## 19. Open Questions (answer after Phase 0)

1. What exactly does the LLM produce today (HTML, markdown, JSON)? Where do themes get applied?
2. Which fonts do the current 15+ themes use, and are they bundled or loaded from the web?
3. How are images currently obtained and stored (uploads, generated, remote URLs)?
4. Do you want 16:9 only, or also 4:3 / A4 document mode soon?
5. Is Kokoro TTS voiceover tied to per-slide text that the new model must preserve (`notes` field)?
6. Do you want a Linux x64 build in addition to arm64?
7. Should v2 keep the legacy exporter long-term or drop it after migration?

---

## 20. Immediate Next Step

Share `exporter.ts`, the system prompt in `generator.ts`, one sample generated slide, and `slideParser.ts`. With those, Phase 0 can be completed and this plan converted into per-file tasks with exact interfaces.
