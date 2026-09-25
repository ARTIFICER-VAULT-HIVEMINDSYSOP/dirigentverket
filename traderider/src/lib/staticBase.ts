/** Public path the static desk is served from. GitHub Pages default is `/traderider/v2/`. */
export function normalizeBasePath(raw: string | undefined): string {
  const value = (raw ?? '/traderider/v2/').trim()
  if (value === '' || value === '/') return '/'
  const withLead = value.startsWith('/') ? value : `/${value}`
  return withLead.endsWith('/') ? withLead : `${withLead}/`
}
