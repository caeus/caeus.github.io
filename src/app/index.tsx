import type { Articles } from '@/articles/Articles'
import type { Profile } from '@/profile'

export const connectApp = (Articles: Articles, Profile: Profile) => () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Profile />
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">
          Articles
        </h2>
        <Articles />
      </section>
    </main>
  </div>
)
