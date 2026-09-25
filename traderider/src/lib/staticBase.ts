/** Public path the static desk is served from. GitHub Pages default is `/traderider/v2/`. `./` stays relative for a file:// folder. */
export function normalizeBasePath(raw: string | undefined): string {
  const value = (raw ?? '/traderider/v2/').trim()
  if (value === '' || value === '/') return '/'
  if (value === '.' || value === './') return './'
  if (value.startsWith('./')) {
    const rest = value.slice(2)
    if (rest === '') return './'
    return rest.endsWith('/') ? `./${rest}` : `./${rest}/`
  }
  const withLead = value.startsWith('/') ? value : `/${value}`
  return withLead.endsWith('/') ? withLead : `${withLead}/`
}
