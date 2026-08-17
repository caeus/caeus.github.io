export default {
  ci: {
    engine: {
      deps: [],
      run: (_deps) => [
        { FROM: 'node:22-alpine' },
        { COPY: { src: 'package.json', dest: '/forge/package.json' } },
        { WORKDIR: '/forge' },
        { RUN: 'npm install --omit=dev' },
        { COPY: { src: 'engine.js', dest: '/forge/engine.js' } },
      ]
    },
    pnpmfile: {
      deps: [],
      run: (_deps) => [
        { FROM: 'scratch' },
        { COPY: { src: 'templates/pnpmfile', dest: '/forge/templates/pnpmfile' } },
      ]
    },
    'ts-ui': {
      deps: [],
      run: (_deps) => [
        { FROM: 'scratch' },
        { COPY: { src: 'templates/ts-ui', dest: '/forge/templates/ts-ui' } },
      ]
    },
    'ts-lib': {
      deps: [],
      run: (_deps) => [
        { FROM: 'scratch' },
        { COPY: { src: 'templates/ts-lib', dest: '/forge/templates/ts-lib' } },
      ]
    },
    'ts-executable': {
      deps: [],
      run: (_deps) => [
        { FROM: 'scratch' },
        { COPY: { src: 'templates/ts-executable', dest: '/forge/templates/ts-executable' } },
      ]
    }
  }
}
