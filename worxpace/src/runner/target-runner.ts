import { join } from 'node:path'
import type { Target } from '../project/schema.js'
import type { BuildResult } from './docker-builder.js'
import type { FQT, TaskResult } from './index.js'

export interface TargetRunnerDeps {
  renderDockerfile(run: ReturnType<Target['run']>): string
  buildDockerImage(content: string, tag: string, context: string): Promise<BuildResult>
}

export async function runTarget(fqt: FQT, target: Target, depResults: TaskResult[], root: string, deps: TargetRunnerDeps): Promise<TaskResult> {
  const moduleDir = join(root, fqt.module)
  const tag = fqt.toString().replace(/#/g, '-').replace(/\//g, '_').replace(/^[^a-zA-Z0-9]+/, '')

  const depsMap = Object.fromEntries(
    target.deps.map((dep, i) => [dep, depResults[i]!.imageTag])
  )

  const runDef = target.run(depsMap)
  const dockerfileContent = deps.renderDockerfile(runDef)
  const { tag: imageTag, digest: imageDigest } = await deps.buildDockerImage(dockerfileContent, tag, moduleDir)

  return runDef.EXPORT
    ? { fqt, imageTag, imageDigest, export: runDef.EXPORT }
    : { fqt, imageTag, imageDigest }
}
