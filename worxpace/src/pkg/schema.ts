import { z } from "zod";

export const Copy = z
  .object({ from: z.string().optional(), src: z.string(), dest: z.string() })
  .strict()
  .readonly();
export interface Copy extends z.infer<typeof Copy> {}

export const Step = z.union([
  z.object({ RUN: z.string() }).strict().readonly(),
  z.object({ COPY: Copy }).strict().readonly(),
  z.object({ WORKDIR: z.string() }).strict().readonly(),
  z.object({ ENV: z.record(z.string(), z.string()).readonly() }).strict().readonly(),
  z.object({ ARG: z.string() }).strict().readonly(),
  z.object({ ENTRYPOINT: z.array(z.string()).readonly() }).strict().readonly(),
  z.object({ CMD: z.array(z.string()).readonly() }).strict().readonly(),
]);
export type Step = z.infer<typeof Step>;

export const Run = z
  .object({
    FROM: z.string(),
    steps: z.array(Step).readonly(),
    IGNORE: z.array(z.string()).readonly(),
    EXPORT: z.record(z.string(), z.string()).readonly().optional(),
  })
  .readonly();
export interface Run extends z.infer<typeof Run> {}

export type RunFn = (deps: Readonly<Record<string, string>>) => Run;

export const TargetDef = z
  .object({
    deps: z.array(z.string()).readonly(),
    run: z.custom<RunFn>((v) => typeof v === "function"),
  })
  .readonly();
export interface TargetDef extends z.infer<typeof TargetDef> {}

export const FacetDef = z.record(z.string(), TargetDef).readonly();
export interface FacetDef extends z.infer<typeof FacetDef> {}

export const PackageDef = z.record(z.string(), FacetDef).readonly();
export interface PackageDef extends z.infer<typeof PackageDef> {}
