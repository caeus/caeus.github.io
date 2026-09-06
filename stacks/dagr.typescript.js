import typescript, {
  cloudflareWorker,
  di,
  eslint,
  library,
  prettier,
  viteReact,
  vitest,
} from '//stacks/ts//dagr.stack.js'
import versions from '//lib/dagr.versions.yaml'
import { INTERNAL_SCOPE } from '//lib/dagr.scope.js'
import { RECOMMENDED_IGNORE } from '//lib/dagr.dockerignore.js'

const repository = typescript({
  base: '//packages/base:ci:node-pnpm',
  scope: INTERNAL_SCOPE,
  versions: versions.deps,
  ignore: RECOMMENDED_IGNORE,
})

const sourceImports = di.module({
  importAlias: di.toFun(
    ['sourceDirectory'],
    directory => ({
      specifier: '#*',
      sourcePath: `./${directory}/*`,
      runtimePath: `./${directory}/*`,
    }),
  ),
})

export const typescriptLibrary = repository
  .with(library())
  .with(prettier())

export const typescriptWorker = repository
  .with(cloudflareWorker())
  .with(sourceImports)
  .with(prettier())

export const typescriptUi = repository
  .with(viteReact())
  .with(sourceImports)
  .with(prettier())
  .with(eslint())
  .with(vitest({ environment: 'jsdom' }))
