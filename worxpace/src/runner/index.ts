import type { ModuleDef } from '../project/schema.js'
import { runTarget, type TargetRunnerDeps } from './target-runner.js'

export class FQT {
  constructor(
    readonly module: string,
    readonly suite: string,
    readonly target: string,
  ) {}

  toString(): string {
    return `${this.module}#${this.suite}#${this.target}`
  }

  toJSON(): string {
    return this.toString()
  }

  static parse(raw: string, context?: { module: string; suite?: string }): FQT {
    const parts = raw.split('#')
    if (parts.length === 3) return new FQT(parts[0]!, parts[1]!, parts[2]!)
    if (parts.length === 2) {
      if (!context?.module) throw new Error(`Module required when only suite#target is provided: ${raw}`)
      return new FQT(context.module, parts[0]!, parts[1]!)
    }
    if (parts.length === 1) {
      if (!context?.module) throw new Error(`Module required when only target is provided: ${raw}`)
      if (!context.suite) throw new Error(`Suite required when only target is provided: ${raw}`)
      return new FQT(context.module, context.suite, parts[0]!)
    }
    throw new Error(`Invalid FQT: ${raw}`)
  }
}

export interface TaskResult {
  readonly fqt: FQT
  readonly imageTag: string
  readonly imageDigest: string
  readonly export?: Readonly<Record<string, string>>
}

export type Runner = (fqt: string) => Promise<TaskResult>

export { type TargetRunnerDeps }

export function buildRunner(root: string, projects: ReadonlyMap<string, ModuleDef>, deps: TargetRunnerDeps): Runner {
  const memo = new Map<string, Promise<TaskResult>>()

  const run = (raw: string, trace: readonly string[] = []): Promise<TaskResult> => {
    const cached = memo.get(raw)
    if (cached) return cached

    if (trace.includes(raw)) throw new Error(`Circular dependency: ${[...trace, raw].join(' -> ')}`)

    const fqt = FQT.parse(raw)
    if (!fqt.suite || !fqt.target) throw new Error(`Invalid FQT: ${raw}`)

    const target = projects.get(fqt.module)?.[fqt.suite]?.[fqt.target]
    if (!target) throw new Error(`Unknown target: ${raw}`)

    const nextTrace = [...trace, raw]
    const promise = Promise.all(
      target.deps.map(d => run(FQT.parse(d, { module: fqt.module, suite: fqt.suite }).toString(), nextTrace))
    ).then(depResults => runTarget(fqt, target, depResults, root, deps))

    memo.set(raw, promise)
    return promise
  }

  return (raw: string) => run(raw)
}
