import versions from '//lib/dagr.versions.yaml'
import { buildPackageJson, pnpmfile } from '//stacks/dagr.utils.js'
import { writeJson, writeText } from '//lib/dagr.file_utils.js'
import { RECOMMENDED_IGNORE } from '//lib/dagr.dockerignore.js'

const CORE_DEV_DEPS = ['@tsconfig/strictest', 'typescript']

const TSCONFIG = {
  extends: '@tsconfig/strictest/tsconfig.json',
  include: ['src/**/*'],
  compilerOptions: {
    rootDir: 'src',
    target: 'ES2022',
    lib: ['ES2022'],
    module: 'ESNext',
    moduleResolution: 'Bundler',
    noEmit: true,
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

export function stack({ name, scope, version, deps = [] }) {
  const localDeps = deps.filter(d => 'local' in d)
  const packTargets = localDeps.map(d => `//packages/${d.local}:ci:pack`)
  const packageJson = buildPackageJson({
    name, scope, version, deps, coreDevDeps: CORE_DEV_DEPS, versions: versions.deps,
    extra: {
      main: './dist/index.js',
      types: './dist/index.d.ts',
      exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
      files: ['dist'],
    }
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
              COPY: { from: d[`//packages/${dep.local}:ci:pack`], src: `/out/${dep.local}.tgz`, dest: `/repo/${dep.local}.tgz` }
            })),
            { WORKDIR: '/repo' },
            writeText('/repo/.pnpmfile.cjs', pnpmfile(scope, localDeps)),
            { RUN: 'pnpm install --prod=false' },
          ],
          IGNORE: RECOMMENDED_IGNORE,
        })
      },
      build: {
        deps: ['install'],
        run: ({ images: d }) => ({
          FROM: d['install'],
          steps: [
            { COPY: { src: 'src', dest: '/repo/src' } },
            { WORKDIR: '/repo' },
            { RUN: 'pnpm exec tsc --outDir dist --declaration --noEmit false' },
          ],
          IGNORE: RECOMMENDED_IGNORE,
        })
      },
      pack: {
        deps: ['build'],
        run: ({ images: d }) => ({
          FROM: d['build'],
          steps: [
            { WORKDIR: '/repo' },
            { RUN: `pnpm pack --pack-destination /out && mv /out/*.tgz /out/${name}.tgz` },
          ],
          IGNORE: RECOMMENDED_IGNORE,
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
