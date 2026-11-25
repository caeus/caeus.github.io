import { typescriptWorker } from '//stacks/dagr.typescript.js'

export default typescriptWorker('app', {
  version: '0.1.0',
  deps: [
    { name: '@internal/common', target: '//packages/common:/common/pack', at: 'prod' },
    { npm: '@orpc/server', at: 'prod' },
    { npm: '@caeus/wyr', at: 'prod' },
  ]
})
