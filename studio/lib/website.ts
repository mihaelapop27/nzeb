/** "vasile.ro" / "www.vasile.ro" → "https://vasile.ro"; undefined when it isn't a usable address. */
export function formatWebsite(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return undefined
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return url.hostname.includes('.') ? url.href.replace(/\/$/, '') : undefined
  } catch {
    return undefined
  }
}
