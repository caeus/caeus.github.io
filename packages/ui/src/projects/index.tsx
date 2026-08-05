export interface ProjectConfig {
  readonly name: string
  readonly description: string
  readonly url: string
}

export const connectProjects = (projects: readonly ProjectConfig[]) => () => (
  <div>
    {projects.map((p, i) => (
      <div key={p.url}>
        <div className="py-4">
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="text-gray-900 dark:text-gray-100 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {p.name}
          </a>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{p.description}</p>
        </div>
        {i < projects.length - 1 && (
          <div className="shrink-0 h-px w-full bg-gray-200 dark:bg-gray-800" />
        )}
      </div>
    ))}
  </div>
)

export type Projects = ReturnType<typeof connectProjects>
