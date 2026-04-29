import type { Point } from '../data/pathString'

export function screenToSvg(svgEl: SVGSVGElement, clientX: number, clientY: number): Point {
  const ctm = svgEl.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const inv = ctm.inverse()
  const pt = svgEl.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const result = pt.matrixTransform(inv)
  return { x: result.x, y: result.y }
}
