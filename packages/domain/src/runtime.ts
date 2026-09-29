import type { Language } from './types.js'

export interface Ctx {
  now: string
  language: Language
  presentationMs: number
  pipelineMs: number
  animationMs: number
  graceMs: number
}
