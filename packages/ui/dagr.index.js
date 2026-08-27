import { stack } from '//stacks/dagr.ts-ui.js'
import { INTERNAL_SCOPE } from '//lib/dagr.scope.js'

export default stack({
  location: import.meta.dagr.location,
  scope: INTERNAL_SCOPE,
  version: '0.1.0',
  deps: [
    { ref: '//packages/common', at: 'prod' },
  ]
})
