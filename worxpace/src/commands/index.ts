import { object, or } from '@optique/core/constructs'
import { argument, command, constant } from '@optique/core/primitives'
import { string } from '@optique/core/valueparser'
import type { InferValue } from '@optique/core/parser'
import { run } from '@optique/run'
import { resolve } from 'node:path'
import type { ProjectFile } from '../project/schema.js'
import { parseFqt, fqtToString, type Runner } from '../runner/index.js'
import type { DockerImageExtractor } from '../wire.js'

const parser = or(
  command('run', object({
    command: constant('run' as const),
    fqt: argument(string()),
  })),
  command('list', object({
    command: constant('list' as const),
  })),
)

export type Cmd = InferValue<typeof parser>

export function parseCmd(args: string[]): Cmd {
  return run(parser, { args })
}

export interface CommandRunner {
  execute(cmd: Cmd): Promise<void>
}

export class ListCommandRunner implements CommandRunner {
  constructor(private readonly projects: Map<string, ProjectFile>) {}

  async execute(_cmd: Cmd): Promise<void> {
    const graph = new Map<string, readonly string[]>()

    for (const [moduleName, suites] of this.projects) {
      for (const [suiteName, targets] of Object.entries(suites)) {
        for (const [targetName, target] of Object.entries(targets)) {
          const fqt = `${moduleName}#${suiteName}#${targetName}`
          const deps = target.deps.map(d =>
            fqtToString(parseFqt(d, { module: moduleName, suite: suiteName }))
          )
          graph.set(fqt, deps)
        }
      }
    }

    const sorted: string[] = []
    const visited = new Set<string>()

    const visit = (fqt: string): void => {
      if (visited.has(fqt)) return
      visited.add(fqt)
      for (const dep of graph.get(fqt) ?? []) visit(dep)
      sorted.push(fqt)
    }

    for (const fqt of graph.keys()) visit(fqt)

    for (const fqt of sorted) {
      const deps = graph.get(fqt) ?? []
      console.log(`${fqt}[${deps.join(', ')}]`)
    }
  }
}

export class RunCommandRunner implements CommandRunner {
  constructor(
    private readonly projects: Map<string, ProjectFile>,
    private readonly runner: Runner,
    private readonly extractor: DockerImageExtractor,
    private readonly root: string,
  ) {}

  async execute(cmd: Cmd): Promise<void> {
    if (cmd.command !== 'run') return

    const result = await this.runner(cmd.fqt)

    const hashIndex = cmd.fqt.indexOf('#')
    const secondHashIndex = cmd.fqt.indexOf('#', hashIndex + 1)
    const moduleName = cmd.fqt.slice(0, hashIndex)
    const suiteName = cmd.fqt.slice(hashIndex + 1, secondHashIndex)
    const targetName = cmd.fqt.slice(secondHashIndex + 1)
    const target = this.projects.get(moduleName)?.[suiteName]?.[targetName]

    if (target?.exports && target.exports.length > 0) {
      const moduleDir = resolve(this.root, moduleName)
      await this.extractor.extractFromImage(result.imageTag, target.exports, moduleDir)
    }

    console.log(`Done: ${result.imageTag} (${result.imageDigest})`)
  }
}

export class CompositeCommandRunner implements CommandRunner {
  constructor(
    private readonly runRunner: RunCommandRunner,
    private readonly listRunner: ListCommandRunner,
  ) {}

  execute(cmd: Cmd): Promise<void> {
    if (cmd.command === 'run') return this.runRunner.execute(cmd)
    return this.listRunner.execute(cmd)
  }
}
