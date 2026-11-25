import versions from '//lib/dagr.versions.yaml'
import { RECOMMENDED_IGNORE } from '//lib/dagr.dockerignore.js'

export default {
  '/node-pnpm': {
    deps: {},
    run: () => ({
      build: {
        FROM: 'node:22-alpine',
        steps: [
          { RUN: `corepack enable && corepack prepare pnpm@${versions.pnpm} --activate` },
        ],
        IGNORE: RECOMMENDED_IGNORE,
      },
    }),
  },
}
