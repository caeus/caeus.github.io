import { stack } from '/stacks/dagr.ts-ui.js'

export default stack({
  name: 'ui',
  scope: 'caeus',
  version: '0.1.0',
  outDir: '../../docs',
  deps: [
    { local: 'common', kind: 'prod' },
  ]
})
