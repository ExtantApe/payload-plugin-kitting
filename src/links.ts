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

/** A bare host with a port, like `example.com:8443/order`: dotted, so it can't be read as a scheme such as `tel:` or `javascript:`. */
const HOST_AND_PORT = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+:\d{1,5}(?:[/?#]|$)/

/** The parsed address when it's one the Supplies page may link to, or null. Every website rule lives here. */
function safeUrl(website: unknown): URL | null {
  if (typeof website !== 'string') return null
  const v = website.trim()
  if (!v || UNSAFE.test(v)) return null
  const withScheme = /^[A-Za-z][A-Za-z0-9+.-]*:/.test(v) && !HOST_AND_PORT.test(v) ? v : `https://${v}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!url.hostname || url.username || url.password) return null
  if (!/^https?:\/\/[^/]/i.test(withScheme)) return null
  return url
}

/**
 * A web link for a supplier's site, or null. A bare `example.com/order` gets `https://` in front, and so does a
 * bare `example.com:8443/order`. Only http and https links with a real host and no user name or password are
 * allowed.
 */
export function websiteHref(website: unknown): string | null {
  return safeUrl(website)?.href ?? null
}

/**
 * The host of a supplier's site (`www.example.com`, with `:8443` when it names a port), to show as the link's
 * text, or null whenever `websiteHref` would refuse the address.
 */
export function websiteHost(website: unknown): string | null {
  return safeUrl(website)?.host ?? null
}

/**
 * A `tel:` link, or null. Only text shaped like a phone number is linked: digits, an optional plus at the very
 * start, and spaces, dashes, dots and parentheses between them, with 7 to 15 digits in all (15 is the longest
 * an international number gets). Words, extensions and anything else stay plain text.
 */
export function telHref(phone: unknown): string | null {
  if (typeof phone !== 'string') return null
  const v = phone.trim()
  if (v.length > 40 || !/^\+?[0-9 ().-]+$/.test(v)) return null
  const digits = v.replace(/[^0-9]/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  return `tel:${v.startsWith('+') ? '+' : ''}${digits}`
}
