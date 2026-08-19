import { resolve, relative } from 'node:path'
import { AsyncDisposeStack, createKey, createModule, Module } from './di-container.js'
import { loadPackages, type PackageLoader } from './pkg/loader.js'
import type { Run, PackageDef, RunContext } from './pkg/schema.js'
import { hostPlatform } from './host-platform.js'
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
  buildDockerImage(content: string, tag: string, context: string, ignore: readonly string[]): Promise<BuildResult>
}

export interface DockerImageExtractor {
  extractFromImage(imageTag: string, exportMap: Readonly<Record<string, string>>, destDir: string): Promise<void>
}

const envKey = createKey<NodeJS.ProcessEnv>('env')
const rootKey = createKey<string>('root')
const hostRootKey = createKey<string>('hostRoot')
const currentPackageKey = createKey<string>('currentPackage')
const packageLoaderKey = createKey<PackageLoader>('packageLoader')
const packagesKey = createKey<ReadonlyMap<string, PackageDef>>('packages')
const dockerfileRendererKey = createKey<DockerfileRenderer>('dockerfileRenderer')
const dockerImageBuilderKey = createKey<DockerImageBuilder>('dockerImageBuilder')
const dockerImageExtractorKey = createKey<DockerImageExtractor>('dockerImageExtractor')
const runContextKey = createKey<RunContext>('runContext')
const runnerKey = createKey<Runner>('runner')
const listCommandRunnerKey = createKey<ListCommandRunner>('listCommandRunner')
const runCommandRunnerKey = createKey<RunCommandRunner>('runCommandRunner')
const commandRunnerKey = createKey<CommandRunner>('commandRunner')

export type ModuleFactory = (stack: AsyncDisposeStack, env: NodeJS.ProcessEnv) => Module

export function defaultModule(_stack: AsyncDisposeStack, env: NodeJS.ProcessEnv): Module {
  return createModule()
    .bind(envKey).toValue(env)
    .bind(rootKey).toFun([envKey], env => env['REPO_ROOT'] ?? resolve(new URL('../../', import.meta.url).pathname))
    .bind(hostRootKey).toFun([envKey, rootKey], (env, root) => env['HOST_REPO_ROOT'] ?? root)
    .bind(currentPackageKey).toFun([envKey, hostRootKey], (env, hostRoot) => relative(hostRoot, env['WORKING_DIR'] ?? hostRoot))
    .bind(packageLoaderKey).toValue({ loadPackages } satisfies PackageLoader)
    .bind(dockerfileRendererKey).toValue({ renderDockerfile } satisfies DockerfileRenderer)
    .bind(dockerImageBuilderKey).toValue({ buildDockerImage } satisfies DockerImageBuilder)
    .bind(dockerImageExtractorKey).toValue({ extractFromImage } satisfies DockerImageExtractor)
    .bind(packagesKey).toFun([rootKey, packageLoaderKey], (root, loader) => loader.loadPackages(root))
    .bind(runContextKey).toFun([envKey], env => ({ host: hostPlatform(env) }))
    .bind(runnerKey).toFun(
      [rootKey, packagesKey, dockerfileRendererKey, dockerImageBuilderKey, runContextKey],
      (root, packages, renderer, builder, runContext) => buildRunner(root, packages, {
        renderDockerfile: (r) => renderer.renderDockerfile(r),
        buildDockerImage: (content, tag, context, ignore) => builder.buildDockerImage(content, tag, context, ignore),
      }, runContext)
    )
    .bind(listCommandRunnerKey).toClass([packagesKey], ListCommandRunner)
    .bind(runCommandRunnerKey).toClass([runnerKey, dockerImageExtractorKey, hostRootKey, currentPackageKey], RunCommandRunner)
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
