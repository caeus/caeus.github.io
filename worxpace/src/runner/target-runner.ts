import { join } from 'node:path'
import type { Target, ExportEntry } from '../project/schema.js'
import type { BuildResult } from './docker-builder.js'
import type { TaskResult } from './index.js'

export interface TargetRunnerDeps {
  renderDockerfile(run: ReturnType<Target['run']>): string
  buildDockerImage(content: string, tag: string, context: string): Promise<BuildResult>
  extractFromImage(imageTag: string, entry: ExportEntry, destDir: string): Promise<void>
}

export async function runTarget(fqt: string, target: Target, depResults: TaskResult[], root: string, deps: TargetRunnerDeps): Promise<TaskResult> {
  const moduleName = fqt.slice(0, fqt.indexOf('#'))
  const moduleDir = join(root, moduleName)
  const tag = fqt.replace(/#/g, '-').replace(/\//g, '_').replace(/^[^a-zA-Z0-9]+/, '')

  const depsMap = Object.fromEntries(
    target.deps.map((dep, i) => [dep, depResults[i]!.imageTag])
  )

  const runDef = target.run(depsMap)
  const [fromStep, ...steps] = runDef
  const lastStep = steps[steps.length - 1]
  const exportEntry = lastStep && 'EXPORT' in lastStep ? lastStep.EXPORT : undefined
  const dockerSteps = exportEntry ? steps.slice(0, -1) : steps

  const dockerfileContent = deps.renderDockerfile([fromStep, ...dockerSteps])
  const { tag: imageTag, digest: imageDigest } = await deps.buildDockerImage(dockerfileContent, tag, moduleDir)

  return exportEntry
    ? { fqt, imageTag, imageDigest, export: exportEntry }
    : { fqt, imageTag, imageDigest }
}
