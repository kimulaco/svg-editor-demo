import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { useEditorStore } from '../state/store'
import { screenToSvg } from './coords'

export function useViewport(svgRef: Ref<SVGSVGElement | null>) {
  const store = useEditorStore()
  const spaceDown = ref(false)
  const isPanning = ref(false)
  const lastPanClient = ref({ x: 0, y: 0 })

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    if (!svgRef.value) return
    const svgPt = screenToSvg(svgRef.value, e.clientX, e.clientY)
    store.zoomViewport(e.deltaY, svgPt.x, svgPt.y)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
      spaceDown.value = true
      e.preventDefault()
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      spaceDown.value = false
      isPanning.value = false
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (!spaceDown.value || e.button !== 0) return
    isPanning.value = true
    lastPanClient.value = { x: e.clientX, y: e.clientY }
    svgRef.value?.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }

  function onPointerMove(e: PointerEvent) {
    if (!isPanning.value || !svgRef.value) return
    const dx = e.clientX - lastPanClient.value.x
    const dy = e.clientY - lastPanClient.value.y
    lastPanClient.value = { x: e.clientX, y: e.clientY }
    const scale = store.viewport.scale
    store.panViewport(-dx / scale, -dy / scale)
  }

  function onPointerUp() {
    isPanning.value = false
  }

  onMounted(() => {
    const el = svgRef.value
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  })

  onUnmounted(() => {
    const el = svgRef.value
    if (el) el.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  })

  return { onPointerDown, onPointerMove, onPointerUp, spaceDown, isPanning }
}
