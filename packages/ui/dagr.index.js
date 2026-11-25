import { typescriptUi } from '//stacks/dagr.typescript.js'

export default typescriptUi('ui', {
  version: '0.1.0',
  deps: [
    { name: '@internal/common', target: '//packages/common:/common/pack', at: 'prod' },
    { npm: '@caeus/wyr', at: 'prod' },
    { npm: 'react-markdown', at: 'prod' },
    { npm: 'zod', at: 'prod' },
  ]
})
