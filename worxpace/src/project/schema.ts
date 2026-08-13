import { z } from 'zod'

const Dep = z.string()

const Step = z.union([
  z.object({ RUN: z.string() }).readonly(),
  z.object({ COPY: z.string() }).readonly(),
  z.object({ WORKDIR: z.string() }).readonly(),
  z.object({ ENV: z.record(z.string(), z.string()).readonly() }).readonly(),
  z.object({ ARG: z.string() }).readonly(),
  z.object({ ENTRYPOINT: z.array(z.string()).readonly() }).readonly(),
  z.object({ CMD: z.array(z.string()).readonly() }).readonly(),
])
export type Step = z.infer<typeof Step>

export const Impl = z.object({
  FROM: z.string(),
  steps: z.array(Step).readonly().default([]),
}).readonly()
export interface Impl extends z.infer<typeof Impl> {}

const Target = z.object({
  deps: z.array(Dep).readonly().default([]),
  impl: Impl,
  output: z.array(z.string()).readonly().optional(),
  materialize: z.literal(true).optional(),
}).readonly()
export interface Target extends z.infer<typeof Target> {}

const Suite = z.record(z.string(), Target).readonly()
export interface Suite extends z.infer<typeof Suite> {}

export const ProjectFile = z.record(z.string(), Suite).readonly()
export interface ProjectFile extends z.infer<typeof ProjectFile> {}
