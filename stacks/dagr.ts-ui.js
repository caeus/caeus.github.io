import versions from '//lib/dagr.versions.yaml'
import { buildPackageJson, pnpmfile, projectName } from '//stacks/dagr.utils.js'
import { writeJson, writeYaml, writeText } from '//lib/dagr.file_utils.js'
import { RECOMMENDED_IGNORE } from '//lib/dagr.dockerignore.js'

const CORE_DEPS = [
  '@tailwindcss/vite', '@vitejs/plugin-react',
  'class-variance-authority', 'clsx',
  'react', 'react-dom', 'react-router-dom',
  'tailwind-merge', 'tailwindcss',
  '@caeus/wyr', 'zod',
  'react-markdown',
]

const CORE_DEV_DEPS = [
  '@tsconfig/strictest', '@types/node', '@types/react', '@types/react-dom',
  '@typescript-eslint/eslint-plugin', '@typescript-eslint/parser',
  'eslint', 'prettier', 'typescript', 'vite',
  // vitest.config.ts imports vitest/config, and its jsdom environment is a separate package.
  'vitest', 'jsdom',
]

const TSCONFIG = {
  extends: '@tsconfig/strictest/tsconfig.json',
  include: ['src/**/*'],
  compilerOptions: {
    rootDir: 'src',
    target: 'ES2020',
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    moduleResolution: 'Bundler',
    noEmit: true,
    allowImportingTsExtensions: true,
    moduleDetection: 'force',
    jsx: 'react-jsx',
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

const ESLINTRC = `/* eslint-env node */
module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: { '@typescript-eslint/no-empty-object-type': 'off' },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  env: { browser: true, es2022: true },
}
`

const VITE_CONFIG = `import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
`

const VITEST_CONFIG = `import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url))
    }
  })
)
`

const BASE = '//packages/base:ci:node-pnpm'

const MANIFESTS = [
  'package.json', 'tsconfig.json', '.prettierrc.json',
  '.eslintrc.cjs', 'vite.config.ts', 'vitest.config.ts',
]

export function stack({ location, scope, version, deps = [] }) {
  const name = projectName(location, scope)
  const localDeps = deps.filter(d => 'local' in d)
  const packTargets = localDeps.map(d => `//packages/${d.local}:ci:pack`)
  const packageJson = buildPackageJson({
    name, scope, version, deps,
    coreDeps: CORE_DEPS,
    coreDevDeps: CORE_DEV_DEPS,
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
            writeText('/repo/.eslintrc.cjs', ESLINTRC),
            writeText('/repo/vite.config.ts', VITE_CONFIG),
            writeText('/repo/vitest.config.ts', VITEST_CONFIG),
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
      },
      // Installs for the *host* platform rather than the container's, so the exported tree has
      // usable native binaries. Local deps come from tarballs, so they arrive built.
      install: {
        deps: ['config:manifest', ...packTargets],
        run: ({ images: d, host }) => ({
          FROM: d['config:manifest'],
          steps: [
            ...localDeps.map(dep => ({
              COPY: { from: d[`//packages/${dep.local}:ci:pack`], src: `/out/${dep.local}.tgz`, dest: `/repo/${dep.local}.tgz` }
            })),
            { WORKDIR: '/repo' },
            writeText('/repo/.pnpmfile.cjs', pnpmfile(scope, localDeps)),
            writeYaml('/repo/pnpm-workspace.yaml', { allowBuilds: { esbuild: true } }),
            { RUN: `pnpm install --prod=false --os ${host.os} --cpu ${host.arch}` },
          ],
          IGNORE: RECOMMENDED_IGNORE,
          EXPORT: { '/repo/node_modules': 'node_modules' },
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
            writeYaml('/repo/pnpm-workspace.yaml', { allowBuilds: { esbuild: true } }),
            { RUN: 'pnpm install --prod=false' },
          ],
          IGNORE: RECOMMENDED_IGNORE,
          EXPORT: { '/repo/node_modules': 'node_modules' },
        })
      },
      typecheck: {
        deps: ['install'],
        run: ({ images: d }) => ({
          FROM: d.install,
          steps: [
            { COPY: { src: 'src', dest: '/repo/src' } },
            { WORKDIR: '/repo' },
            { RUN: 'pnpm exec tsc --noEmit' },
          ],
          IGNORE: RECOMMENDED_IGNORE,
        })
      },
      test: {
        deps: ['install'],
        run: ({ images: d }) => ({
          FROM: d.install,
          steps: [
            { COPY: { src: 'src', dest: '/repo/src' } },
            { WORKDIR: '/repo' },
            { RUN: 'pnpm exec vitest run' },
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
            { COPY: { src: 'index.html', dest: '/repo/index.html' } },
            { COPY: { src: 'public', dest: '/repo/public' } },
            { WORKDIR: '/repo' },
            { RUN: 'pnpm exec vite build' },
          ],
          IGNORE: RECOMMENDED_IGNORE,
        })
      }
    }
  }
}
