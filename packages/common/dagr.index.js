import { stack } from '//stacks/dagr.ts-lib.js'
import { INTERNAL_SCOPE } from '//lib/dagr.scope.js'

export default stack({
  name: 'common',
  scope: INTERNAL_SCOPE,
  version: '0.1.0',
  deps: [
    { remote: '@orpc/contract', kind: 'prod' },
    { remote: '@orpc/zod', kind: 'prod' },
    { remote: 'zod', kind: 'prod' },
  ]
})
