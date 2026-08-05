import type { Articles } from './articles/Articles'

export const connectApp = (Articles: Articles) => () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <main className="max-w-2xl mx-auto px-6 py-16">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Caeus</h1>
        <p className="text-gray-500 dark:text-gray-400">Writing on software and things.</p>
      </header>
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">
          Articles
        </h2>
        <Articles />
      </section>
    </main>
  </div>
)
