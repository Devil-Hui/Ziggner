import { describe, expect, it } from 'vitest'

import { optionalMediaUrl } from './mediaUrl'

describe('optionalMediaUrl', () => {
  it('preserves usable URLs and removes blank values before rendering media', () => {
    expect(optionalMediaUrl('/media/product.jpg')).toBe('/media/product.jpg')
    expect(optionalMediaUrl('  https://cdn.example.test/p.jpg  ')).toBe('https://cdn.example.test/p.jpg')
    expect(optionalMediaUrl('')).toBeUndefined()
    expect(optionalMediaUrl('   ')).toBeUndefined()
    expect(optionalMediaUrl(null)).toBeUndefined()
  })
})
