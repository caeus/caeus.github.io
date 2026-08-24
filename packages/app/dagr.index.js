import { stack } from '/stacks/dagr.ts-executable.js'
import { INTERNAL_SCOPE } from '/lib/dagr.scope.js'

export default stack({
  name: 'app',
  scope: INTERNAL_SCOPE,
  version: '0.1.0',
  deps: [
    { local: 'common', kind: 'prod' },
    { remote: '@orpc/server', kind: 'prod' },
    { remote: '@caeus/wyr', kind: 'prod' },
  ]
})
