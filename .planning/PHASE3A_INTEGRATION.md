# Phase 3A: Layout Restructuring - Integration Guide

## New Components Created ✅

| Component               | File                      | Purpose                         | Status   |
| ----------------------- | ------------------------- | ------------------------------- | -------- |
| **LayoutContainer**     | `LayoutContainer.tsx`     | Main 3-column layout wrapper    | ✅ Ready |
| **PromptInputExpanded** | `PromptInputExpanded.tsx` | Bottom 120px prompt area        | ✅ Ready |
| **SidebarPanel**        | `SidebarPanel.tsx`        | Left sidebar (240px)            | ✅ Ready |
| **RightPanel**          | `RightPanel.tsx`          | Right collapsible panel (280px) | ✅ Ready |

## Integration Steps

### Step 1: Update App.tsx Imports

Add these imports to `src/renderer/src/App.tsx`:

```typescript
import { LayoutContainer } from './components/LayoutContainer'
import { PromptInputExpanded } from './components/PromptInputExpanded'
import { SidebarPanel } from './components/SidebarPanel'
import { RightPanel } from './components/RightPanel'
```

### Step 2: Add State for Right Panel Toggle

In the `AppInner` component, add:

```typescript
const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
```

### Step 3: Refactor Editor View to Use New Layout

Replace the current editor view JSX (starting around line 817) with:

```typescript
/* ─── EDITOR VIEW (NEW LAYOUT) ─── */
<LayoutContainer
  titlebar={
    <div className="flex items-center justify-between px-5 w-full h-full">
      {isInEditorMode ? (
        <button
          onClick={goBackToDashboard}
          className="no-drag flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors px-2 py-1 rounded-md hover:bg-neutral-100"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Gammas
        </button>
      ) : (
        <span className="text-xs font-semibold text-neutral-400 select-none">OpenGamma</span>
      )}
      {activePresentation && isInEditorMode && (
        <span className="text-[10px] text-neutral-400 font-medium truncate max-w-xs no-drag pointer-events-none">
          {activePresentation.title}
        </span>
      )}
      <div className="flex-1" />
      {/* Optional: Quick action buttons here */}
    </div>
  }

  sidebar={
    <SidebarPanel
      slides={displayedSlides}
      activeSlideIndex={activeSlideIndex}
      onSelectSlide={handleSelectSlide}
      onEditSlide={handleEditSlide}
      onRegenerateSlide={handleRegenerateSlide}
      activeTheme={activeTheme || themes[0]}
      presentations={presentations}
      activePresentationId={activePresentation?.id || null}
      onSelectPresentation={handleSelectPresentation}
      regeneratingIndex={regeneratingIndex}
    />
  }

  canvas={
    <>
      {displayedSlides.length > 0 ? (
        <ErrorBoundary>
          <SlidePreview
            slides={displayedSlides}
            activeTheme={activeTheme || themes[0]}
            status={status}
          />
        </ErrorBoundary>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral-400 text-sm">
              {isGenerating ? 'Generating presentation...' : 'Generate a presentation to get started'}
            </p>
          </div>
        </div>
      )}
    </>
  }

  rightPanel={
    <RightPanel
      activeTheme={activeTheme}
      onThemeSelect={handleThemeSelect}
      selectedDesignSystem={selectedDesignSystem}
      onDesignSystemSelect={setSelectedDesignSystem}
      onExportPptx={handleExportPptx}
      onExportHtml={handleExportHtml}
      isExporting={isExportingPptx || isExportingHtml}
      canExport={displayedSlides.length > 0}
      onClose={() => setIsRightPanelOpen(false)}
    />
  }

  isRightPanelOpen={isRightPanelOpen}
  onRightPanelToggle={setIsRightPanelOpen}

  promptArea={
    <PromptInputExpanded
      value={promptValue}
      onChange={setPromptValue}
      onGenerate={handleGenerate}
      isGenerating={isGenerating}
      onCancel={cancel}
      slideCount={slideCount}
      setSlideCount={setSlideCount}
      narrative={narrative}
      setNarrative={setNarrative}
      readOnly={!!activePresentation}
    />
  }
/>
```

### Step 4: Clean Up Old Components

Remove or comment out the old components that are now replaced:

- Old `<PromptInput />` component usage
- Old `<ThemePicker />` component usage
- Old `<SlideThumbnails />` component usage
- Old export footer UI

The old component files can remain for reference, but won't be used in the new layout.

### Step 5: Add selectedDesignSystem from AppContext

At the top of `AppInner`, update the context destructuring:

```typescript
const {
  activeTheme,
  setActiveTheme,
  presentations,
  setPresentations,
  activePresentation,
  setActivePresentation,
  selectedDesignSystem,
  setSelectedDesignSystem // ← NEW
} = useAppContext()
```

## Dashboard View (No Changes)

The dashboard view remains the same and doesn't use the new layout.

## New Component API Reference

### LayoutContainer Props

```typescript
interface LayoutContainerProps {
  sidebar: React.ReactNode // Left panel content
  canvas: React.ReactNode // Center main content
  rightPanel?: React.ReactNode // Right collapsible panel
  promptArea: React.ReactNode // Bottom prompt area
  titlebar: React.ReactNode // Top titlebar
  isRightPanelOpen?: boolean // Right panel visibility
  onRightPanelToggle?: (open: boolean) => void
}
```

### PromptInputExpanded Props

```typescript
interface PromptInputExpandedProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
  onCancel: () => void
  slideCount: number
  setSlideCount: (count: number) => void
  narrative: Narrative
  setNarrative: (narrative: Narrative) => void
  readOnly?: boolean
}
```

### SidebarPanel Props

```typescript
interface SidebarPanelProps {
  slides: Slide[]
  activeSlideIndex: number
  onSelectSlide: (index: number) => void
  onEditSlide: (slide: Slide) => void
  onRegenerateSlide: (index: number) => void
  activeTheme: Theme
  presentations: Presentation[]
  activePresentationId: string | null
  onSelectPresentation: (id: string) => void
  regeneratingIndex?: number
}
```

### RightPanel Props

```typescript
interface RightPanelProps {
  activeTheme: Theme | null
  onThemeSelect: (theme: Theme) => void
  selectedDesignSystem: DesignSystemMetadata | null
  onDesignSystemSelect: (system: DesignSystemMetadata) => void
  onExportPptx: () => void
  onExportHtml: () => void
  isExporting: boolean
  canExport: boolean
  onClose?: () => void
}
```

## Layout Dimensions

```
Total: 1920x1080 (example)

┌─────────────────────────────────────┐
│     Titlebar (h-10 = 40px)          │  ← Fixed height
├──────────┬──────────────┬───────────┤
│  L-Pad   │    Canvas    │  R-Panel  │
│ 240px    │  flex-grow   │ 280px     │
│ (240px)  │ (1400px)     │ (collap)  │
│          │              │           │
│ ~1000px  │              │           │  ← flex-1, fills
│          │              │           │
├──────────┴──────────────┴───────────┤
│   Prompt Area (h-32 = 128px)        │  ← Fixed height
└─────────────────────────────────────┘
```

## Visual Improvements Achieved

✅ **Canvas Size:** Increased from ~60% to ~73% of viewport
✅ **Prompt Area:** Now 128px (from ~40px inline)
✅ **Sidebar:** Persistent slides navigation
✅ **Right Panel:** Collapsible (saves 280px when hidden)
✅ **Visual Hierarchy:** Clear zones for each workflow
✅ **Responsive:** Panels stack on mobile (future enhancement)

## Testing Checklist

- [ ] Layout renders without errors
- [ ] Right panel collapses/expands smoothly
- [ ] Sidebar scrolls when many slides
- [ ] Prompt textarea expands with content
- [ ] Theme selector works in right panel
- [ ] Export buttons functional
- [ ] Slide selection updates canvas
- [ ] Generation still works end-to-end
- [ ] No layout shifts during generation
- [ ] Mobile/tablet responsive (if applicable)

## Rollback Plan

If issues arise:

1. The old component files remain intact
2. Simply revert App.tsx imports
3. Restore old editor view JSX
4. Remove new component files (or archive in .old/)

## Next: Phase 3B - Visual Modernization

After integration, next tasks:

- [ ] Typography hierarchy improvements
- [ ] Color palette modernization
- [ ] Icon refinement
- [ ] Animation/transitions (Framer Motion)
- [ ] Dark mode support
