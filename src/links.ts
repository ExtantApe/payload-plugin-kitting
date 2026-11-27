/**
 * Supplier contact details are typed by staff and shown as links on the Supplies page. Each one becomes a link only
 * when it's safe to open, and otherwise shows as plain text, so a stored value can never run script, open
 * another scheme, or add hidden mail fields.
 */

/** Characters that never belong in a link: control characters, spaces, backslashes, quotes and angle brackets. */
const UNSAFE = /[\u0000- \u007f\\"'<>`]/

/**
 * A `mailto:` link for one plain address, or null. Anything that could add mail fields or more recipients
 * (`?`, `&`, `#`, `%`, `,`, `;`) or isn’t a single address with a dotted domain is refused.
 */
export function mailtoHref(email: unknown): string | null {
  if (typeof email !== 'string' || email.length > 254 || UNSAFE.test(email)) return null
  if (!/^[A-Za-z0-9.!$*+/=^_{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email)) return null
  return `mailto:${email}`
}

/**
 * A web link for a supplier's site, or null. A bare `example.com/order` gets `https://` in front. Only http and
 * https links with a real host and no user name or password are allowed.
 */
export function websiteHref(website: unknown): string | null {
  if (typeof website !== 'string') return null
  const v = website.trim()
  if (!v || UNSAFE.test(v)) return null
  const withScheme = /^[A-Za-z][A-Za-z0-9+.-]*:/.test(v) ? v : `https://${v}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!url.hostname || url.username || url.password) return null
  if (!/^https?:\/\/[^/]/i.test(withScheme)) return null
  return url.href
}

/** A `tel:` link from the digits and a leading plus, or null when there are no digits. */
export function telHref(phone: unknown): string | null {
  if (typeof phone !== 'string') return null
  const digits = phone.replace(/[^+\d]/g, '').replace(/(?!^)\+/g, '')
  return /\d/.test(digits) ? `tel:${digits}` : null
}
