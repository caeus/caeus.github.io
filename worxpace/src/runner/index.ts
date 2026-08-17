import type { ProjectFile } from '../project/schema.js'
import { runTarget, type TargetRunnerDeps } from './target-runner.js'


export interface TaskResult {
  readonly fqt: string
  readonly imageTag: string
  readonly imageDigest: string
}

export interface FullyQualifiedTarget {
  readonly module: string
  readonly suite: string
  readonly target: string
}

export function parseFqt(raw: string, context: { module: string; suite: string }): FullyQualifiedTarget {
  const parts = raw.split('#')
  if (parts.length === 3) return { module: parts[0]!, suite: parts[1]!, target: parts[2]! }
  if (parts.length === 2) return { module: context.module, suite: parts[0]!, target: parts[1]! }
  if (parts.length === 1) return { module: context.module, suite: context.suite, target: parts[0]! }
  throw new Error(`Invalid dep reference: ${raw}`)
}

export function fqtToString(fqt: FullyQualifiedTarget): string {
  return `${fqt.module}#${fqt.suite}#${fqt.target}`
}

export type Runner = (fqt: string) => Promise<TaskResult>

export { type TargetRunnerDeps }

export function buildRunner(root: string, projects: Map<string, ProjectFile>, deps: TargetRunnerDeps): Runner {
  const memo = new Map<string, Promise<TaskResult>>()

  const run = (fqt: string, trace: readonly string[] = []): Promise<TaskResult> => {
    const cached = memo.get(fqt)
    if (cached) return cached

    if (trace.includes(fqt)) throw new Error(`Circular dependency: ${[...trace, fqt].join(' -> ')}`)

    const hashIndex = fqt.indexOf('#')
    const secondHashIndex = fqt.indexOf('#', hashIndex + 1)
    if (hashIndex === -1 || secondHashIndex === -1) throw new Error(`Invalid FQT: ${fqt}`)

    const moduleName = fqt.slice(0, hashIndex)
    const suiteName = fqt.slice(hashIndex + 1, secondHashIndex)
    const targetName = fqt.slice(secondHashIndex + 1)

    const target = projects.get(moduleName)?.[suiteName]?.[targetName]
    if (!target) throw new Error(`Unknown target: ${fqt}`)

    const nextTrace = [...trace, fqt]
    const promise = Promise.all(
      target.deps.map(d => run(fqtToString(parseFqt(d, { module: moduleName, suite: suiteName })), nextTrace))
    ).then(depResults => runTarget(fqt, target, depResults, root, deps))

    memo.set(fqt, promise)
    return promise
  }

  return (fqt: string) => run(fqt)
}
