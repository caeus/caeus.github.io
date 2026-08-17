export interface Copy {
  readonly from?: string
  readonly src: string
  readonly dest: string
}

export type Step =
  | { readonly RUN: string }
  | { readonly COPY: Copy }
  | { readonly WORKDIR: string }
  | { readonly ENV: Readonly<Record<string, string>> }
  | { readonly ARG: string }
  | { readonly ENTRYPOINT: readonly string[] }
  | { readonly CMD: readonly string[] }

export interface Run {
  readonly FROM: string
  readonly steps: readonly Step[]
}

export type RunFn = (deps: Readonly<Record<string, string>>) => Run

export interface Target {
  readonly deps: readonly string[]
  readonly run: RunFn
  readonly exports?: readonly string[]
  readonly materialize?: true
  readonly output?: readonly string[]
}

export type Suite = Readonly<Record<string, Target>>
export type ProjectFile = Readonly<Record<string, Suite>>
