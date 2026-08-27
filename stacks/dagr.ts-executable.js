import versions from '//lib/dagr.versions.yaml'
import { buildPackageJson, pnpmfile, projectName } from '//stacks/dagr.utils.js'
import { writeJson, writeYaml, writeText } from '//lib/dagr.file_utils.js'
import { RECOMMENDED_IGNORE } from '//lib/dagr.dockerignore.js'

const CORE_DEV_DEPS = ['@tsconfig/strictest', '@cloudflare/workers-types', 'typescript', 'wrangler']

const TSCONFIG = {
  extends: '@tsconfig/strictest/tsconfig.json',
  include: ['src/**/*'],
  compilerOptions: {
    rootDir: 'src',
    target: 'ES2022',
    lib: ['ES2022'],
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    noEmit: true,
    types: ['@cloudflare/workers-types'],
    paths: { '#*': ['./src/*'] },
  }
}

const PRETTIERRC = {
  $schema: 'https://json.schemastore.org/prettierrc',
  semi: false,
  tabWidth: 2,
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'none',
}

const BASE = '//packages/base:ci:node-pnpm'

const MANIFESTS = ['package.json', 'tsconfig.json', '.prettierrc.json']

export function stack({ location, scope, version, deps = [] }) {
  const name = projectName(location, scope)
  const localDeps = deps.filter(d => 'pkg' in d)
  const packTarget = dep => `${dep.pkg}:ci:pack`
  const localSlug = dep => projectName(dep.pkg, scope).slice(`@${scope}/`.length)
  const packTargets = localDeps.map(packTarget)
  const packageJson = buildPackageJson({
    name, scope, version, deps, coreDevDeps: CORE_DEV_DEPS,
    extra: { imports: { '#*': './src/*' } },
    versions: versions.deps,
  })

  return {
    config: {
      manifest: {
        deps: [BASE],
        run: ({ images: d }) => ({
          FROM: d[BASE],
          steps: [
            { WORKDIR: '/repo' },
            writeJson('/repo/package.json', packageJson),
            writeJson('/repo/tsconfig.json', TSCONFIG),
            writeJson('/repo/.prettierrc.json', PRETTIERRC),
          ],
          IGNORE: RECOMMENDED_IGNORE,
        })
      }
    },
    dev: {
      sync: {
        deps: ['config:manifest'],
        run: ({ images: d }) => ({
          FROM: d['config:manifest'],
          steps: [],
          IGNORE: RECOMMENDED_IGNORE,
          EXPORT: Object.fromEntries(MANIFESTS.map(f => [`/repo/${f}`, f])),
        })
      }
    },
    ci: {
      install: {
        deps: ['config:manifest', ...packTargets],
        run: ({ images: d }) => ({
          FROM: d['config:manifest'],
          steps: [
            ...localDeps.map(dep => ({
              COPY: { from: d[packTarget(dep)], src: `/out/${localSlug(dep)}.tgz`, dest: `/repo/${localSlug(dep)}.tgz` }
            })),
            { WORKDIR: '/repo' },
            writeText('/repo/.pnpmfile.cjs', pnpmfile(scope, localDeps)),
            writeYaml('/repo/pnpm-workspace.yaml', { allowBuilds: { esbuild: true, sharp: true, workerd: true } }),
            { RUN: 'pnpm install --prod=false' },
          ],
          IGNORE: RECOMMENDED_IGNORE,
          EXPORT: { '/repo/node_modules': 'node_modules' },
        })
      },
      typecheck: {
        deps: ['install'],
        run: ({ images: d }) => ({
          FROM: d['install'],
          steps: [
            { COPY: { src: 'src', dest: '/repo/src' } },
            { WORKDIR: '/repo' },
            { RUN: 'pnpm exec tsc --noEmit' },
          ],
          IGNORE: RECOMMENDED_IGNORE,
        })
      }
    }
  }
}
