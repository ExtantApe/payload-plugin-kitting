import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { StockRow } from '../src/stock.js'

// The Supplies page rendered to HTML, with Payload's admin shell stubbed and a made-up stock report: three
// suppliers below level, one with contact details that are safe to open, one with details that aren't, and one
// whose website carries a port.
const row = (id: string, name: string, supplier: StockRow['supplier']): StockRow => ({
  id,
  name,
  unit: 'each',
  sku: null,
  onHand: 1,
  lowStockLevel: 5,
  reorderQuantity: 10,
  suggestedReorder: 10,
  below: true,
  retired: false,
  belowLevelSince: null,
  alertStatus: null,
  alertAt: null,
  alertNote: null,
  supplier,
  scope: null,
  scopeName: null,
  lots: [],
  usable: 1,
  shrinkagePercent: null,
})
const below = [
  row('i1', 'Swabs', { id: 's1', name: 'Good Supply Co', email: 'orders@good.example', phone: '+1 (555) 010-0199', website: 'https://www.good.example/order/kits?ref=a1b2c3' }),
  row('i2', 'Tubes', { id: 's2', name: 'Odd Supply Co', email: 'orders@odd.example?bcc=spy@evil.example', phone: 'ask for the desk, 555 010 0199', website: 'javascript:alert(1)' }),
  row('i3', 'Labels', { id: 's3', name: 'Port Supply Co', website: 'port.example:8443/x' }),
]

vi.mock('@payloadcms/next/templates', () => ({ DefaultTemplate: ({ children }: { children: unknown }) => children }))
vi.mock('@payloadcms/ui', () => ({ Button: () => null, toast: {}, useConfig: () => ({ config: { routes: { api: '/api' } } }) }))
vi.mock('../src/stock.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/stock.js')>()),
  stockReport: async () => ({ rows: below, below, expiring: [] }),
  sendPendingAlerts: async () => undefined,
}))

const { SuppliesView } = await import('../src/rsc/index.js')

const payload = {
  config: {
    routes: { admin: '/admin', api: '/api' },
    custom: { kitting: { manage: () => false, read: () => true, items: 'supply-items', recipes: 'supply-recipes', lots: 'supply-lots', movements: 'supply-movements', units: 'supply-units', requests: 'supply-requests', suppliers: 'supply-suppliers', autoWriteOff: false } },
  },
  find: async () => ({ docs: [], totalDocs: 0 }),
  count: async () => ({ totalDocs: 0 }),
  logger: { error: () => undefined },
}
const html = renderToStaticMarkup(
  await SuppliesView({ initPageResult: { req: { user: { id: 'u', collection: 'users' }, payload, i18n: {} }, permissions: {}, visibleEntities: {}, locale: undefined }, params: {}, searchParams: {} } as never),
)

/** The contact line of one supplier's reorder section: the paragraph between its heading and its table. */
const contactLine = (supplier: string) => {
  const section = html.slice(html.indexOf(`<section aria-label="Reorder from ${supplier}"`))
  return section.slice(section.indexOf('<p'), section.indexOf('<table'))
}
/** Every link in a piece of HTML, as its attributes and its text. */
const links = (part: string) => {
  const re = /<a ([^>]*)>([^<]*)<\/a>/g
  const out: { attrs: string | undefined; text: string | undefined }[] = []
  for (let m = re.exec(part); m; m = re.exec(part)) out.push({ attrs: m[1], text: m[2] })
  return out
}

describe('the Supplies page, rendered', () => {
  it('links a safe email, phone number and website, each with a name a screen reader can say', () => {
    const line = contactLine('Good Supply Co')
    expect(links(line)).toEqual([
      { attrs: 'href="mailto:orders@good.example" aria-label="Email orders@good.example"', text: 'orders@good.example' },
      { attrs: 'href="tel:+15550100199" aria-label="Call +1 (555) 010-0199"', text: '+1 (555) 010-0199' },
      {
        attrs: 'href="https://www.good.example/order/kits?ref=a1b2c3" aria-label="Website: www.good.example (opens in a new tab)" rel="noreferrer noopener" target="_blank"',
        text: 'www.good.example',
      },
    ])
    // The spoken name starts from what's on screen, so someone using voice control can say what they see.
    for (const { attrs, text } of links(line)) expect(attrs).toContain(text)
  })

  it('shows the website by its host, with the port when there is one, and keeps the whole address in the link', () => {
    expect(links(contactLine('Port Supply Co'))).toEqual([
      { attrs: 'href="https://port.example:8443/x" aria-label="Website: port.example:8443 (opens in a new tab)" rel="noreferrer noopener" target="_blank"', text: 'port.example:8443' },
    ])
    expect(contactLine('Good Supply Co')).not.toContain('>https://')
  })

  it('shows details that are not safe to open as plain text, with no link and no label', () => {
    const line = contactLine('Odd Supply Co')
    expect(links(line)).toEqual([])
    expect(line).not.toMatch(/href|aria-label|tel:|mailto:/)
    expect(line).toContain('<span>orders@odd.example?bcc=spy@evil.example</span>')
    expect(line).toContain('<span>ask for the desk, 555 010 0199</span>')
    expect(line).toContain('<span>javascript:alert(1)</span>')
  })
})
