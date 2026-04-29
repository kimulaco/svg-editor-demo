import { segmentsToD } from './pathString'
import type { SvgDocument, PathElement } from './parse'

export function serializeSvg(doc: SvgDocument): string {
  const attrStr = Object.entries(doc.rootAttrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')

  const childrenStr = [
    doc.defs,
    ...doc.elements.map((el) => {
      if (el.kind === 'other') return el.raw
      const path = el as PathElement
      const d = segmentsToD(path.segments)
      const elAttrStr = Object.entries(path.attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      return `<path ${elAttrStr} d="${d}"/>`
    }),
  ]
    .filter(Boolean)
    .join('\n  ')

  return `<svg ${attrStr}>\n  ${childrenStr}\n</svg>`
}
