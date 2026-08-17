export default {
  ci: {
    install: {
      deps: [],
      exports: ['/repo/node_modules'],
      run: (_deps) => [
        { FROM: 'node:22-alpine' },
        { RUN: 'corepack enable && corepack prepare pnpm@latest --activate' },
        { COPY: { src: 'package.json', dest: '/repo/package.json' } },
        { WORKDIR: '/repo' },
        { RUN: 'pnpm install --ignore-workspace --prod=false' },
      ]
    },
    pack: {
      deps: ['install'],
      run: (deps) => [
        { FROM: deps['install'] },
        { COPY: { src: '.', dest: '/repo' } },
        { WORKDIR: '/repo' },
        { RUN: 'pnpm pack --pack-destination /out' },
      ]
    },
    typecheck: {
      deps: ['install'],
      run: (deps) => [
        { FROM: deps['install'] },
        { COPY: { src: '.', dest: '/repo' } },
        { WORKDIR: '/repo' },
        { RUN: 'pnpm exec tsc --noEmit' },
      ]
    }
  }
}
