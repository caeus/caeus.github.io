import type { ReactNode } from 'react'

export interface ProfileLink {
  href: string
  label: string
  icon: ReactNode
}

export interface ProfileConfig {
  name: string
  bio: string
  avatarUrl: string
  links: ProfileLink[]
}

export const connectProfile = (config: ProfileConfig) => () => (
  <div>
    <div className="flex items-center gap-4 mb-4">
      <img
        src={config.avatarUrl}
        alt={config.name}
        className="w-16 h-16 rounded-full object-cover"
      />
      <h1 className="text-3xl font-bold tracking-tight">{config.name}</h1>
    </div>
    <p className="text-gray-500 dark:text-gray-400 mb-4 whitespace-pre-line">{config.bio}</p>
    <div className="flex gap-4">
      {config.links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          {link.icon}
        </a>
      ))}
    </div>
  </div>
)

export type Profile = ReturnType<typeof connectProfile>
