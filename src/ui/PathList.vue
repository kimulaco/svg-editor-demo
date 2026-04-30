<template>
  <div class="path-list">
    <div class="path-list-header">PATHS</div>
    <div
      v-if="!store.document"
      class="path-list-empty"
    >
      SVGを読み込んでください
    </div>
    <div
      v-for="(el, i) in store.pathElements"
      :key="el.id"
      class="path-item"
      :class="{ active: store.activePathIndex === i }"
      @click="() => store.setActivePath(i)"
    >
      <div class="swatches">
        <label class="swatch-label" title="fill" @click.stop>
          <div class="swatch" :style="{ background: fillColor(el) }" />
          <input
            type="color"
            class="color-input"
            :value="toHex(el.attrs.fill)"
            @change="(e) => onColorChange(i, 'fill', (e.target as HTMLInputElement).value)"
          />
        </label>
        <label class="swatch-label" title="stroke" @click.stop>
          <div class="swatch" :style="{ background: strokeColor(el) }" />
          <input
            type="color"
            class="color-input"
            :value="toHex(el.attrs.stroke)"
            @change="(e) => onColorChange(i, 'stroke', (e.target as HTMLInputElement).value)"
          />
        </label>
      </div>
      <span class="path-label">path[{{ i }}]</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../state/store'
import type { PathElement } from '../data/parse'

const store = useEditorStore()

function fillColor(el: PathElement): string {
  const v = el.attrs.fill
  if (!v || v === 'none') return 'transparent'
  return v
}

function strokeColor(el: PathElement): string {
  const v = el.attrs.stroke
  if (!v || v === 'none') return 'transparent'
  return v
}

function toHex(color: string | undefined): string {
  if (!color || color === 'none') return '#000000'
  return color.startsWith('#') ? color : '#000000'
}

function onColorChange(pathIndex: number, attr: 'fill' | 'stroke', value: string) {
  store.updatePathAttr(pathIndex, attr, value)
}
</script>

<style scoped>
.path-list {
  width: 160px;
  background: #252526;
  border-right: 1px solid #3c3c3c;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.path-list-header {
  font-size: 10px;
  color: #888;
  letter-spacing: 0.08em;
  padding: 8px 10px 4px;
  border-bottom: 1px solid #3c3c3c;
}

.path-list-empty {
  font-size: 11px;
  color: #555;
  padding: 12px 10px;
}

.path-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
  user-select: none;
}

.path-item:hover {
  background: #2a2d2e;
}

.path-item.active {
  background: #094771;
  color: #fff;
}

.swatches {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

.swatch-label {
  display: block;
  cursor: crosshair;
  position: relative;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #555;
}

.color-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.swatch-label:focus-within .swatch {
  outline: 2px solid #3378d8;
  outline-offset: 1px;
}

.path-label {
  font-family: monospace;
  font-size: 11px;
}
</style>
