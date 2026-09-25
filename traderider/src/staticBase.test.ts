import { expect, test } from 'vitest'
import { normalizeBasePath } from './lib/staticBase'

test('normalizeBasePath defaults to the Pages sub-path and keeps a trailing slash', () => {
  expect(normalizeBasePath(undefined)).toBe('/traderider/v2/')
  expect(normalizeBasePath('')).toBe('/')
  expect(normalizeBasePath('/')).toBe('/')
  expect(normalizeBasePath('/traderider/v2')).toBe('/traderider/v2/')
  expect(normalizeBasePath('traderider/v2/')).toBe('/traderider/v2/')
  expect(normalizeBasePath('  /custom/path  ')).toBe('/custom/path/')
  expect(normalizeBasePath('./')).toBe('./')
  expect(normalizeBasePath('.')).toBe('./')
  expect(normalizeBasePath('./traderider')).toBe('./traderider/')
})
