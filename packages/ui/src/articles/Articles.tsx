import { useEffect, useState } from 'react'
import type { ArticleFetcher, ArticleSample } from './articles-fetcher'
import { run } from '@/utils/index'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="space-y-2 py-4">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
            </div>
            {i < 5 && <Separator />}
          </div>
        ))}
      </div>
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
    <div>
      {state.articles.map((a, i) => (
        <div key={a.id}>
          <div className="py-4">
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="text-gray-900 dark:text-gray-100 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {a.title}
            </a>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>{a.readable_publish_date}</span>
              <span>·</span>
              <span>{a.reading_time_minutes} min read</span>
              {a.tag_list.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
          {i < state.articles.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  )
}
export type ArticlesView = typeof ArticlesView
