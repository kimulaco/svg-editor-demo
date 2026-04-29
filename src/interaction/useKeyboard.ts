import { onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../state/store'

export function useKeyboard() {
  const store = useEditorStore()

  function handler(e: KeyboardEvent) {
    if (document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement) return

    const isMac = navigator.platform.toUpperCase().includes('MAC')
    const meta = isMac ? e.metaKey : e.ctrlKey

    if (meta && e.shiftKey && e.code === 'KeyZ') {
      store.redo()
      e.preventDefault()
      return
    }
    if (meta && e.code === 'KeyZ') {
      store.undo()
      e.preventDefault()
      return
    }

    if (e.code === 'Escape') {
      store.setSelection(null)
      return
    }

    const sel = store.selection
    if (e.code === 'Delete' || e.code === 'Backspace') {
      if (sel?.type === 'node') {
        store.deleteNode(sel.segIndex)
        e.preventDefault()
      }
      return
    }

    // Arrow key nudge
    const step = e.shiftKey ? 10 : 1
    let dx = 0, dy = 0
    if (e.code === 'ArrowLeft')  { dx = -step; e.preventDefault() }
    if (e.code === 'ArrowRight') { dx =  step; e.preventDefault() }
    if (e.code === 'ArrowUp')    { dy = -step; e.preventDefault() }
    if (e.code === 'ArrowDown')  { dy =  step; e.preventDefault() }
    if (dx !== 0 || dy !== 0) {
      store.nudgeSelection(dx, dy)
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
