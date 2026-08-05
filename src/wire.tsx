import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createArticleFetcher } from '@/articles/articles-fetcher'
import { connectApp } from '@/app/index'
import './assets/main.css'
import { ArticlesView, connectArticles } from '@/articles/Articles'
import { raise } from '@/utils/index'
import { connectProfile } from '@/profile/index'
import { profileConfig } from '@/profile/config'

export function wire() {
  const fetcher = createArticleFetcher('caeus', 10)
  const Articles = connectArticles(ArticlesView, fetcher)
  const Profile = connectProfile(profileConfig)
  const App = connectApp(Articles, Profile)
  const mountNode = document.getElementById('app') ?? raise(new Error('Mount node not found'))

  createRoot(mountNode).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
