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
  .tuple([z.object({ FROM: z.string() }).strict().readonly()])
  .rest(Step);
export type Run = z.infer<typeof Run>;

export type RunFn = (deps: Readonly<Record<string, string>>) => Run;

export const Target = z
  .object({
    deps: z.array(z.string()).readonly().default([]),
    run: z.custom<RunFn>((v) => typeof v === "function"),
    exports: z.array(z.string()).readonly().optional(),
  })
  .readonly();
export interface Target extends z.infer<typeof Target> {}

export const Suite = z.record(z.string(), Target).readonly();
export interface Suite extends z.infer<typeof Suite> {}

export const ModuleDef = z.record(z.string(), Suite).readonly();
export interface ModuleDef extends z.infer<typeof ModuleDef> {}
