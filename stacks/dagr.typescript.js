import {
  cloudflareWorker,
  copyFiles,
  derive,
  eslint,
  file,
  library,
  packageJsonDependencies,
  pnpm,
  prettier,
  scope,
  tooling,
  typescript,
  viteReact,
  vitest,
  writeText,
} from '//stacks/ts//dagr.recipe.js'
import { copyLocalPackages } from '//stacks/ts//dagr.model.js'
import versions from '//lib/dagr.versions.yaml'
import { INTERNAL_SCOPE } from '//lib/dagr.scope.js'
import { RECOMMENDED_IGNORE } from '//lib/dagr.dockerignore.js'

const common = (name, declaration) => ({
  ...typescript(name, {
    base: '//packages/base:/node-pnpm',
    scope: INTERNAL_SCOPE,
    versions: versions.deps,
    ignore: RECOMMENDED_IGNORE,
    ...declaration,
  }),
  ...pnpm(name),
  ...prettier(name),
})

// The repository owns one host workspace. Only top-level generated files belong
// in each member; package-manager configuration is for isolated container builds.
const hostFiles = name => scope(name, {
  '/dev/hoist': {
    deps: {
      files: '/file/dev/*',
      localPackages: '/package/local-dependencies',
      localImages: '/package/local-images',
      ignore: '/source/ignore',
    },
    run: ({ files, localPackages, localImages, ignore }) => ({
      build: {
        FROM: 'alpine:3.22',
        steps: [
          { WORKDIR: '/repo' },
          ...copyLocalPackages(localPackages, localImages),
          ...copyFiles(files),
        ],
        IGNORE: ignore,
        EXPORT: { '/repo/': './' },
      },
    }),
  },
})

// Source code uses package imports such as #articles/...; that is a site
// convention, not a requirement of the shared recipe.
const sourceImports = name => scope(name, {
  '/source/import-alias': derive(
    { source: '/source/directory' },
    ({ source }) => ({
      specifier: '#*',
      sourcePath: `./${source}/*`,
      runtimePath: `./${source}/*`,
    }),
  ),
})

const uiConfiguration = name => scope(name, {
  '/ui/types/tooling': tooling({ packages: ['@types/react', '@types/react-dom'] }),
  '/ui/types/package-json/dependencies': packageJsonDependencies('/ui/types/tooling'),

  // Typechecking the UI includes its test files, so Vitest must be installed
  // for that intent as well as when tests are executed.
  '/vitest/tooling': tooling({
    for: ['dev', 'test', 'lint', 'typecheck'],
    packages: ['vitest', 'jsdom'],
    builds: ['esbuild'],
  }),

  ...file('/repo/vite.config.ts', { source: '/source/directory' }, {
    for: ['dev', 'test', 'build'],
    render(_context, { source }) {
      return writeText('/repo/vite.config.ts', `import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^#(.*)$/, replacement: fileURLToPath(new URL('./${source}/', import.meta.url)) + '$1' },
    ],
  },
})
`)
    },
  }),
})

export const typescriptLibrary = (name, declaration) => ({
  ...common(name, declaration),
  ...library(name),
  ...hostFiles(name),
})

export const typescriptWorker = (name, declaration) => ({
  ...common(name, declaration),
  ...cloudflareWorker(name),
  ...sourceImports(name),
  ...hostFiles(name),
})

export const typescriptUi = (name, declaration) => ({
  ...common(name, declaration),
  ...viteReact(name),
  ...vitest(name, { environment: 'jsdom' }),
  ...eslint(name),
  ...sourceImports(name),
  ...uiConfiguration(name),
  ...hostFiles(name),
})
