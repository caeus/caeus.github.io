import { z } from 'zod'

const Dep = z.string()

const Copy = z.union([
  z.object({ from: z.string(), src: z.string(), dest: z.string() }).readonly(),
  z.object({ src: z.string(), dest: z.string() }).readonly(),
])
export type Copy = z.infer<typeof Copy>

const Step = z.union([
  z.object({ RUN: z.string() }).readonly(),
  z.object({ COPY: Copy }).readonly(),
  z.object({ WORKDIR: z.string() }).readonly(),
  z.object({ ENV: z.record(z.string(), z.string()).readonly() }).readonly(),
  z.object({ ARG: z.string() }).readonly(),
  z.object({ ENTRYPOINT: z.array(z.string()).readonly() }).readonly(),
  z.object({ CMD: z.array(z.string()).readonly() }).readonly(),
])
export type Step = z.infer<typeof Step>

const From = z.union([
  z.object({ image: z.string() }).readonly(),
  z.object({ target: z.string() }).readonly(),
])
export type From = z.infer<typeof From>

export const Run = z.object({
  FROM: From,
  steps: z.array(Step).readonly().default([]),
}).readonly()
export interface Run extends z.infer<typeof Run> {}

const Target = z.object({
  deps: z.array(Dep).readonly().default([]),
  run: Run,
  output: z.array(z.string()).readonly().optional(),
  materialize: z.literal(true).optional(),
  exports: z.array(z.string()).readonly().optional(),
}).readonly()
export interface Target extends z.infer<typeof Target> {}

const Suite = z.record(z.string(), Target).readonly()
export interface Suite extends z.infer<typeof Suite> {}

export const ProjectFile = z.record(z.string(), Suite).readonly()
export interface ProjectFile extends z.infer<typeof ProjectFile> {}
