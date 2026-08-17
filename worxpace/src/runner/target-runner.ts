import { join } from 'node:path'
import type { Target } from '../project/schema.js'
import type { BuildResult } from './docker-builder.js'
import type { TaskResult } from './index.js'

export interface TargetRunnerDeps {
  renderDockerfile(run: ReturnType<Target['run']>): string
  buildDockerImage(content: string, tag: string, context: string): Promise<BuildResult>
  extractFromImage(imageTag: string, outputGlobs: readonly string[], destDir: string): Promise<readonly string[]>
}

export async function runTarget(fqt: string, target: Target, depResults: TaskResult[], root: string, deps: TargetRunnerDeps): Promise<TaskResult> {
  const moduleName = fqt.slice(0, fqt.indexOf('#'))
  const moduleDir = join(root, moduleName)
  const tag = fqt.replace(/#/g, '-').replace(/\//g, '_').replace(/^[^a-zA-Z0-9]+/, '')

  const depsMap = Object.fromEntries(
    target.deps.map((dep, i) => [dep, depResults[i]!.imageTag])
  )

  const runDef = target.run(depsMap)
  const dockerfileContent = deps.renderDockerfile(runDef)
  const { tag: imageTag, digest: imageDigest } = await deps.buildDockerImage(dockerfileContent, tag, moduleDir)

  return { fqt, imageTag, imageDigest }
}
