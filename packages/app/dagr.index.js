import { typescriptWorker } from '//stacks/dagr.typescript.js'

export default typescriptWorker({
  location: import.meta.dagr.location,
  version: '0.1.0',
  deps: [
    { pkg: '//packages/common', at: 'prod' },
    { npm: '@orpc/server', at: 'prod' },
    { npm: '@caeus/wyr', at: 'prod' },
  ]
})
