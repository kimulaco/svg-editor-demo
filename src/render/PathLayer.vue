<template>
  <g>
    <!-- all paths -->
    <path
      v-for="(el, i) in store.pathElements"
      :key="el.id"
      :d="segmentsToD(el.segments)"
      :fill="el.attrs.fill ?? 'none'"
      :stroke="el.attrs.stroke && el.attrs.stroke !== 'none' ? el.attrs.stroke : '#666'"
      :stroke-width="el.attrs['stroke-width'] ? Number(el.attrs['stroke-width']) / scale : 0.5 / scale"
      :opacity="el.attrs.opacity ?? '1'"
      :style="{ cursor: i === store.activePathIndex ? 'default' : 'pointer' }"
      @click="() => store.setActivePath(i)"
    />

    <!-- active path overlay -->
    <template v-if="activePath">
      <!-- selection indicator -->
      <path
        :d="activeD"
        fill="none"
        stroke="#3378d8"
        :stroke-width="1.5 / scale"
        :stroke-dasharray="`${4/scale} ${3/scale}`"
        pointer-events="none"
      />

      <!-- ghost layer -->
      <GhostLayer />

      <!-- wide transparent hit area for double-click add node -->
      <path
        ref="hitPathRef"
        :d="activeD"
        fill="none"
        stroke="transparent"
        :stroke-width="12 / scale"
        style="cursor: crosshair"
        @dblclick="onPathDblClick"
      />

      <!-- handle lines -->
      <template v-for="(item, i) in overlayItems" :key="`line-${i}`">
        <line
          v-if="item.handleIn"
          :x1="item.anchor.x" :y1="item.anchor.y"
          :x2="item.handleIn.x" :y2="item.handleIn.y"
          stroke="#3378d8"
          :stroke-width="1 / scale"
          :stroke-dasharray="`${3/scale} ${2/scale}`"
          pointer-events="none"
        />
        <line
          v-if="item.handleOut"
          :x1="item.anchor.x" :y1="item.anchor.y"
          :x2="item.handleOut.x" :y2="item.handleOut.y"
          stroke="#3378d8"
          :stroke-width="1 / scale"
          :stroke-dasharray="`${3/scale} ${2/scale}`"
          pointer-events="none"
        />
      </template>

      <!-- anchors -->
      <rect
        v-for="(item, i) in overlayItems"
        :key="`anchor-${i}`"
        :x="item.anchor.x - anchorHalf"
        :y="item.anchor.y - anchorHalf"
        :width="anchorHalf * 2"
        :height="anchorHalf * 2"
        :fill="isNodeSelected(item.segIndex) ? '#3378d8' : '#fff'"
        :stroke="'#3378d8'"
        :stroke-width="1.5 / scale"
        style="cursor: move"
        @pointerdown="(e: PointerEvent) => drag.onAnchorPointerDown(e, { type: 'node', segIndex: item.segIndex })"
      />

      <!-- handle-in circles -->
      <circle
        v-for="(item, i) in itemsWithHandleIn"
        :key="`hin-${i}`"
        :cx="item.handleIn!.x"
        :cy="item.handleIn!.y"
        :r="handleR"
        :fill="isHandleSelected('handle-in', item.segIndex) ? '#ff6b35' : '#3378d8'"
        stroke="#fff"
        :stroke-width="1 / scale"
        style="cursor: move"
        @pointerdown="(e: PointerEvent) => drag.onAnchorPointerDown(e, { type: 'handle-in', segIndex: item.segIndex })"
      />

      <!-- handle-out circles -->
      <circle
        v-for="(item, i) in itemsWithHandleOut"
        :key="`hout-${i}`"
        :cx="item.handleOut!.x"
        :cy="item.handleOut!.y"
        :r="handleR"
        :fill="isHandleSelected('handle-out', item.segIndex) ? '#ff6b35' : '#3378d8'"
        stroke="#fff"
        :stroke-width="1 / scale"
        style="cursor: move"
        @pointerdown="(e: PointerEvent) => drag.onAnchorPointerDown(e, { type: 'handle-out', segIndex: item.segIndex })"
      />
    </template>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../state/store'
import { segmentsToD, segmentToD } from '../data/pathString'
import type { Point } from '../data/pathString'
import GhostLayer from './GhostLayer.vue'
import type { DragTarget } from '../interaction/useDrag'
import { screenToSvg } from '../interaction/coords'

const props = defineProps<{
  drag: {
    onAnchorPointerDown: (e: PointerEvent, target: DragTarget) => void
  }
  svgRef: SVGSVGElement | null
}>()

const store = useEditorStore()
const hitPathRef = ref<SVGPathElement | null>(null)

const scale = computed(() => store.viewport.scale)
const baseUnit = computed(() => {
  const { w, h } = store.origViewBoxSize
  return Math.min(w, h) / 100 / scale.value
})
const anchorHalf = computed(() => baseUnit.value)
const handleR = computed(() => baseUnit.value * 0.875)

const activePath = computed(() => store.activePath)
const activeD = computed(() => activePath.value ? segmentsToD(activePath.value.segments) : '')

interface OverlayItem {
  segIndex: number
  anchor: Point
  handleIn: Point | null
  handleOut: Point | null
}

const overlayItems = computed<OverlayItem[]>(() => {
  const path = activePath.value
  if (!path) return []
  const segs = path.segments
  const items: OverlayItem[] = []

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    if (seg.type === 'Z') continue

    const anchor = seg.point
    let handleIn: Point | null = null
    let handleOut: Point | null = null

    if (seg.type === 'C') {
      handleIn = seg.handleIn
      handleOut = seg.handleOut
    } else if (seg.type === 'Q') {
      handleIn = seg.control
      handleOut = seg.control
    }

    items.push({ segIndex: i, anchor, handleIn, handleOut })
  }

  return items
})

const itemsWithHandleIn = computed(() => overlayItems.value.filter(it => it.handleIn))
const itemsWithHandleOut = computed(() => overlayItems.value.filter(it => it.handleOut))

function isNodeSelected(segIndex: number): boolean {
  const sel = store.selection
  return sel?.type === 'node' && sel.segIndex === segIndex
}

function isHandleSelected(type: 'handle-in' | 'handle-out', segIndex: number): boolean {
  const sel = store.selection
  return sel?.type === type && sel.segIndex === segIndex
}

function onPathDblClick(e: MouseEvent) {
  if (!props.svgRef || !hitPathRef.value) return
  e.stopPropagation()

  const svgPt = screenToSvg(props.svgRef, e.clientX, e.clientY)
  const { segIndex, t } = findClosestT(hitPathRef.value, svgPt.x, svgPt.y)

  store.pushHistory()
  store.addNode(segIndex, t)
}

function findClosestT(pathEl: SVGPathElement, svgX: number, svgY: number): { segIndex: number; t: number } {
  const total = pathEl.getTotalLength()
  const SAMPLES = 200
  let bestLen = 0
  let bestDist = Infinity

  for (let i = 0; i <= SAMPLES; i++) {
    const len = (i / SAMPLES) * total
    const p = pathEl.getPointAtLength(len)
    const dist = Math.hypot(p.x - svgX, p.y - svgY)
    if (dist < bestDist) {
      bestDist = dist
      bestLen = len
    }
  }

  // refine with binary search
  let lo = Math.max(0, bestLen - total / SAMPLES)
  let hi = Math.min(total, bestLen + total / SAMPLES)
  for (let iter = 0; iter < 15; iter++) {
    const mid = (lo + hi) / 2
    const pLo = pathEl.getPointAtLength(lo)
    const pHi = pathEl.getPointAtLength(hi)
    const dLo = Math.hypot(pLo.x - svgX, pLo.y - svgY)
    const dHi = Math.hypot(pHi.x - svgX, pHi.y - svgY)
    if (dLo < dHi) hi = mid
    else lo = mid
  }
  const finalLen = (lo + hi) / 2

  // map length → segIndex + t
  const segs = activePath.value?.segments ?? []
  let accumulated = 0
  let prevPt = { x: 0, y: 0 }
  const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')

  for (let si = 0; si < segs.length; si++) {
    const seg = segs[si]
    if (seg.type === 'Z' || seg.type === 'M') {
      if (seg.type === 'M') prevPt = seg.point
      continue
    }

    tempPath.setAttribute('d', `M ${prevPt.x} ${prevPt.y} ` + segmentToD(seg))
    const segLen = tempPath.getTotalLength()

    if (accumulated + segLen >= finalLen) {
      const t = (finalLen - accumulated) / segLen
      return { segIndex: si, t: Math.max(0.01, Math.min(0.99, t)) }
    }
    accumulated += segLen
    if (seg.type === 'C' || seg.type === 'Q' || seg.type === 'L') {
      prevPt = seg.point
    }
  }

  return { segIndex: Math.max(1, segs.length - 1), t: 0.5 }
}
</script>
