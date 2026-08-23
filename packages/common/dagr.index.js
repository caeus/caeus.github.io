import { stack } from '/stacks/dagr.ts-lib.js'

export default stack({
  name: 'common',
  scope: 'caeus',
  version: '0.1.0',
  deps: [
    { remote: '@orpc/contract', kind: 'prod' },
    { remote: '@orpc/zod', kind: 'prod' },
    { remote: 'zod', kind: 'prod' },
  ]
})
