import type { CollectionConfig, Config } from 'payload'
import { describe, expect, it } from 'vitest'

import { kittingPlugin, mailtoHref, telHref, websiteHost, websiteHref } from '../src/index.js'

// Supplier details are typed by staff and shown as links on the Supplies page. A stored value must never
// become a script link, another scheme, or a mailto with hidden fields.
describe('supplier contact links', () => {
  it('links a plain email address and refuses anything that adds mail fields or recipients', () => {
    expect(mailtoHref('orders@example.com')).toBe('mailto:orders@example.com')
    expect(mailtoHref('first.last+kits@lab.supply.example')).toBe('mailto:first.last+kits@lab.supply.example')
    for (const bad of [
      'orders@example.com?bcc=spy@evil.example',
      'orders@example.com&body=x',
      'a@example.com,b@evil.example',
      'a@example.com;b@evil.example',
      'orders@example.com#x',
      'orders%40example.com',
      'javascript:alert(1)//@example.com',
      'orders@example.com\n',
      '<a@example.com>',
      'not-an-email',
      'a@b',
      42,
      null,
    ])
      expect(mailtoHref(bad)).toBeNull()
  })

  it('links http and https sites, adds https to a bare address, and refuses other schemes', () => {
    expect(websiteHref('example.com/order')).toBe('https://example.com/order')
    expect(websiteHref('https://example.com/order?x=1')).toBe('https://example.com/order?x=1')
    expect(websiteHref('http://example.com')).toBe('http://example.com/')
    for (const bad of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      ' javascript:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:x',
      'file:///etc/passwd',
      'http:example.com',
      'https:/example.com',
      'https://user:pw@evil.example',
      'https://',
      '//evil.example',
      'https://exa mple.com',
      '',
      7,
    ])
      expect(websiteHref(bad)).toBeNull()
  })

  it('makes a tel link only from text shaped like a phone number', () => {
    expect(telHref('+1 (555) 010-0199')).toBe('tel:+15550100199')
    expect(telHref('555.010.0199')).toBe('tel:5550100199')
    expect(telHref(' 555 0100 ')).toBe('tel:5550100')
    expect(telHref('+123456789012345')).toBe('tel:+123456789012345')
    for (const notAPhone of [
      'javascript:alert(1)',
      'call us',
      'call 555 010 0199',
      '555 010 0199 ext 4',
      'tel:5550100199',
      '555+0100199',
      '++15550100199',
      '+',
      '()',
      '555-010', // six digits: too short to dial
      '1234567890123456', // sixteen digits: longer than any phone number
      '555\n0100199',
      '555\t0100199',
      '５５５０１００１９９', // full-width digits
      '',
      5550100199,
      null,
    ])
      expect(telHref(notAPhone), String(notAPhone)).toBeNull()
  })

  it('allows a port after the host, with or without the scheme, and nothing else new', () => {
    expect(websiteHref('https://supplier.test:8443/x')).toBe('https://supplier.test:8443/x')
    expect(websiteHref('supplier.test:8443/x')).toBe('https://supplier.test:8443/x')
    expect(websiteHref('supplier.test:8443')).toBe('https://supplier.test:8443/')
    expect(websiteHref('192.0.2.7:8080/order?x=1')).toBe('https://192.0.2.7:8080/order?x=1')
    for (const bad of [
      'javascript:8443',
      'javascript:8443/x',
      'tel:5550100',
      'mailto:80',
      'supplier.test:99999', // no such port
      'supplier.test:80x',
      'supplier.test:',
      'a.b:1@evil.example', // a user name and password, not a port
      'user:8443@evil.example',
      'java.script:alert(1)',
      'supplier.test:8443\\x',
    ])
      expect(websiteHref(bad), bad).toBeNull()
  })

  it('names a website by its host, and only when the link itself is allowed', () => {
    expect(websiteHost('https://www.supplier.test/order/kits?ref=a1b2c3#top')).toBe('www.supplier.test')
    expect(websiteHost('supplier.test/order')).toBe('supplier.test')
    expect(websiteHost('https://supplier.test:8443/x')).toBe('supplier.test:8443')
    expect(websiteHost('HTTP://Supplier.TEST')).toBe('supplier.test')
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'https://user:pw@evil.example', 'https://', '//evil.example', '', 7, null]) {
      expect(websiteHost(bad), String(bad)).toBeNull()
      expect(websiteHref(bad), String(bad)).toBeNull()
    }
  })

  it('refuses a supplier website that would not open as a web page', () => {
    const config = kittingPlugin()({ collections: [] } as unknown as Config) as Config
    const suppliers = config.collections!.find((c: CollectionConfig) => c.slug === 'suppliers')!
    const website = suppliers.fields.find((f: CollectionConfig['fields'][number]) => 'name' in f && f.name === 'website') as { validate: (v: unknown) => unknown }
    expect(website.validate('example.com/order')).toBe(true)
    expect(website.validate('supplier.test:8443/x')).toBe(true)
    expect(website.validate('')).toBe(true)
    expect(website.validate(undefined)).toBe(true)
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'https://user:pw@evil.example']) expect(website.validate(bad)).not.toBe(true)
  })
})
