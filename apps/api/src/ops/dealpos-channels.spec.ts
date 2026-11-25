import { invoiceChannel, placeholderChannel, tagChannel } from './dealpos-channels';

describe('DealPOS channel remap', () => {
  it('treats marketplace placeholder customers as channels, not people', () => {
    expect(placeholderChannel('TikTok')).toBe('Tokopedia');
    expect(placeholderChannel('  shopee ')).toBe('Shopee');
    expect(placeholderChannel('Rani Wijaya')).toBeNull();
    expect(placeholderChannel(null)).toBeNull();
  });

  it('normalises invoice tags', () => {
    expect(tagChannel('Penjualan Tiktok')).toBe('Tokopedia');
    expect(tagChannel('Penjualan Shopee')).toBe('Shopee');
    expect(tagChannel('Normal')).toBe('POS');
    expect(tagChannel('Penjualan Web')).toBe('Website');
    expect(tagChannel('Penjualan Instagram')).toBe('Instagram');
    expect(tagChannel(null)).toBeNull();
  });

  it('lets the placeholder customer win over the tag', () => {
    expect(invoiceChannel('TikTok', 'Normal')).toBe('Tokopedia');
    expect(invoiceChannel('Rani Wijaya', 'Penjualan Web')).toBe('Website');
    expect(invoiceChannel(null, null)).toBe('Direct');
  });
});
