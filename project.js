export default {
  ci: {
    deploy: {
      deps: ['packages/ui#ci#build'],
      exports: ['/docs'],
      run: (deps) => ({
        FROM: deps['packages/ui#ci#build'],
        steps: []
      })
    }
  }
}
