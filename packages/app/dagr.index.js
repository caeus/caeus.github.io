import { stack } from '//stacks/dagr.ts-executable.js'
import { INTERNAL_SCOPE } from '//lib/dagr.scope.js'

export default stack({
  location: import.meta.dagr.location,
  scope: INTERNAL_SCOPE,
  version: '0.1.0',
  deps: [
    { pkg: '//packages/common', at: 'prod' },
    { npm: '@orpc/server', at: 'prod' },
    { npm: '@caeus/wyr', at: 'prod' },
  ]
})
