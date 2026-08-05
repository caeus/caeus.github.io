import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createArticleFetcher } from '@/articles/articles-fetcher'
import { connectApp } from './App'
import './assets/main.css'
import { ArticlesView, connectArticles } from './articles/Articles'

export function wire() {
  const fetcher = createArticleFetcher('caeus', 10)
  const Articles = connectArticles(ArticlesView, fetcher)
  const App = connectApp(Articles)

  createRoot(document.getElementById('app')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
