FROM node:22-alpine

RUN apk add --no-cache docker-cli docker-cli-buildx && corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /worxpace

COPY package.json pnpm-workspace.yaml ./
RUN pnpm install

COPY src/ ./src/
COPY tsconfig.json versions.yml ./

ENV REPO_ROOT=/repo

ENTRYPOINT ["node", "--import", "tsx/esm", "src/index.ts"]
