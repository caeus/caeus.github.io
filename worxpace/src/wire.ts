import { resolve, relative } from 'node:path'
import { AsyncDisposeStack, createKey, createModule, Module } from './di-container.js'
import { loadModules, type ModuleLoader } from './project/loader.js'
import type { Run, ModuleDef } from './project/schema.js'
import { buildRunner, type Runner } from './runner/index.js'
import type { BuildResult } from './runner/docker-builder.js'
import { renderDockerfile } from './runner/dockerfile-renderer.js'
import { buildDockerImage } from './runner/docker-builder.js'
import { extractFromImage } from './runner/docker-extractor.js'
import { CompositeCommandRunner, ListCommandRunner, RunCommandRunner, parseCmd, type CommandRunner } from './commands/index.js'

export interface DockerfileRenderer {
  renderDockerfile(run: Run): string
}

export interface DockerImageBuilder {
  buildDockerImage(content: string, tag: string, context: string): Promise<BuildResult>
}

export interface DockerImageExtractor {
  extractFromImage(imageTag: string, exportMap: Readonly<Record<string, string>>, destDir: string): Promise<void>
}

const rootKey = createKey<string>('root')
const hostRootKey = createKey<string>('hostRoot')
const currentModuleKey = createKey<string>('currentModule')
const moduleLoaderKey = createKey<ModuleLoader>('projectFinder')
const modulesKey = createKey<ReadonlyMap<string, ModuleDef>>('projects')
const dockerfileRendererKey = createKey<DockerfileRenderer>('dockerfileRenderer')
const dockerImageBuilderKey = createKey<DockerImageBuilder>('dockerImageBuilder')
const dockerImageExtractorKey = createKey<DockerImageExtractor>('dockerImageExtractor')
const runnerKey = createKey<Runner>('runner')
const listCommandRunnerKey = createKey<ListCommandRunner>('listCommandRunner')
const runCommandRunnerKey = createKey<RunCommandRunner>('runCommandRunner')
const commandRunnerKey = createKey<CommandRunner>('commandRunner')

export type ModuleFactory = (stack: AsyncDisposeStack, env: NodeJS.ProcessEnv) => Module

export function defaultModule(_stack: AsyncDisposeStack, env: NodeJS.ProcessEnv): Module {
  return createModule()
    .bind(rootKey).toValue(env['REPO_ROOT'] ?? resolve(new URL('../../', import.meta.url).pathname))
    .bind(hostRootKey).toFun([rootKey], root => env['HOST_REPO_ROOT'] ?? root)
    .bind(currentModuleKey).toFun([hostRootKey], hostRoot => relative(hostRoot, env['WORKING_DIR'] ?? hostRoot))
    .bind(moduleLoaderKey).toValue({ loadModules } satisfies ModuleLoader)
    .bind(dockerfileRendererKey).toValue({ renderDockerfile } satisfies DockerfileRenderer)
    .bind(dockerImageBuilderKey).toValue({ buildDockerImage } satisfies DockerImageBuilder)
    .bind(dockerImageExtractorKey).toValue({ extractFromImage } satisfies DockerImageExtractor)
    .bind(modulesKey).toFun([rootKey, moduleLoaderKey], (root, loader) => loader.loadModules(root))
    .bind(runnerKey).toFun(
      [rootKey, modulesKey, dockerfileRendererKey, dockerImageBuilderKey],
      (root, projects, renderer, builder) => buildRunner(root, projects, {
        renderDockerfile: (r) => renderer.renderDockerfile(r),
        buildDockerImage: (content, tag, context) => builder.buildDockerImage(content, tag, context),
      })
    )
    .bind(listCommandRunnerKey).toClass([modulesKey], ListCommandRunner)
    .bind(runCommandRunnerKey).toClass([runnerKey, dockerImageExtractorKey, hostRootKey, currentModuleKey], RunCommandRunner)
    .bind(commandRunnerKey).toClass([runCommandRunnerKey, listCommandRunnerKey], CompositeCommandRunner)
}

export async function main(args: string[], env: NodeJS.ProcessEnv, moduleFactory: ModuleFactory = defaultModule): Promise<void> {
  const cmd = parseCmd(args)

  const stack = new AsyncDisposeStack()
  try {
    const container = moduleFactory(stack, env).build()
    const commandRunner = await container.get(commandRunnerKey)
    await commandRunner.execute(cmd)
  } finally {
    await stack.dispose()
  }
}
