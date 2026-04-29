import { ref } from 'vue'
import type { Ref } from 'vue'
import { useEditorStore } from '../state/store'
import { screenToSvg } from './coords'
import type { Point, Segment } from '../data/pathString'

export type DragTarget =
  | { type: 'node'; segIndex: number }
  | { type: 'handle-in'; segIndex: number }
  | { type: 'handle-out'; segIndex: number }

interface DragState {
  startX: number
  startY: number
  originalPt: Point
  target: DragTarget
}

function getPointForTarget(segs: Segment[], target: DragTarget): Point {
  const seg = segs[target.segIndex]
  if (!seg) return { x: 0, y: 0 }

  if (target.type === 'node') {
    if (seg.type === 'M' || seg.type === 'L' || seg.type === 'C' || seg.type === 'Q') {
      return { ...seg.point }
    }
  } else if (target.type === 'handle-in') {
    if (seg.type === 'C') return { ...seg.handleIn }
    if (seg.type === 'Q') return { ...seg.control }
  } else if (target.type === 'handle-out') {
    if (seg.type === 'C') return { ...seg.handleOut }
    if (seg.type === 'Q') return { ...seg.control }
  }
  return { x: 0, y: 0 }
}

export function useDrag(svgRef: Ref<SVGSVGElement | null>) {
  const store = useEditorStore()
  const dragging = ref<DragState | null>(null)

  function onAnchorPointerDown(e: PointerEvent, target: DragTarget) {
    if (e.button !== 0) return
    svgRef.value?.setPointerCapture(e.pointerId)
    store.pushHistory()

    const segs = store.activePath?.segments ?? []
    const svgPt = screenToSvg(svgRef.value!, e.clientX, e.clientY)
    dragging.value = {
      startX: svgPt.x,
      startY: svgPt.y,
      originalPt: getPointForTarget(segs, target),
      target,
    }

    store.setSelection({ type: target.type, pathIndex: store.activePathIndex!, segIndex: target.segIndex })
    e.stopPropagation()
  }

  function onCanvasPointerMove(e: PointerEvent) {
    if (!dragging.value || !svgRef.value) return
    const svgPt = screenToSvg(svgRef.value, e.clientX, e.clientY)
    const newX = dragging.value.originalPt.x + (svgPt.x - dragging.value.startX)
    const newY = dragging.value.originalPt.y + (svgPt.y - dragging.value.startY)
    const newPt: Point = { x: newX, y: newY }
    const { target } = dragging.value

    if (target.type === 'node') {
      store.moveNode(target.segIndex, newPt)
    } else if (target.type === 'handle-in') {
      store.moveHandleIn(target.segIndex, newPt)
    } else {
      store.moveHandleOut(target.segIndex, newPt)
    }
  }

  function onCanvasPointerUp() {
    dragging.value = null
  }

  return { onAnchorPointerDown, onCanvasPointerMove, onCanvasPointerUp, isDragging: dragging }
}
