import { DefaultDevtoClient, type ArticleSample } from '#devto/devto-client'

export type { ArticleSample }

export interface ArticleFetcher {
  fetch(): Promise<readonly ArticleSample[]>
}

export function createArticleFetcher(username: string, perPage?: number): ArticleFetcher {
  const client = new DefaultDevtoClient('https://dev.to/api')
  return {
    fetch: () => client.articles(username, perPage)
  }
}
