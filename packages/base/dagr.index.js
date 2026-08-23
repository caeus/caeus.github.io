import { PNPM_VERSION } from '/lib/dagr.versions.js'
import { RECOMMENDED_IGNORE } from '/lib/dagr.dockerignore.js'

export default {
  ci: {
    'node-pnpm': {
      deps: [],
      run: () => ({
        FROM: 'node:22-alpine',
        steps: [
          { RUN: `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate` },
        ],
        IGNORE: RECOMMENDED_IGNORE,
      })
    }
  }
}
