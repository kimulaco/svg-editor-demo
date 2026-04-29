import { ref } from 'vue'
import type { Ref } from 'vue'
import { useEditorStore } from '../state/store'
import { screenToSvg } from './coords'

export function useViewport(svgRef: Ref<SVGSVGElement | null>) {
  const store = useEditorStore()
  const isPanning = ref(false)
  const lastPanClient = ref({ x: 0, y: 0 })

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    isPanning.value = true
    lastPanClient.value = { x: e.clientX, y: e.clientY }
    svgRef.value?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!isPanning.value || !svgRef.value) return
    const prev = screenToSvg(svgRef.value, lastPanClient.value.x, lastPanClient.value.y)
    const curr = screenToSvg(svgRef.value, e.clientX, e.clientY)
    lastPanClient.value = { x: e.clientX, y: e.clientY }
    store.panViewport(prev.x - curr.x, prev.y - curr.y)
  }

  function onPointerUp() {
    isPanning.value = false
  }

  return { onPointerDown, onPointerMove, onPointerUp, isPanning }
}
