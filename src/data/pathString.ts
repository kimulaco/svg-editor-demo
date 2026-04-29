export type Point = { x: number; y: number }

export type Segment =
  | { type: 'M'; point: Point }
  | { type: 'L'; point: Point }
  | { type: 'C'; handleOut: Point; handleIn: Point; point: Point }
  | { type: 'Q'; control: Point; point: Point }
  | { type: 'Z' }

const TOKEN_RE = /[MLHVCSQTAZmlhvcsqtaz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g

function nums(tokens: string[], i: number, count: number): number[] {
  const result: number[] = []
  for (let j = 0; j < count; j++) {
    result.push(parseFloat(tokens[i + j] ?? '0'))
  }
  return result
}

export function dToSegments(d: string): Segment[] {
  const tokens = d.match(TOKEN_RE) ?? []
  const segments: Segment[] = []
  let i = 0
  let lastCmd = ''
  let lastPt: Point = { x: 0, y: 0 }
  let lastCtrl: Point | null = null  // for S→C and T→Q reflection

  while (i < tokens.length) {
    const token = tokens[i]
    const isCmd = /[A-Za-z]/.test(token)

    let cmd: string
    if (isCmd) {
      cmd = token.toUpperCase()
      lastCmd = token
      i++
    } else {
      // implicit repeat of last command (M→L, m→l)
      cmd = lastCmd.toUpperCase() === 'M' ? 'L' : lastCmd.toUpperCase()
    }

    switch (cmd) {
      case 'M': {
        const [x, y] = nums(tokens, i, 2); i += 2
        lastPt = { x, y }
        lastCtrl = null
        segments.push({ type: 'M', point: { x, y } })
        break
      }
      case 'L': {
        const [x, y] = nums(tokens, i, 2); i += 2
        lastPt = { x, y }
        lastCtrl = null
        segments.push({ type: 'L', point: { x, y } })
        break
      }
      case 'H': {
        const [x] = nums(tokens, i, 1); i += 1
        lastPt = { x, y: lastPt.y }
        lastCtrl = null
        segments.push({ type: 'L', point: { ...lastPt } })
        break
      }
      case 'V': {
        const [y] = nums(tokens, i, 1); i += 1
        lastPt = { x: lastPt.x, y }
        lastCtrl = null
        segments.push({ type: 'L', point: { ...lastPt } })
        break
      }
      case 'C': {
        const [x1, y1, x2, y2, x, y] = nums(tokens, i, 6); i += 6
        lastCtrl = { x: x2, y: y2 }
        lastPt = { x, y }
        segments.push({
          type: 'C',
          handleOut: { x: x1, y: y1 },
          handleIn: { x: x2, y: y2 },
          point: { x, y },
        })
        break
      }
      case 'S': {
        // reflect last C handleIn to get handleOut
        const [x2, y2, x, y] = nums(tokens, i, 4); i += 4
        const prevIsCS = lastCmd.toUpperCase() === 'C' || lastCmd.toUpperCase() === 'S'
        const x1: number = prevIsCS && lastCtrl ? 2 * lastPt.x - lastCtrl.x : lastPt.x
        const y1: number = prevIsCS && lastCtrl ? 2 * lastPt.y - lastCtrl.y : lastPt.y
        lastCtrl = { x: x2, y: y2 }
        lastPt = { x, y }
        segments.push({
          type: 'C',
          handleOut: { x: x1, y: y1 },
          handleIn: { x: x2, y: y2 },
          point: { x, y },
        })
        break
      }
      case 'Q': {
        const [x1, y1, x, y] = nums(tokens, i, 4); i += 4
        lastCtrl = { x: x1, y: y1 }
        lastPt = { x, y }
        segments.push({ type: 'Q', control: { x: x1, y: y1 }, point: { x, y } })
        break
      }
      case 'T': {
        // reflect last Q control
        const [x, y] = nums(tokens, i, 2); i += 2
        const prevIsQT = lastCmd.toUpperCase() === 'Q' || lastCmd.toUpperCase() === 'T'
        const x1: number = prevIsQT && lastCtrl ? 2 * lastPt.x - lastCtrl.x : lastPt.x
        const y1: number = prevIsQT && lastCtrl ? 2 * lastPt.y - lastCtrl.y : lastPt.y
        lastCtrl = { x: x1, y: y1 }
        lastPt = { x, y }
        segments.push({ type: 'Q', control: { x: x1, y: y1 }, point: { x, y } })
        break
      }
      case 'Z': {
        lastCtrl = null
        segments.push({ type: 'Z' })
        break
      }
      default:
        i++
        break
    }
  }

  return segments
}

const r3 = (v: number) => Math.round(v * 1000) / 1000

export function segmentToD(seg: Segment): string {
  switch (seg.type) {
    case 'M': return `M ${r3(seg.point.x)} ${r3(seg.point.y)}`
    case 'L': return `L ${r3(seg.point.x)} ${r3(seg.point.y)}`
    case 'C': return `C ${r3(seg.handleOut.x)} ${r3(seg.handleOut.y)} ${r3(seg.handleIn.x)} ${r3(seg.handleIn.y)} ${r3(seg.point.x)} ${r3(seg.point.y)}`
    case 'Q': return `Q ${r3(seg.control.x)} ${r3(seg.control.y)} ${r3(seg.point.x)} ${r3(seg.point.y)}`
    case 'Z': return 'Z'
  }
}

export function segmentsToD(segments: Segment[]): string {
  return segments.map(segmentToD).join(' ')
}
