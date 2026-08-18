import { object, or } from '@optique/core/constructs'
import { argument, command, constant } from '@optique/core/primitives'
import { string } from '@optique/core/valueparser'
import type { InferValue } from '@optique/core/parser'
import { run } from '@optique/run'
import { resolve } from 'node:path'
import type { ModuleDef } from '../project/schema.js'
import { FQT, type Runner } from '../runner/index.js'
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
  constructor(private readonly projects: ReadonlyMap<string, ModuleDef>) {}

  async execute(_cmd: Cmd): Promise<void> {
    const graph = new Map<string, readonly string[]>()

    for (const [moduleName, suites] of this.projects) {
      for (const [suiteName, targets] of Object.entries(suites)) {
        for (const [targetName, target] of Object.entries(targets)) {
          const fqt = new FQT(moduleName, suiteName, targetName)
          const deps = target.deps.map(d =>
            FQT.parse(d, { module: moduleName, suite: suiteName }).toString()
          )
          graph.set(fqt.toString(), deps)
        }
      }
    }

    const sorted: string[] = []
    const visited = new Set<string>()
    const visit = (key: string): void => {
      if (visited.has(key)) return
      visited.add(key)
      for (const dep of graph.get(key) ?? []) visit(dep)
      sorted.push(key)
    }
    for (const key of graph.keys()) visit(key)
    for (const key of sorted) {
      const deps = graph.get(key) ?? []
      console.log(`${key}[${deps.join(', ')}]`)
    }
  }
}

export class RunCommandRunner implements CommandRunner {
  constructor(
    private readonly runner: Runner,
    private readonly extractor: DockerImageExtractor,
    private readonly root: string,
    private readonly currentModule: string,
  ) {}

  async execute(cmd: Cmd): Promise<void> {
    if (cmd.command !== 'run') return

    const context = this.currentModule ? { module: this.currentModule } : undefined
    const fqt = FQT.parse(cmd.fqt, context)
    const result = await this.runner(fqt.toString())

    if (result.export) {
      const moduleDir = resolve(this.root, result.fqt.module)
      await this.extractor.extractFromImage(result.imageTag, result.export, moduleDir)
    }

    console.log(`Done: ${result.fqt} (${result.imageTag})`)
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
