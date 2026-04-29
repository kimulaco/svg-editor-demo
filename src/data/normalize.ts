import svgpath from 'svgpath'

export function normalizeD(raw: string): string {
  return svgpath(raw).unarc().abs().toString()
}
