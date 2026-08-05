import type { ProfileConfig } from '@/profile/index'
import { GithubIcon, DevtoIcon, StackOverflowIcon, LinkedInIcon } from '@/profile/icons'

export const profileConfig: ProfileConfig = {
  name: 'Alejandro Navas',
  bio: `Writes code. Sometimes, it even works.
  Over-engineering is bad, under-engineering is worse.
  Spends too much time naming things.
  Has dogs. They do not respect him.`,
  avatarUrl: '/avatar.jpg',
  links: [
    { href: 'https://github.com/caeus', label: 'GitHub', icon: <GithubIcon /> },
    { href: 'https://dev.to/caeus', label: 'dev.to', icon: <DevtoIcon /> },
    {
      href: 'https://stackoverflow.com/users/2142728/caeus',
      label: 'Stack Overflow',
      icon: <StackOverflowIcon />
    },
    { href: 'https://linkedin.com/in/caeus', label: 'LinkedIn', icon: <LinkedInIcon /> }
  ]
}
