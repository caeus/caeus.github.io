FROM node:22-alpine AS build

RUN apk add --no-cache git && corepack enable && corepack prepare pnpm@11.23.0 --activate

WORKDIR /dagr

# The pinned SHA is part of this layer's cache key, so bumping it here is what rebuilds dagr.
# A moving ref like `main` would cache forever and silently keep running a stale build.
RUN git clone --revision=df633880e0c4ffb3efa476023204538299f6beb6 --depth 1 https://github.com/caeus/dagr.git .

RUN pnpm install --frozen-lockfile
RUN pnpm exec tsc
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine

RUN apk add --no-cache docker-cli docker-cli-buildx

WORKDIR /dagr

COPY --from=build /dagr/package.json ./
COPY --from=build /dagr/dist ./dist
COPY --from=build /dagr/node_modules ./node_modules

ENV REPO_ROOT=/repo

ENTRYPOINT ["node", "--experimental-vm-modules", "dist/index.js"]
