import { Release, SocialSettings } from '@prisma/client';

export interface FeedRow {
  id: string;
  title: string;
  description: string;
  availability: 'in stock' | 'out of stock';
  condition: 'new' | 'used';
  price: string;
  link: string;
  image_link: string;
  brand: string;
}

export interface ListingWarning {
  releaseId: string;
  title: string;
  warnings: string[];
}

const idr = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** "+62 812-3456-789" / "0812 3456 789" → "628123456789" (wa.me format). */
export function normalizeWaPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function fillTemplate(
  template: string,
  vars: { artist: string; title: string; price: string },
): string {
  return template
    .replace(/\{artist\}/g, vars.artist)
    .replace(/\{title\}/g, vars.title)
    .replace(/\{price\}/g, vars.price);
}

export function buildWaLink(
  phone: string,
  template: string,
  vars: { artist: string; title: string; price: string },
): string {
  const text = fillTemplate(template, vars);
  return `https://wa.me/${normalizeWaPhone(phone)}?text=${encodeURIComponent(text)}`;
}

export function releaseDisplayTitle(release: Pick<Release, 'artist' | 'title'>): string {
  return `${release.artist} – ${release.title}`;
}

export function formatPriceIdr(priceIdr: number): string {
  return `Rp ${idr.format(priceIdr)}`;
}

/** Map a Release to a Meta Commerce Catalog feed row. */
export function releaseToFeedRow(release: Release, settings: SocialSettings): FeedRow {
  const title = releaseDisplayTitle(release);
  const price = formatPriceIdr(release.priceIdr);
  const link = settings.storefrontUrlBase
    ? `${settings.storefrontUrlBase.replace(/\/$/, '')}/${release.id}`
    : settings.waPhone
      ? buildWaLink(settings.waPhone, settings.waTemplate, { artist: release.artist, title: release.title, price })
      : '';
  const description = [
    release.format.replace(/_/g, ' '),
    release.genre,
    release.label && `Label: ${release.label}`,
    release.catNumber && `Cat# ${release.catNumber}`,
    release.year && `(${release.year})`,
  ].filter(Boolean).join(' · ');
  return {
    id: release.id,
    title,
    description: description || title,
    availability: release.stock > 0 ? 'in stock' : 'out of stock',
    condition: release.condition === 'M' ? 'new' : 'used',
    price: `${release.priceIdr} IDR`,
    link,
    image_link: release.imageUrl ?? '',
    brand: release.label ?? 'Medium Format',
  };
}

export function listingWarnings(release: Release, settings: SocialSettings): string[] {
  const warnings: string[] = [];
  if (!release.imageUrl) warnings.push('no image — Meta will reject this item');
  if (release.priceIdr <= 0) warnings.push('price is zero');
  if (release.stock <= 0) warnings.push('out of stock (listed as unavailable)');
  if (!settings.waPhone && !settings.storefrontUrlBase) warnings.push('no WhatsApp number or storefront URL — link is empty');
  return warnings;
}
