# OpenGamma Design Audit & Modernization Plan

## Current State Analysis

### Dashboard View ✅

- Clean grid layout with presentation cards
- Clear visual hierarchy (title, preview, actions)
- Good use of space and breathing room
- **Status:** Acceptable, minor polish needed

### Editor View ⚠️

**Current Layout Stack (Top-Down):**

1. Titlebar (10px) - drag region
2. PromptInput + controls (compact)
3. ThemePicker (single line)
4. SlidePreview (main canvas - flex-grow)
5. SlideThumbnails strip (bottom)
6. Export footer (bottom)

**Critical Design Problems:**

| Issue                           | Severity | Impact                                                         | Solution                                                        |
| ------------------------------- | -------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| **Cramped prompt input**        | 🔴 HIGH  | User can't see what they're typing; no context for suggestions | Expand prompt area, show inline formatting hints                |
| **Bottom-heavy layout**         | 🔴 HIGH  | Main canvas squeezed; thumbnails steal space                   | Move thumbnails to left sidebar (proposal: side-by-side layout) |
| **Poor visual hierarchy**       | 🔴 HIGH  | Multiple competing elements at same visual weight              | Add clear primary actions, demote secondary controls            |
| **Theme picker always visible** | 🟡 MID   | Takes space even after generation; not active workflow         | Move to collapsible panel or right sidebar                      |
| **Slide selection unclear**     | 🟡 MID   | User doesn't know current slide during editing                 | Add slide counter, highlight active slide, show metadata        |
| **Export controls buried**      | 🟡 MID   | Users must scroll or look down to export                       | Move export to prominent top position or modal                  |
| **No generation feedback**      | 🟡 MID   | User can't see generation progress/errors clearly              | Add progress overlay, streaming status indicator                |
| **Editing modal disconnected**  | 🟠 LOW   | SlideEditModal opens in void; loses context                    | Could show modal as side panel instead                          |

## Proposed Modern Architecture

### New Layout: **3-Column Layout**

```
┌─────────────────────────────────────────────┐
│         Drag Region + Quick Actions         │
├──────────────┬─────────────────┬────────────┤
│              │                 │            │
│   SIDEBAR    │  CANVAS AREA    │   PANEL    │
│              │                 │            │
│  • Slides    │  • Main preview │ • Theme    │
│  • History   │  • Streaming    │ • Design   │
│  • Tools     │  • Active slide │ • Export   │
│              │                 │  • Share   │
│              │                 │            │
├──────────────┴─────────────────┴────────────┤
│            Prompt Input Area                │
└─────────────────────────────────────────────┘
```

**Benefits:**

- Left sidebar for navigation (slides, history)
- Center canvas maximized for presentation preview
- Right panel for tools & settings (collapsible)
- Bottom prompt area gets full width & height
- Clear visual zones

### Design Modernization Goals

#### 1. **Prompt Input Enhancement**

- **Current:** Single-line input in constrained space
- **Target:**
  - Expanded to 100-120px height
  - Multi-line support with smart formatting
  - Inline tone/narrative selector
  - Slide count slider with visual feedback
  - Suggested prompts carousel
  - AI placeholder hints (subtle animations)

#### 2. **Canvas Maximization**

- **Current:** Squeezed by thumbnails strip + export footer
- **Target:**
  - Full-height preview when generating
  - Thumbnails move to left sidebar (vertical stack)
  - Export controls in right panel
  - Floating action buttons for common tasks
  - Real-time slide counter badge

#### 3. **Sidebar Modernization**

- **Current:** Dashboard-only (presentations grid)
- **Target:**
  - Slide thumbnails when in editor (vertical infinite scroll)
  - Quick access to recent presentations
  - AI history/suggestions
  - Settings quick-access
  - Theme favorites
  - Design system quick-pick

#### 4. **Right Panel (Collapsible)**

- **Current:** Scattered (ThemePicker inline, export footer, settings modal)
- **Target:**
  - Theme picker (compact grid, 3x3)
  - Design system selector (quick 5-item preview)
  - Export options (PPTX, HTML, PDF)
  - Share & download
  - Slide properties (when editing)
  - Collapsible chevron to hide when not needed

#### 5. **Visual Hierarchy Improvements**

- **Primary CTA:** Generate button (prominent, blue, glow effect)
- **Secondary CTA:** Theme select, design system select
- **Tertiary:** Settings, export options
- Use size, color, spacing consistently
- Add micro-interactions (hover states, transitions)
- Implement proper z-stacking for overlays

#### 6. **Streaming & Generation UX**

- **Current:** Status shown in small badge; unclear when generation completes
- **Target:**
  - Full-screen overlay during generation (option to minimize)
  - Live stream feedback (token count, ETA)
  - Slide-by-slide progress
  - Error handling with recovery suggestions
  - Success celebration (confetti? micro-animations?)

#### 7. **Editing Workflow**

- **Current:** SlideEditModal pops up; disrupts flow
- **Target:**
  - Slide editor as right panel (keeps context)
  - Quick edit shortcuts (double-click slide)
  - Inline slide properties
  - Undo/redo with visual feedback
  - Auto-save indication

#### 8. **Color & Typography**

- **Current:** Neutral grays with blue accents
- **Target:**
  - Adopt design system colors for presentation context
  - Better text hierarchy (size, weight, color)
  - Accessible contrast ratios
  - Consistent spacing scale (4px grid)
  - Animation principles (Framer Motion ready)

## Implementation Phases

### Phase 3A: Layout Restructuring (THIS SPRINT)

- [ ] Create new 3-column layout component
- [ ] Migrate SlideThumbnails to left sidebar
- [ ] Expand prompt input area
- [ ] Reposition export controls to right panel
- [ ] Update responsive behavior (mobile collapsible)

### Phase 3B: Visual Modernization

- [ ] Update color palette integration
- [ ] Typography hierarchy improvements
- [ ] Icon refinement
- [ ] Animation/transitions
- [ ] Dark mode support

### Phase 3C: UX Flow Improvements

- [ ] Generation progress overlay
- [ ] Streaming feedback UI
- [ ] Error handling & recovery
- [ ] Editing workflow refinement
- [ ] Keyboard shortcuts

### Phase 3D: Polish & Accessibility

- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Mobile responsiveness
- [ ] Performance optimization

## Success Metrics

✅ User can generate presentation in <5 clicks
✅ Main canvas takes 70%+ of screen space
✅ No horizontal scrolling on 1920x1080
✅ All primary workflows fit in visible area
✅ <300ms time to interaction for export
✅ WCAG 2.1 AA compliance

## Design System Integration

The new design will leverage the 15 curated design systems (Phase 2) to:

- Style presentation preview dynamically
- Show design system colors in export controls
- Highlight design selection in prompt flow
- Preview design changes in real-time

## Components to Create/Refactor

| Component           | Status   | Notes                           |
| ------------------- | -------- | ------------------------------- |
| LayoutContainer     | NEW      | 3-column layout wrapper         |
| SidebarPanel        | REFACTOR | Move slides + history           |
| CanvasArea          | NEW      | Centered preview zone           |
| RightPanel          | NEW      | Collapsible controls            |
| PromptInputExpanded | REFACTOR | 120px height, multi-line        |
| GenerationOverlay   | NEW      | Full-screen generation feedback |
| SlideEditorPanel    | NEW      | Right panel slide editor        |
| ExportPanel         | NEW      | Right panel export options      |

## Timeline Estimate

- Phase 3A (Layout): 4-6 hours
- Phase 3B (Visual): 3-4 hours
- Phase 3C (UX): 2-3 hours
- Phase 3D (Polish): 1-2 hours
- **Total: ~12-15 hours** (2-3 sprint days)
