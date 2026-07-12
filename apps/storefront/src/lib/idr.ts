const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatIDR(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Rp —';
  return idrFormatter.format(value);
}
