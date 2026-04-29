import svgpath from 'svgpath'
import { dToSegments } from './pathString'
import type { Segment } from './pathString'

export interface PathElement {
  kind: 'path'
  id: string
  attrs: Record<string, string>
  segments: Segment[]
}

export interface RawElement {
  kind: 'other'
  raw: string
}

export type SvgElement = PathElement | RawElement

export interface SvgDocument {
  rootAttrs: Record<string, string>
  defs: string
  elements: SvgElement[]
}

const NON_RENDER_TAGS = new Set(['clipPath', 'mask', 'symbol', 'defs', 'filter', 'marker'])

// Collect transforms from innermost parent to outermost (for svgpath chaining order)
function getAncestorTransforms(el: Element, root: Element): string[] {
  const transforms: string[] = []
  let cur: Element | null = el.parentElement
  while (cur && cur !== root) {
    const t = cur.getAttribute('transform')
    if (t) transforms.push(t)
    cur = cur.parentElement
  }
  return transforms  // [innermost, ..., outermost]
}

function applyTransforms(rawD: string, transforms: string[]): string {
  if (transforms.length === 0) return rawD
  let p = svgpath(rawD)
  for (const t of transforms) {
    p = p.transform(t)
  }
  return p.toString()
}

function collectPaths(
  root: Element,
  svgRoot: Element,
  result: PathElement[],
  counter: { n: number },
): void {
  for (const child of root.children) {
    const tag = child.tagName

    if (NON_RENDER_TAGS.has(tag)) continue

    if (tag === 'path') {
      {
        const rawD = child.getAttribute('d') ?? ''
        // Collect transforms: element's own + all ancestor <g> transforms
        const ownTransform = child.getAttribute('transform')
        const ancestorTransforms = getAncestorTransforms(child, svgRoot)
        const allTransforms = ownTransform
          ? [ownTransform, ...ancestorTransforms]
          : ancestorTransforms
        const transformedD = applyTransforms(rawD, allTransforms)
        // Normalize: arc→cubic, absolute coords
        const normalizedD = svgpath(transformedD).unarc().abs().toString()
        const segments = dToSegments(normalizedD)
        const attrs: Record<string, string> = {}
        for (const attr of child.attributes) {
          if (attr.name !== 'd' && attr.name !== 'transform') attrs[attr.name] = attr.value
        }
        const id = child.getAttribute('id') ?? `path-${counter.n}`
        counter.n++
        result.push({ kind: 'path', id, attrs, segments })
      }
    } else {
      // Recurse into <g>, <svg>, etc.
      collectPaths(child, svgRoot, result, counter)
    }
  }
}

export function parseSvg(svgString: string): SvgDocument {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(svgString, 'image/svg+xml')
  const svgEl = xmlDoc.documentElement

  const parseError = svgEl.querySelector('parsererror')
  if (parseError) throw new Error('Invalid SVG: ' + parseError.textContent)

  const rootAttrs: Record<string, string> = {}
  for (const attr of svgEl.attributes) {
    rootAttrs[attr.name] = attr.value
  }

  const defsEl = svgEl.querySelector(':scope > defs')
  const defs = defsEl?.outerHTML ?? ''

  const pathElements: PathElement[] = []
  const counter = { n: 0 }
  collectPaths(svgEl, svgEl, pathElements, counter)

  // Preserve non-path top-level elements for serialization reference
  const rawElements: RawElement[] = []
  for (const child of svgEl.children) {
    const tag = child.tagName.toLowerCase()
    if (tag !== 'path' && tag !== 'defs') {
      rawElements.push({ kind: 'other', raw: child.outerHTML })
    }
  }

  // paths first so pathElements[i] === elements[i] (no raw elements before paths)
  const elements: SvgElement[] = [...pathElements, ...rawElements]

  return { rootAttrs, defs, elements }
}
