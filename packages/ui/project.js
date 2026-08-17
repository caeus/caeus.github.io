export default {
  ci: {
    scaffold: {
      deps: ['packages/forge#ci#engine', 'packages/forge#ci#ts-ui'],
      exports: ['/out/'],
      run: (deps) => [
        { FROM: 'node:22-alpine' },
        { COPY: { from: deps['packages/forge#ci#engine'], src: '/forge', dest: '/forge' } },
        { COPY: { from: deps['packages/forge#ci#ts-ui'], src: '/forge/templates/ts-ui', dest: '/forge/templates/ts-ui' } },
        { RUN: `node /forge/engine.js --template /forge/templates/ts-ui --data '{"scope":"caeus","name":"ui","outDir":"../../docs"}' --out /out` },
      ]
    },
    pnpmfile: {
      deps: ['packages/forge#ci#engine', 'packages/forge#ci#pnpmfile'],
      run: (deps) => [
        { FROM: 'node:22-alpine' },
        { COPY: { from: deps['packages/forge#ci#engine'], src: '/forge', dest: '/forge' } },
        { COPY: { from: deps['packages/forge#ci#pnpmfile'], src: '/forge/templates/pnpmfile', dest: '/forge/templates/pnpmfile' } },
        { RUN: `node /forge/engine.js --template /forge/templates/pnpmfile --data '{"scope":"caeus"}' --out /out` },
      ]
    },
    install: {
      deps: ['packages/common#ci#pack', 'scaffold', 'pnpmfile'],
      exports: ['/repo/node_modules'],
      run: (deps) => [
        { FROM: 'node:22-alpine' },
        { RUN: 'corepack enable && corepack prepare pnpm@latest --activate' },
        { COPY: { from: deps['packages/common#ci#pack'], src: '/out/caeus-common-0.0.0.tgz', dest: '/repo/common.tgz' } },
        { COPY: { from: deps['pnpmfile'], src: '/out/.pnpmfile.cjs', dest: '/repo/.pnpmfile.cjs' } },
        { COPY: { from: deps['scaffold'], src: '/out/package.json', dest: '/repo/package.json' } },
        { WORKDIR: '/repo' },
        { RUN: 'printf "allowBuilds:\\n  esbuild: true\\n" > pnpm-workspace.yaml && pnpm install --prod=false' },
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
    },
    build: {
      deps: ['install'],
      run: (deps) => [
        { FROM: deps['install'] },
        { COPY: { src: '.', dest: '/repo' } },
        { WORKDIR: '/repo' },
        { RUN: 'pnpm exec vite build' },
      ]
    }
  }
}
