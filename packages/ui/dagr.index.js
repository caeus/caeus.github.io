import { typescriptUi } from '//stacks/dagr.typescript.js'

export default typescriptUi({
  location: import.meta.dagr.location,
  version: '0.1.0',
  deps: [
    { pkg: '//packages/common', at: 'prod' },
    { npm: '@caeus/wyr', at: 'prod' },
    { npm: 'react-markdown', at: 'prod' },
    { npm: 'zod', at: 'prod' },
  ]
})
