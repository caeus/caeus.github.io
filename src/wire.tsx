import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createArticleFetcher } from '@/articles/articles-fetcher'
import { connectApp } from './App'
import './assets/main.css'
import { ArticlesView, connectArticles } from './articles/Articles'
import { raise } from '@/utils'

export function wire() {
  const fetcher = createArticleFetcher('caeus', 10)
  const Articles = connectArticles(ArticlesView, fetcher)
  const App = connectApp(Articles)
  const mountNode = document.getElementById('app') ?? raise(new Error('Mount node not found'))

  createRoot(mountNode).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
