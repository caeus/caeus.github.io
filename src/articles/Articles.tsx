import { useEffect, useState } from 'react'
import type { ArticleFetcher, ArticleSample } from './articles-fetcher'
import { run } from '@/utils'

export const connectArticles = (View: ArticlesView, fetcher: ArticleFetcher) => () => {
  const [articles, setArticles] = useState<readonly ArticleSample[] | null>(null)

  useEffect(() => {
    run(async () => setArticles(await fetcher.fetch()))
  }, [fetcher])

  return <View articles={articles} />
}
export type Articles = ReturnType<typeof connectArticles>

export function ArticlesView({ articles }: { articles: readonly ArticleSample[] | null }) {
  if (articles === null) {
    return (
      <ul className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
        ))}
      </ul>
    )
  }

  return (
    <ul className="space-y-3">
      {articles.map((a) => (
        <li key={a.id}>
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
          >
            {a.title}
          </a>
        </li>
      ))}
    </ul>
  )
}
export type ArticlesView = typeof ArticlesView
