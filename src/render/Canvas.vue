<template>
  <div class="canvas-wrapper">
    <svg
      ref="svgRef"
      :viewBox="store.viewBox"
      :style="{
        width: '100%',
        height: '100%',
        userSelect: 'none',
        cursor: isPanning ? 'grabbing' : 'grab',
        background: '#1e1e1e',
      }"
      @pointerdown="onViewportPointerDown"
      @pointermove="onAllPointerMove"
      @pointerup="onAllPointerUp"
    >
      <!-- grid -->
      <defs>
        <pattern id="grid-small" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#333" stroke-width="0.5" />
        </pattern>
        <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#grid-small)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#444" stroke-width="1" />
        </pattern>
      </defs>
      <rect
        :x="store.viewport.translate.x"
        :y="store.viewport.translate.y"
        :width="store.origViewBoxSize.w / store.viewport.scale"
        :height="store.origViewBoxSize.h / store.viewport.scale"
        fill="url(#grid-large)"
        pointer-events="none"
      />

      <PathLayer :drag="drag" :svg-ref="svgRef" />
    </svg>

    <!-- HUD overlays (HTML, not SVG) -->
<div v-if="store.activePath" class="canvas-hud canvas-hud--bl d-preview">
      {{ store.activeD }}
    </div>
    <div class="canvas-hud canvas-hud--br zoom-controls">
      <button @click="store.zoomOut">−</button>
      <button @click="store.resetZoom">{{ Math.round(store.viewport.scale * 100) }}%</button>
      <button @click="store.zoomIn">+</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../state/store'
import { useDrag } from '../interaction/useDrag'
import { useViewport } from '../interaction/useViewport'
import PathLayer from './PathLayer.vue'

const store = useEditorStore()
const svgRef = ref<SVGSVGElement | null>(null)

const drag = useDrag(svgRef)
const viewport = useViewport(svgRef)
const { isPanning } = viewport

function onViewportPointerDown(e: PointerEvent) {
  viewport.onPointerDown(e)
  if (e.target === svgRef.value) {
    store.setSelection(null)
  }
}

function onAllPointerMove(e: PointerEvent) {
  drag.onCanvasPointerMove(e)
  viewport.onPointerMove(e)
}

function onAllPointerUp(_e: PointerEvent) {
  drag.onCanvasPointerUp()
  viewport.onPointerUp()
}
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-hud {
  position: absolute;
  background: rgba(30, 30, 30, 0.85);
  color: #ccc;
  font-size: 11px;
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 3px;
  pointer-events: none;
}

.canvas-hud--bl {
  bottom: 8px;
  left: 8px;
  right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.canvas-hud--br {
  bottom: 8px;
  right: 8px;
  left: auto;
}

.zoom-controls {
  display: flex;
  gap: 2px;
  padding: 2px;
  pointer-events: auto;
}

.zoom-controls button {
  background: rgba(60, 60, 60, 0.9);
  color: #ccc;
  border: 1px solid #555;
  border-radius: 3px;
  padding: 2px 8px;
  font-size: 12px;
  font-family: monospace;
  cursor: pointer;
  line-height: 1.4;
}

.zoom-controls button:hover {
  background: rgba(80, 80, 80, 0.95);
  color: #fff;
}

.d-preview {
  font-size: 10px;
  color: #8abcf0;
}
</style>
