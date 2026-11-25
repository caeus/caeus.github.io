import versions from '//lib/dagr.versions.yaml'
import { writeJson, writeYaml } from '//lib/dagr.file_utils.js'
import { RECOMMENDED_IGNORE } from '//lib/dagr.dockerignore.js'

// Members are listed explicitly rather than globbed: packages/base has no package.json,
// and packages/client is parked with a stale pre-dagr manifest.
// allowBuilds is the union of what the member stacks need; without it a host-side
// `pnpm install` skips these native build scripts and vite fails to start.
const WORKSPACE = {
  packages: [
    'packages/common',
    'packages/ui',
    'packages/app',
  ],
  linkWorkspacePackages: true,
  allowBuilds: {
    esbuild: true,
    sharp: true,
    workerd: true,
  },
}

// The workspace root is a container, never published, so it stays private.
const ROOT_PACKAGE_JSON = {
  name: 'caeus',
  private: true,
  type: 'module',
  packageManager: `pnpm@${versions.pnpm}`,
}

const manifest = (path, step) => ({
  deps: {},
  run: () => ({
    build: {
      FROM: 'alpine:3.22',
      steps: [{ WORKDIR: '/repo' }, step],
      IGNORE: RECOMMENDED_IGNORE,
      path,
    },
  }),
})

export default {
  '/file/dev/pnpm-workspace.yaml': manifest(
    '/repo/pnpm-workspace.yaml',
    writeYaml('/repo/pnpm-workspace.yaml', WORKSPACE),
  ),
  '/file/dev/package.json': manifest(
    '/repo/package.json',
    writeJson('/repo/package.json', ROOT_PACKAGE_JSON),
  ),
  '/dev/sync': {
    deps: { files: '/file/dev/*' },
    run: ({ files }) => ({
      build: {
        FROM: 'alpine:3.22',
        steps: [
          { WORKDIR: '/repo' },
          ...Object.values(files).map(file => ({
            COPY: { from: file.image, src: file.path, dest: file.path },
          })),
        ],
        IGNORE: RECOMMENDED_IGNORE,
        EXPORT: { '/repo/': './' },
      },
    }),
  },
  '/deploy': {
    deps: { ui: '//packages/ui:/ui/build' },
    run: ({ ui }) => ({
      build: {
        FROM: ui,
        steps: [],
        IGNORE: RECOMMENDED_IGNORE,
        EXPORT: { '/repo/dist': 'docs' },
      },
    }),
  },
}
