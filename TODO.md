# Site ideas

## Quick wins
- [ ] **Article metadata** — date + reading time under each title (already in dev.to API response, just not rendered)
- [ ] **Open Graph meta tags** — `og:title`, `og:description`, `og:image` in `index.html` so link previews look good
- [ ] **LinkedIn icon** in Profile links

## Medium effort
- [ ] **Dark mode toggle** — button that flips a class on `<html>` and persists to `localStorage`; Tailwind dark classes already in place
- [ ] **Article tags** — show tags under each article, optionally filter by tag
- [ ] **Profile image** — use the dev.to avatar (already fetched the URL via API earlier)

## More involved
- [ ] **GitHub Actions CI** — auto `yarn build` + commit `docs/` on push, so manual build step goes away
- [ ] **Projects section** — pull pinned repos from GitHub API, show name + description + stars
- [ ] **About/detail page** — second route with longer bio, tech stack, timeline, etc.
- [ ] **RSS feed** — static `feed.xml` generated at build time from the dev.to articles
