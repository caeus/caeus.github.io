FROM node:22-alpine

RUN apk add --no-cache docker-cli docker-cli-buildx git && corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /dagr

# The pinned SHA is part of this layer's cache key, so bumping it here is what rebuilds dagr.
# A moving ref like `main` would cache forever and silently keep running a stale build.
RUN git clone --revision=9bb1c86328d7e2c48156ba27d1f5ea628b468332 --depth 1 https://github.com/caeus/dagr.git .

RUN pnpm install --frozen-lockfile && pnpm exec tsc

ENV REPO_ROOT=/repo

ENTRYPOINT ["node", "--experimental-vm-modules", "dist/index.js"]
