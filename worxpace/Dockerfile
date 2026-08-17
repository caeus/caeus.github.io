FROM node:22-alpine

RUN apk add --no-cache docker-cli docker-cli-buildx && corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /worxpace

COPY package.json pnpm-workspace.yaml ./
RUN pnpm install

COPY src/ ./src/
COPY tsconfig.json ./

RUN pnpm exec tsc

ENV REPO_ROOT=/repo

ENTRYPOINT ["node", "--experimental-vm-modules", "dist/index.js"]
