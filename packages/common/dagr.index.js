import { stack } from '//stacks/dagr.ts-lib.js'
import { INTERNAL_SCOPE } from '//lib/dagr.scope.js'

export default stack({
  location: import.meta.dagr.location,
  scope: INTERNAL_SCOPE,
  version: '0.1.0',
  deps: [
    { package: '@orpc/contract', at: 'prod' },
    { package: '@orpc/zod', at: 'prod' },
    { package: 'zod', at: 'prod' },
  ]
})
