import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { parseSvg } from '../data/parse'
import { segmentsToD } from '../data/pathString'
import { moveNode, moveHandleIn, moveHandleOut, deleteNode, addNodeAt } from '../data/segments'
import type { SvgDocument, SvgElement, PathElement } from '../data/parse'
import type { Point, Segment } from '../data/pathString'

type Selection =
  | { type: 'node'; pathIndex: number; segIndex: number }
  | { type: 'handle-in'; pathIndex: number; segIndex: number }
  | { type: 'handle-out'; pathIndex: number; segIndex: number }
  | null

interface Viewport {
  scale: number
  translate: { x: number; y: number }
}

export const useEditorStore = defineStore('editor', () => {
  const document = ref<SvgDocument | null>(null)
  const activePathIndex = ref<number | null>(null)
  const selection = ref<Selection>(null)
  const viewport = ref<Viewport>({ scale: 1, translate: { x: 0, y: 0 } })
  const history = reactive<{ past: SvgElement[][]; future: SvgElement[][] }>({
    past: [],
    future: [],
  })

  // ---- computed ----

  const pathElements = computed<PathElement[]>(() => {
    if (!document.value) return []
    return document.value.elements.filter((el): el is PathElement => el.kind === 'path')
  })

  // activePathIndex = index in pathElements (filtered list), not full elements array
  const activePath = computed<PathElement | null>(() => {
    if (activePathIndex.value === null) return null
    return pathElements.value[activePathIndex.value] ?? null
  })

  const viewBox = computed(() => {
    if (!document.value) return '0 0 400 400'
    const { rootAttrs } = document.value
    const rawVb = rootAttrs.viewBox ?? `0 0 ${parseFloat(rootAttrs.width ?? '400')} ${parseFloat(rootAttrs.height ?? '400')}`
    const parts = rawVb.split(/[\s,]+/).map(parseFloat)
    const origW = parts[2] ?? 400
    const origH = parts[3] ?? 400
    const { scale, translate: { x: tx, y: ty } } = viewport.value
    return `${tx} ${ty} ${origW / scale} ${origH / scale}`
  })

  const origViewBoxSize = computed<{ w: number; h: number }>(() => {
    if (!document.value) return { w: 400, h: 400 }
    const { rootAttrs } = document.value
    const rawVb = rootAttrs.viewBox ?? `0 0 ${parseFloat(rootAttrs.width ?? '400')} ${parseFloat(rootAttrs.height ?? '400')}`
    const parts = rawVb.split(/[\s,]+/).map(parseFloat)
    return { w: parts[2] ?? 400, h: parts[3] ?? 400 }
  })

  const ghostSegments = computed<Segment[] | null>(() => {
    if (history.past.length === 0 || activePathIndex.value === null) return null
    const activePast = history.past[history.past.length - 1]
      .filter((el): el is PathElement => el.kind === 'path')[activePathIndex.value]
    return activePast?.segments ?? null
  })

  const activeD = computed(() => activePath.value ? segmentsToD(activePath.value.segments) : '')

  // ---- helpers ----

  function getActiveSegments(): Segment[] {
    return activePath.value?.segments ?? []
  }

  function setActiveSegments(segs: Segment[]) {
    const path = activePath.value
    if (!path || !document.value) return
    const idx = document.value.elements.indexOf(path)
    if (idx === -1) return
    document.value.elements[idx] = { ...path, segments: segs }
  }

  // ---- actions ----

  function loadSvg(svgString: string) {
    const doc = parseSvg(svgString)
    document.value = doc
    history.past = []
    history.future = []
    selection.value = null
    viewport.value = { scale: 1, translate: { x: 0, y: 0 } }
    // activePathIndex = index in pathElements (already filtered to kind:'path')
    const pathCount = doc.elements.filter((el) => el.kind === 'path').length
    activePathIndex.value = pathCount > 0 ? 0 : null
  }

  function setActivePath(index: number) {
    activePathIndex.value = index
    selection.value = null
  }

  function setSelection(sel: Selection) {
    selection.value = sel
  }

  function pushHistory() {
    if (!document.value) return
    const snapshot = JSON.parse(JSON.stringify(document.value.elements)) as SvgElement[]
    history.past.push(snapshot)
    if (history.past.length > 50) history.past.shift()
    history.future = []
  }

  function undo() {
    if (history.past.length === 0 || !document.value) return
    const prev = history.past[history.past.length - 1]
    const current = JSON.parse(JSON.stringify(document.value.elements)) as SvgElement[]
    history.future = [current, ...history.future].slice(0, 50)
    history.past = history.past.slice(0, -1)
    document.value = { ...document.value, elements: prev }
    selection.value = null
  }

  function redo() {
    if (history.future.length === 0 || !document.value) return
    const next = history.future[0]
    const current = JSON.parse(JSON.stringify(document.value.elements)) as SvgElement[]
    history.past = [...history.past.slice(-49), current]
    history.future = history.future.slice(1)
    document.value = { ...document.value, elements: next }
    selection.value = null
  }

  function moveNodeAction(segIndex: number, newPt: Point) {
    setActiveSegments(moveNode(getActiveSegments(), segIndex, newPt))
  }

  function moveHandleInAction(segIndex: number, newPt: Point) {
    setActiveSegments(moveHandleIn(getActiveSegments(), segIndex, newPt))
  }

  function moveHandleOutAction(segIndex: number, newPt: Point) {
    setActiveSegments(moveHandleOut(getActiveSegments(), segIndex, newPt))
  }

  function addNodeAction(segIndex: number, t: number) {
    setActiveSegments(addNodeAt(getActiveSegments(), segIndex, t))
  }

  function deleteNodeAction(segIndex: number) {
    if (segIndex === 0) return
    setActiveSegments(deleteNode(getActiveSegments(), segIndex))
    selection.value = null
  }

  function nudgeSelection(dx: number, dy: number) {
    const sel = selection.value
    if (!sel) return
    const segs = getActiveSegments()
    const seg = segs[sel.segIndex]
    if (!seg) return

    pushHistory()

    if (sel.type === 'node') {
      if (seg.type === 'M' || seg.type === 'L' || seg.type === 'C' || seg.type === 'Q') {
        setActiveSegments(moveNode(segs, sel.segIndex, {
          x: seg.point.x + dx,
          y: seg.point.y + dy,
        }))
      }
    } else if (sel.type === 'handle-in') {
      if (seg.type === 'C') {
        setActiveSegments(moveHandleIn(segs, sel.segIndex, {
          x: seg.handleIn.x + dx,
          y: seg.handleIn.y + dy,
        }))
      } else if (seg.type === 'Q') {
        setActiveSegments(moveHandleIn(segs, sel.segIndex, {
          x: seg.control.x + dx,
          y: seg.control.y + dy,
        }))
      }
    } else if (sel.type === 'handle-out') {
      if (seg.type === 'C') {
        setActiveSegments(moveHandleOut(segs, sel.segIndex, {
          x: seg.handleOut.x + dx,
          y: seg.handleOut.y + dy,
        }))
      } else if (seg.type === 'Q') {
        setActiveSegments(moveHandleOut(segs, sel.segIndex, {
          x: seg.control.x + dx,
          y: seg.control.y + dy,
        }))
      }
    }
  }

  function updateSvg(svgString: string) {
    try {
      const doc = parseSvg(svgString)
      document.value = doc
      selection.value = null
    } catch {
      // ignore parse errors (user may be mid-edit)
    }
  }

  function panViewport(dx: number, dy: number) {
    viewport.value = {
      ...viewport.value,
      translate: {
        x: viewport.value.translate.x + dx,
        y: viewport.value.translate.y + dy,
      },
    }
  }

  function zoomViewport(deltaY: number, cx: number, cy: number) {
    const ZOOM_SPEED = 0.001
    const { scale, translate: { x: tx, y: ty } } = viewport.value
    const factor = 1 - Math.sign(deltaY) * Math.min(Math.abs(deltaY) * ZOOM_SPEED, 0.1)
    const newScale = Math.max(0.1, Math.min(50, scale * factor))
    const newTx = cx - (cx - tx) * (newScale / scale)
    const newTy = cy - (cy - ty) * (newScale / scale)
    viewport.value = { scale: newScale, translate: { x: newTx, y: newTy } }
  }

  return {
    document,
    activePathIndex,
    selection,
    viewport,
    history,
    activePath,
    activeD,
    viewBox,
    origViewBoxSize,
    ghostSegments,
    pathElements,
    loadSvg,
    updateSvg,
    setActivePath,
    setSelection,
    pushHistory,
    undo,
    redo,
    moveNode: moveNodeAction,
    moveHandleIn: moveHandleInAction,
    moveHandleOut: moveHandleOutAction,
    addNode: addNodeAction,
    deleteNode: deleteNodeAction,
    nudgeSelection,
    panViewport,
    zoomViewport,
  }
})
