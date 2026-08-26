import { stack } from '//stacks/dagr.ts-ui.js'
import { INTERNAL_SCOPE } from '//lib/dagr.scope.js'

export default stack({
  name: 'ui',
  scope: INTERNAL_SCOPE,
  version: '0.1.0',
  deps: [
    { local: 'common', kind: 'prod' },
  ]
})
