# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite, http://localhost:5173)
npm run build     # type-check + production build (vue-tsc -b && vite build)
npx tsc --noEmit  # type-check only (no test framework is configured)
```

## Architecture

This is a browser-based SVG path editor. Vue 3 + Pinia + Vite, no test suite.

### Data flow

```
SVG string
  → parseSvg()          parse.ts      DOM parse, flatten <g> transforms, normalize arcs
  → dToSegments()       pathString.ts tokenize d-string → Segment[]
  → store.document      store.ts      reactive state
  → PathLayer.vue       render        draws paths + anchor/handle overlays
```

Editing mutates `store.document.elements[i].segments` via pure functions in `segments.ts`. History is a snapshot stack of `elements` arrays (JSON clone, not structuredClone — Vue reactive Proxies break structuredClone).

### Internal segment model (`pathString.ts`)

All segments use absolute coordinates. The parser handles relative commands and converts H/V→L, S→C, T→Q during parse. `A` arcs are converted to cubics by `svgpath().unarc()` before `dToSegments` is called.

```ts
type Segment =
  | { type: 'M' | 'L'; point: Point }
  | { type: 'C'; handleOut: Point; handleIn: Point; point: Point }
  | { type: 'Q'; control: Point; point: Point }
  | { type: 'Z' }
```

`handleOut` = control point leaving the previous anchor; `handleIn` = control point arriving at `point`.

### Coordinate system

SVG user-space coordinates only. `screenToSvg()` in `coords.ts` converts pointer events via `svgEl.getScreenCTM().inverse()`. Always call it on the `<svg>` root, never on a child `<g>` (breaks under viewBox transforms).

Viewport pan/zoom is implemented by mutating `store.viewport` which drives the `viewBox` computed string. Visual sizes (anchor boxes, handle circles, stroke widths) are divided by `store.viewport.scale` to stay pixel-constant on screen.

### Drag interaction

Pointer capture is set on the SVG root element (`svgRef.value.setPointerCapture`), not on the anchor `<rect>` children. `pointermove` is handled at the canvas level in `Canvas.vue`, which forwards to `drag.onCanvasPointerMove`. History is pushed once on `pointerdown`; drag moves update state without pushing history.

### Key files

- `src/state/store.ts` — single Pinia store; all mutable state and actions. `updatePathAttr(pathIndex, attrName, value)` updates a path's SVG attribute (fill, stroke, etc.) with history push.
- `src/data/pathString.ts` — `Segment` types, `dToSegments`, `segmentToD`, `segmentsToD`
- `src/data/segments.ts` — pure functions: `moveNode`, `moveHandleIn/Out`, `addNodeAt` (de Casteljau), `deleteNode`
- `src/data/parse.ts` — `parseSvg`: flattens nested `<g>` transforms, skips `clipPath`/`mask`/`symbol`
- `src/render/PathLayer.vue` — most complex component; draws all paths + active path overlay (anchors, handles, ghost, dblclick hit area). All paths render their actual `attrs.stroke`; the active path is indicated by a separate dashed blue overlay path, not by overriding stroke color.
- `src/ui/PathList.vue` — path list sidebar; each item has fill and stroke color swatches that trigger hidden `<input type="color">` pickers on click.
- `src/interaction/useDrag.ts` — drag composable (absolute-delta approach to avoid float drift)
- `src/interaction/useKeyboard.ts` — Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo, Delete/Backspace node delete, arrow nudge
