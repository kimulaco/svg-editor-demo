import type { Point, Segment } from './pathString'

function pt(x: number, y: number): Point {
  return { x, y }
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function moveNode(segs: Segment[], segIndex: number, newPt: Point): Segment[] {
  return segs.map((seg, i) => {
    if (i !== segIndex) return seg
    if (seg.type === 'M' || seg.type === 'L' || seg.type === 'C' || seg.type === 'Q') return { ...seg, point: newPt }
    return seg
  })
}

export function moveHandleIn(segs: Segment[], segIndex: number, newPt: Point): Segment[] {
  return segs.map((seg, i) => {
    if (i !== segIndex) return seg
    if (seg.type === 'C') return { ...seg, handleIn: newPt }
    if (seg.type === 'Q') return { ...seg, control: newPt }
    return seg
  })
}

export function moveHandleOut(segs: Segment[], segIndex: number, newPt: Point): Segment[] {
  return segs.map((seg, i) => {
    if (i !== segIndex) return seg
    if (seg.type === 'C') return { ...seg, handleOut: newPt }
    if (seg.type === 'Q') return { ...seg, control: newPt }
    return seg
  })
}

export function deleteNode(segs: Segment[], segIndex: number): Segment[] {
  if (segIndex === 0) return segs
  return segs.filter((_, i) => i !== segIndex)
}

function getAnchorPoint(segs: Segment[], i: number): Point {
  const seg = segs[i]
  if (seg.type === 'Z') {
    // Z closes to the last M point
    for (let j = i - 1; j >= 0; j--) {
      const s = segs[j]
      if (s.type === 'M') return s.point
    }
    return pt(0, 0)
  }
  if (seg.type === 'M' || seg.type === 'L' || seg.type === 'C' || seg.type === 'Q') {
    return seg.point
  }
  return pt(0, 0)
}

export function addNodeAt(segs: Segment[], segIndex: number, t: number): Segment[] {
  if (segIndex <= 0 || segIndex >= segs.length) return segs
  const seg = segs[segIndex]
  const prevPt = getAnchorPoint(segs, segIndex - 1)

  if (seg.type === 'Z' || seg.type === 'M') return segs

  if (seg.type === 'L') {
    const newPt = lerp(prevPt, seg.point, t)
    const before: Segment = { type: 'L', point: newPt }
    const after: Segment = { type: 'L', point: seg.point }
    return [...segs.slice(0, segIndex), before, after, ...segs.slice(segIndex + 1)]
  }

  if (seg.type === 'C') {
    // de Casteljau subdivision at t
    const p0 = prevPt
    const p1 = seg.handleOut
    const p2 = seg.handleIn
    const p3 = seg.point

    const q1 = lerp(p0, p1, t)
    const q2 = lerp(p1, p2, t)
    const q3 = lerp(p2, p3, t)
    const r1 = lerp(q1, q2, t)
    const r2 = lerp(q2, q3, t)
    const s = lerp(r1, r2, t)

    const first: Segment = { type: 'C', handleOut: q1, handleIn: r1, point: s }
    const second: Segment = { type: 'C', handleOut: r2, handleIn: q3, point: p3 }
    return [...segs.slice(0, segIndex), first, second, ...segs.slice(segIndex + 1)]
  }

  if (seg.type === 'Q') {
    const p0 = prevPt
    const p1 = seg.control
    const p2 = seg.point

    const q1 = lerp(p0, p1, t)
    const q2 = lerp(p1, p2, t)
    const s = lerp(q1, q2, t)

    const first: Segment = { type: 'Q', control: q1, point: s }
    const second: Segment = { type: 'Q', control: q2, point: p2 }
    return [...segs.slice(0, segIndex), first, second, ...segs.slice(segIndex + 1)]
  }

  return segs
}
