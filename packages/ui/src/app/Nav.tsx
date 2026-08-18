import { NavLink } from 'react-router-dom'
import { cn } from '#lib/utils'

export function Nav() {
  return (
    <nav className="flex gap-6 text-sm font-medium">
      {[
        { to: '/articles', label: 'Articles' },
        { to: '/oss', label: 'Open Source' },
        { to: '/resume', label: 'Résumé' }
      ].map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors',
              isActive && 'text-gray-900 dark:text-gray-100 font-semibold'
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
