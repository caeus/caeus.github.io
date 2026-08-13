import { object, or } from '@optique/core/constructs'
import { argument, command, constant } from '@optique/core/primitives'
import { string } from '@optique/core/valueparser'
import type { InferValue } from '@optique/core/parser'
import { run } from '@optique/run'
import { resolve } from 'node:path'
import type { ProjectFile } from '../project/schema.js'
import type { Runner } from '../runner/index.js'
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
    for (const [moduleName, suites] of this.projects) {
      for (const [suiteName, targets] of Object.entries(suites)) {
        for (const targetName of Object.keys(targets)) {
          console.log(`${moduleName}#${suiteName}#${targetName}`)
        }
      }
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
