import { typescriptLibrary } from '//stacks/dagr.typescript.js'

export default typescriptLibrary({
  location: import.meta.dagr.location,
  version: '0.1.0',
  deps: [
    { npm: '@orpc/contract', at: 'prod' },
    { npm: '@orpc/zod', at: 'prod' },
    { npm: 'zod', at: 'prod' },
  ]
})
