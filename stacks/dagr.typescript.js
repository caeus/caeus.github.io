import recipe, {
  cloudflareWorker,
  eslint,
  file,
  hostDev,
  library,
  pnpm,
  prettier,
  rdk,
  requirement,
  typescript,
  viteReact,
  vitest,
  writeYaml,
} from '//stacks/ts//dagr.recipe.js'
import { DEVELOPMENT_INTENTS, requirementsOf } from '//stacks/ts//dagr.model.js'
import versions from '//lib/dagr.versions.yaml'
import { INTERNAL_SCOPE } from '//lib/dagr.scope.js'
import { RECOMMENDED_IGNORE } from '//lib/dagr.dockerignore.js'

// pnpm() writes a package-level pnpm-workspace.yaml carrying allowBuilds, which a container install
// needs. On the host it is harmful: pnpm treats any directory holding that file as a workspace root,
// so it would detach each package from this repository's root workspace. The root workspace file,
// written by //:config:manifest, already carries the union of these allowBuilds.
const CONTAINER_ONLY_WORKSPACE_FILE = rdk.graph({
  '/file/package-manager': file(['/requirement/**', '/version/catalog'], {
    for: DEVELOPMENT_INTENTS,
    render(context, requirements, catalog) {
      if (context.host) return []
      const { allowBuilds } = requirementsOf(requirements, context, catalog)
      return allowBuilds.length === 0
        ? []
        : writeYaml('/repo/pnpm-workspace.yaml', {
            allowBuilds: Object.fromEntries(allowBuilds.map(pkg => [pkg, true])),
          })
    },
  }),
})

const COMMON = [
  typescript({
    base: '//packages/base:ci:node-pnpm',
    scope: INTERNAL_SCOPE,
    versions: versions.deps,
    ignore: RECOMMENDED_IGNORE,
  }),
  pnpm(),
  CONTAINER_ONLY_WORKSPACE_FILE,
  hostDev(),
]

// The product features default to a `#/*` specifier. Repository source predates that and imports
// `#articles/...`, so the bare `#*` form is restored after the feature that sets it.
const SOURCE_IMPORTS = rdk.graph({
  '/source/import-alias': rdk.derive(['/source/directory'], directory => ({
    specifier: '#*',
    sourcePath: `./${directory}/*`,
    runtimePath: `./${directory}/*`,
  })),
})

export const typescriptLibrary = recipe([...COMMON, library(), prettier()])

export const typescriptWorker = recipe([...COMMON, cloudflareWorker(), SOURCE_IMPORTS, prettier()])

// Two type packages the upstream features stopped contributing. viteReact() dropped the React types,
// and /requirement/vitest is gated to dev, test and lint, so neither JSX nor the test files that
// tsconfig includes resolve during typecheck. Versions resolve from lib/dagr.versions.yaml.
const MISSING_TYPES = rdk.graph({
  '/requirement/react-types': requirement({ packages: ['@types/react', '@types/react-dom'] }),
  '/requirement/vitest-typecheck': requirement({ for: ['typecheck'], packages: ['vitest'] }),
})

export const typescriptUi = recipe([
  ...COMMON,
  viteReact(),
  SOURCE_IMPORTS,
  MISSING_TYPES,
  prettier(),
  eslint(),
  vitest({ environment: 'jsdom' }),
])
