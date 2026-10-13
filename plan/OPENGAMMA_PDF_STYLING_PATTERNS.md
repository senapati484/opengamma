# OpenGamma PDF Styling Patterns

Companion to `OPENGAMMA_NATIVE_PDF_PLAN.md`. This is the visual rulebook the layout engine and PDF backend must follow so the output looks like a designed deck (Gamma-quality), not a printed web page.

**Page:** 960 × 540 pt (16:9). All numbers below are in points unless stated.
**Rule of thumb:** every visual decision comes from a theme token. No hard-coded sizes, colors or spacing inside templates.

---

## 1. Foundations

### 1.1 Spacing scale (4-pt base)
Use only these values for padding, gaps and margins.

| Token | Value | Typical use |
|---|---|---|
| `s1` | 4 | Icon-to-label nudges |
| `s2` | 8 | Tight gaps (bullet marker to text) |
| `s3` | 12 | Between list items (small) |
| `s4` | 16 | Between list items (normal), card inner gap |
| `s5` | 24 | Gutter, card padding, paragraph gap |
| `s6` | 32 | Between heading and body |
| `s7` | 48 | Between major groups |
| `s8` | 64 | Section breaks, title-slide spacing |

### 1.2 Grid
- Outer margin: **56** left/right, **48** top, **48** bottom.
- Content area: 848 × 444.
- 12 columns, gutter **24** → column width ≈ 48.7.
- Everything snaps to the grid horizontally and to the 4-pt scale vertically.
- Text-heavy slides use a **max text measure of 8 columns (~600 pt)** to keep line length readable (45–75 characters).

### 1.3 Corner radius scale
| Token | Value | Use |
|---|---|---|
| `r1` | 6 | Tags, small chips, code blocks |
| `r2` | 12 | Table container, small cards |
| `r3` | 20 | Cards, images |
| `r4` | 32 | Hero panels, full-width callouts |
| `pill` | 999 | Badges, step markers |

One radius family per theme (e.g., "sharp" themes use `r1/r2` only; "soft" themes use `r3/r4`). Never mix sharp and soft in one deck.

---

## 2. Typography

### 2.1 Type scale (default theme; themes may scale ±10%)
| Style | Size | Weight | Line height | Letter spacing | Notes |
|---|---|---|---|---|---|
| Display (title slide) | 64 | 700–800 | 1.05 | −1.5% | Max 2 lines, balanced wrap |
| H1 (slide title) | 40 | 700 | 1.1 | −1% | Max 2 lines |
| H2 | 28 | 600 | 1.2 | −0.5% | Card titles, subheads |
| H3 | 20 | 600 | 1.25 | 0 | Small card titles |
| Body | 18 | 400 | 1.45 | 0 | Minimum body 16 after autofit |
| Body small | 14 | 400 | 1.4 | 0 | Captions, table cells |
| Caption / footer | 11–12 | 400–500 | 1.3 | +1% | Slide number, source lines |
| Eyebrow / label | 12 | 600 | 1.2 | +8% UPPERCASE | Section labels above headings |
| Stat number | 72–96 | 700–800 | 1.0 | −2% | Tabular figures |
| Code | 14 | 400 | 1.4 | 0 | Monospace |

### 2.2 Font pairing (all open-license, OFL)
| Style family | Heading | Body | Use for themes like |
|---|---|---|---|
| Modern sans | Plus Jakarta Sans / Inter Display | Inter | Startup Gradient, Void Lime |
| Geometric | Space Grotesk | DM Sans | Terminal Green, tech decks |
| Editorial serif | Playfair Display / Fraunces | Lora or Inter | Noir Gold, report-like decks |
| Mono accent | JetBrains Mono (eyebrows, code only) | n/a | Any |

Rules:
- Maximum **two families + mono** per deck.
- Ship **static** font files (Regular, Medium/SemiBold, Bold, plus Italic where needed). Avoid variable fonts in PDFKit.
- Include Bengali/Devanagari-capable fonts (e.g., Noto Sans Bengali, Noto Sans Devanagari) as automatic fallbacks per script; test shaping early.
- Emoji: render from bundled SVG/PNG set, not text glyphs.

### 2.3 Typographic polish (apply in a text-normalizing step before layout)
- Convert straight quotes to curly quotes (“ ” ‘ ’); apostrophes to ’.
- Use en dash for ranges (2020–2024) and em dash for breaks (—), with no spaces around em dashes unless the theme specifies.
- Replace `...` with `…`.
- Non-breaking space between number and unit (`10 kg`, `$5 M`), and before `%` in some locales.
- Prevent **widows/orphans** in headings: use **balanced line breaking** (choose the break that makes lines most equal, never leave a single short word on the last line).
- Disable hyphenation for headings; allow soft hyphenation for body only if language dictionary exists.
- Use **tabular figures** (`tnum`) for tables, stats and charts; **lining figures** for headings.
- Optical alignment: pull large quote marks and bullets slightly into the margin (hanging punctuation).
- Left-align body text; never justify. Center only: title slide, quote, stat, closing.

### 2.4 Hierarchy checks
Every slide must show **three clear levels** at most: eyebrow/title → subhead → body. If a slide needs more, split it.

---

## 3. Color System

### 3.1 Theme palette tokens
```
bg        page background
surface   card / panel fill (slightly different from bg)
surface2  nested elements, table zebra
text      primary text
muted     secondary text (≥ 4.5:1 on bg)
accent    primary brand color (numbers, bullets, highlights)
accent2   secondary accent (gradients, chart series 2)
border    hairlines (8–14% opacity of text)
danger/success/warn   semantic (charts, callouts)
```

### 3.2 Usage proportions (60 / 30 / 10)
- **60%** background and neutral surfaces.
- **30%** text and structural elements.
- **10%** accent. Use accent for: bullet markers, key numbers, underline bars, icons, chart highlight series, links. Never for body paragraphs.

### 3.3 Contrast rules (enforced by tests)
- Body text vs. background: **≥ 4.5:1**.
- Large text (≥ 24 pt) and UI shapes: **≥ 3:1**.
- Text over images: always on a **scrim** (see §5.2); never rely on the photo.
- Muted text on `surface`: re-check against the card fill, not the page bg.

### 3.4 Light and dark variants
Every theme defines both a "light" and "dark" slide variant (title/section slides often use the dark/gradient variant; content slides use the base). Switching variants swaps tokens, not layouts.

### 3.5 Print safety
- Avoid pure `#000000` backgrounds with thin light text (halation); use `#0B0D12`-style near-black.
- Avoid extremely saturated neon accents on white; reduce saturation 10–15% for light themes.
- Keep full-bleed dark backgrounds to title/section/closing slides to limit ink-heavy output.

---

## 4. Backgrounds and Gradients

| Pattern | Spec |
|---|---|
| Solid | `bg` token, default for content slides |
| Linear gradient | 2–3 stops, **135°**, stops from `bg` → slightly lighter/tinted `bg`, ≤ 12% luminance difference for content slides; stronger for title slides |
| Radial glow | One radial gradient (accent at 15–25% opacity) anchored near a corner, radius ~60% of page width; adds depth without noise |
| Mesh-like | 2–3 overlapping radial glows with different accents at 10–20% opacity (title slides only) |
| Image background | Full-bleed, `cover`, plus scrim (§5.2) |
| Subtle pattern | Optional dotted grid at 4–6% opacity on tech themes; vector dots, not an image |

Rules:
- Gradients are **native PDF shadings** (smooth, small file size).
- Max one decorative glow per slide.
- Avoid banding: keep at least 3 stops for long, low-contrast gradients or add ±1% noise only if rasterized.
- Content slides stay calm; save expressive backgrounds for title, section, closing.

---

## 5. Imagery

### 5.1 Placement and shape
- Images are clipped to rounded rects using the theme radius (`r3` default).
- Aspect ratios allowed: **16:9, 4:3, 1:1, 3:4**. Crop with `cover`, focal point at center unless specified.
- Side images: **5 of 12 columns**, full height of content area, or full-bleed to page edge (no rounding on the bleed side).
- Inset images get a **1 pt hairline border** at `border` color, or a soft shadow, never both.

### 5.2 Scrims for text over image
```
scrim = linear gradient, bottom → top
  stops: rgba(0,0,0,0.65) at 0%, rgba(0,0,0,0.35) at 55%, rgba(0,0,0,0) at 100%
```
- Text over image uses white (or theme "onImage") text, minimum 4.5:1 against the scrim at its position.
- For left-aligned hero text, use a left→right scrim instead.

### 5.3 Export quality
- Downsample to ≤ 200–220 DPI at placed size; JPEG q≈85 for photos, PNG for graphics.
- Strip metadata; embed sRGB.
- Provide an `alt` string for every image; decorative shapes are marked as artifacts.
- Missing/failed image: neutral placeholder card with an icon, never a broken box.

---

## 6. Cards and Surfaces

### 6.1 Standard card
```
fill:      surface
radius:    r3 (20)
padding:   s5 (24)
border:    0.75 pt, border color (optional)
shadow:    soft (see 6.2) OR border, not both
inner gap: s4 (16) between title and body
```

### 6.2 Shadow recipe (PDF-safe, no blur filters)
Approximate a soft shadow using 4 stacked rounded rects drawn behind the card:
| Layer | Offset Y | Expand | Opacity |
|---|---|---|---|
| 1 | 2 | 0 | 8% |
| 2 | 6 | 2 | 6% |
| 3 | 12 | 4 | 4% |
| 4 | 20 | 8 | 2% |

Shadow color = a darkened tint of `bg` (not pure black) on light themes; accent-tinted on dark themes. Alternatively pre-render one blurred PNG per radius/size and cache it.

### 6.3 Card variants
- **Filled:** surface fill, no border (default).
- **Outlined:** transparent, 1 pt border.
- **Accent:** accent fill at 10–14% opacity with accent title text.
- **Glass (dark themes):** white at 6–8% opacity + 0.75 pt white 12% border.
- **Highlight:** solid accent fill, text uses `onAccent` color; max **one** per slide.

### 6.4 Card grids
- 2 cards: each 6 columns. 3 cards: each 4 columns. 4 cards: 2×2 or 4 × 3 columns (use 2×2 if text > 20 words each).
- Equal heights per row; baseline-align titles.
- Gap between cards: `s5` (24).
- Icon: 36–44 pt in a 56 pt circle or rounded square filled with accent at 12%.

---

## 7. Lists and Bullets

- Custom bullets drawn as shapes (not text glyphs): **6 pt circle**, accent color, vertically centered on the first line's x-height.
- **Hanging indent:** bullet at 0, text at 20 pt; wrapped lines align with the first line's text.
- Item spacing: `s4` (16) between items; `s3` (12) when > 5 items.
- Max **6–8 items**, ≤ 25 words each; longer content becomes cards or splits.
- Numbered lists: accent-colored numerals in 28 pt circles (`pill`), body text beside them.
- Nested level: indent 24 pt, smaller bullet (4 pt), body small size, muted color.
- Checklists: drawn checkmark in accent circle.

---

## 8. Tables

| Property | Value |
|---|---|
| Container | `surface` fill, `r2` radius, clipped |
| Header row | accent at 10–14% fill (or `surface2`), text weight 600, 14 pt, uppercase optional with +4% tracking |
| Cell padding | 12 horizontal, 10 vertical (row height ≈ 36–40) |
| Zebra | `surface2` at 40–50% on even rows (optional) |
| Dividers | 0.5 pt horizontal hairlines only; **no vertical lines** |
| Alignment | Text left, numbers **right**, with tabular figures |
| Column widths | Computed from content with min 80 pt, max 40% of width; last column absorbs slack |
| Overflow | > 8 rows → split across slides with repeated header; > 6 columns → warn / reduce font to 12 |
| Emphasis | Highlight a row/column with accent 8% fill, not bold everywhere |

---

## 9. Charts

### 9.1 Palette
Categorical series order (colorblind-safe, adjusted per theme):
`accent`, `accent2`, then neutral-leaning mid tones. Max **6 series**; beyond that, group into "Other".
Always differentiate by more than color when 3+ series (direct labels, line dash styles, or markers).

### 9.2 Chart rules
- Vector (SVG → PDF); font = body font, 12 pt for axes, 14 pt for data labels, 18 pt for chart title.
- **Gridlines:** horizontal only, 0.5 pt, `text` at 8–10% opacity. No chart borders.
- Remove top/right axes; keep baseline.
- **Direct labeling** over legends when ≤ 4 series.
- Bars: radius 4 on top corners, gap = 40% of bar width; start at zero.
- Lines: 3 pt stroke, round caps/joins, markers 6 pt only on last/highlight points.
- Pie/donut: max 5 slices; donut thickness ~35%; label outside with leader lines or center total.
- No 3D, no shadows, no gradient fills on data.
- One **highlight** series in accent; others in muted tones to tell a story.
- Always include a one-line takeaway as the slide title ("Revenue grew 38% in Q3"), not just "Revenue".

---

## 10. Icons and Decorative Elements

- Single icon set per deck (e.g., Lucide/Phosphor, stroke 1.75–2 pt), embedded as SVG paths.
- Icon sizes: 20 (inline), 28, 40 (card), 56 (feature).
- Color: accent, or `text` at 80%; never multicolor.
- Decorative elements allowed: accent bar (4 × 48 pt, `r1`) above/below headings, thin dividers (0.75 pt), corner glows, dotted grid. Keep ≤ 2 per slide.
- Mark purely decorative shapes as PDF artifacts (accessibility).

---

## 11. Layout-Specific Patterns

### 11.1 Title slide
- Dark or gradient background (§4), left-aligned Display title (max 2 lines, balanced), subtitle 24 pt muted, eyebrow label above.
- Vertical placement: block centered at ~45% of page height.
- Optional: author + date at bottom-left (caption), one radial glow or image on the right 5 columns.

### 11.2 Section break
- Large number (e.g., "02", 120 pt, accent at 25% opacity) + H1 title + one-line description.
- Full-bleed gradient; no body text.

### 11.3 Content (heading + bullets)
- H1 at top-left (y = 48), accent bar 4 × 48 pt above it (optional).
- 32 pt gap, then bullets in an 8-column measure; optional image/card in the remaining 4 columns.
- Do not fill vertical space artificially; whitespace at the bottom is fine.

### 11.4 Two column
- Columns 6 + 6 (or 7 + 5). Align the first baselines of both columns. Optional vertical divider hairline.

### 11.5 Image left/right
- Image 5 columns, full-bleed on the outer edge (no radius on the page-edge side); text block 6 columns, vertically centered.

### 11.6 Cards
- Heading above, card grid below (§6.4). Titles H3, body small size, max 25 words per card.

### 11.7 Stats
- 2–4 stat blocks; number in accent (72–96 pt), label muted 16 pt, optional delta chip (pill, green/red 12% fill).
- Separate with hairline dividers or place on cards.

### 11.8 Quote
- Oversized opening quote mark (accent, 120 pt, 30% opacity) hanging in the margin.
- Quote text 32–36 pt, serif if theme allows, max 5 lines; attribution 16 pt muted with a 24 pt accent dash.

### 11.9 Timeline
- Horizontal line (2 pt, `border`), nodes as 14 pt accent circles with white 3 pt ring; labels (eyebrow style) above, title H3 below, body small below that.
- 3–6 nodes; more → vertical timeline layout.

### 11.10 Table / Chart slides
- Takeaway title (H1, ≤ 2 lines), content centered in a card or directly on bg, source/caption at bottom-left (11 pt muted).

### 11.11 Closing
- Mirror the title slide (same background family), large "Thank you"/CTA, contact lines with icons, optional QR code (vector).

---

## 12. Page Furniture

- **Slide number:** bottom-right, caption size, muted, format "03" or "3 / 20" (theme option). Hidden on title and closing slides.
- **Footer text:** optional, bottom-left, 11 pt muted (deck title or author). **No watermark** by default.
- Footer zone (bottom 36 pt) is reserved; content never enters it.
- Safe zone: nothing important within 24 pt of the page edge (except intentional bleed images).

---

## 13. Density and Autofit Rules

1. Target density: **≤ 60 words** on a text slide (excluding cards/tables), **≤ 25 words per bullet**.
2. Autofit order: reduce body size 18 → 16 (min), tighten line height 1.45 → 1.3 (min 1.2), reduce gaps one step; then **split the slide**; else show a warning badge.
3. Headings never shrink below 32 pt (H1); shorten or wrap instead.
4. If a block still overflows after split, truncate nothing silently: warn the user.
5. Keep ≥ 40% of the content area as whitespace on non-table, non-chart slides.

---

## 14. Accessibility Patterns

- Reading order = visual order (title → subtitle → body → footer).
- Document language set from `deck.meta.lang`.
- Alt text for images/charts (chart alt includes the takeaway and key numbers).
- Color is never the only differentiator (labels, patterns, markers).
- Minimum body text 16 pt; minimum caption 11 pt.
- Link text is descriptive; links underlined or accent-colored with an underline (not color only).
- Tagged PDF structure for headings, lists and tables where PDFKit support allows **[verify with current version]**.

---

## 15. Deck-Level Consistency Checklist

- [ ] One heading font + one body font (+ mono).
- [ ] Same radius family across the deck.
- [ ] Same card style across similar slides.
- [ ] Accent used consistently (same meaning every time).
- [ ] Title position identical across content slides (top-left, same y).
- [ ] Image treatment consistent (radius, border/shadow, aspect ratios).
- [ ] Rhythm: alternate dense and airy slides; insert a section break every 5–7 content slides.
- [ ] Slide titles are **sentences that state the point**, not just topics.

---

## 16. Per-Slide QA Checklist (automated where possible)

| Check | Automated? |
|---|---|
| No text outside the content area / safe zone | Yes (scene bounds) |
| Contrast ≥ 4.5:1 (text vs. actual background incl. scrim) | Yes |
| No single-word last lines in headings | Yes |
| Min font sizes respected | Yes |
| Fonts embedded, text extractable | Yes (`pdffonts`, pdf.js) |
| Images ≥ 150 DPI at placed size, ≤ 220 DPI | Yes |
| Alt text present | Yes |
| Visual diff vs. golden | Yes (pixelmatch) |
| "Looks balanced" | Manual spot check |

---

## 17. Common Pitfalls to Avoid

| Pitfall | Why it looks bad | Fix |
|---|---|---|
| CSS-style `box-shadow`/`filter: blur` | Rasterized or dropped in PDF | Use stacked-shape shadows or cached PNG |
| Ad-hoc font sizes per slide | Inconsistent hierarchy | Tokens only |
| Text edge-to-edge | Cramped, amateur | Respect margins and measure |
| Centered paragraphs | Hard to read | Left-align; center only short displays |
| Too many accents/colors | Noisy | 60/30/10 rule |
| Pure black bg + pure white text | Halation, ink-heavy | Near-black / off-white |
| Charts with legends far from data | Slow comprehension | Direct labels |
| Tiny table text | Illegible when projected | ≥ 12 pt, split or simplify |
| Mixing radius styles | Inconsistent feel | One radius family per theme |
| Raster text in images | Not searchable, blurry | Keep text as live text |
| Letting the LLM pick colors/sizes | Inconsistent output | LLM chooses content + layout only |

---

## 18. Token Implementation Sketch

```ts
// src/main/model/themes.ts
export const tokens = {
  space:  { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48, s8: 64 },
  radius: { r1: 6, r2: 12, r3: 20, r4: 32, pill: 999 },
  page:   { w: 960, h: 540, marginX: 56, marginTop: 48, marginBottom: 48, cols: 12, gutter: 24 },
  type: {
    display: { size: 64, weight: 800, lh: 1.05, tracking: -0.015 },
    h1:      { size: 40, weight: 700, lh: 1.10, tracking: -0.01  },
    h2:      { size: 28, weight: 600, lh: 1.20, tracking: -0.005 },
    h3:      { size: 20, weight: 600, lh: 1.25, tracking: 0      },
    body:    { size: 18, weight: 400, lh: 1.45, tracking: 0, min: 16 },
    small:   { size: 14, weight: 400, lh: 1.40, tracking: 0      },
    caption: { size: 12, weight: 500, lh: 1.30, tracking: 0.01   },
    eyebrow: { size: 12, weight: 600, lh: 1.20, tracking: 0.08, upper: true },
    stat:    { size: 80, weight: 800, lh: 1.00, tracking: -0.02, tnum: true },
  },
  shadow: { soft: [[2,0,.08],[6,2,.06],[12,4,.04],[20,8,.02]] }, // [offsetY, expand, opacity]
  scrim:  { bottom: [[0,.65],[.55,.35],[1,0]] },                  // [stop, alpha]
} as const
```

Each theme overrides only **colors, fonts, radius family, background recipes and card variant defaults**. Layout templates read tokens; they never contain literals.

---

## 19. Suggested Build Order for Styling

1. Tokens + 2 themes (one light, one dark gradient) + font loading.
2. Typography engine: balanced wrapping, smart quotes, tabular figures.
3. Primitives: rounded rect, clip, linear gradient, radial glow, stacked shadow, scrim.
4. Templates in order: `title` → `content` → `cards` → `image-left/right` → `stats` → `quote` → `section` → `closing` → `table` → `chart` → `timeline`.
5. Port remaining themes one at a time, each passing the contrast test and golden images.
6. Add accessibility tagging and the QA checks from §16 to CI.
