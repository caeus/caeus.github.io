import { useEffect, useState } from 'react'
import type { ArticleFetcher, ArticleSample } from './articles-fetcher'
import { run } from '@/utils'

type State =
  | { status: 'loading' }
  | { status: 'ready'; articles: readonly ArticleSample[] }
  | { status: 'error'; message: string }

export const connectArticles = (View: ArticlesView, fetcher: ArticleFetcher) => () => {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    run(async () => {
      try {
        const articles = await fetcher.fetch()
        setState({ status: 'ready', articles })
      } catch (e) {
        setState({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' })
      }
    })
  }, [fetcher])

  return <View state={state} />
}
export type Articles = ReturnType<typeof connectArticles>

export function ArticlesView({ state }: { state: State }) {
  if (state.status === 'loading') {
    return (
      <ul className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
        ))}
      </ul>
    )
  }

  if (state.status === 'error') {
    return (
      <p className="text-red-500 dark:text-red-400 text-sm">
        Failed to load articles: {state.message}
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {state.articles.map((a) => (
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
