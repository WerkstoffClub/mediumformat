export type RecordFormat = 'LP' | '2xLP' | '3xLP' | '12_INCH' | '7_INCH' | 'CD' | '2xCD' | 'CASSETTE' | 'MERCH';

/** Discogs grading scale, best → worst: Mint, Very Good Plus, Very Good, Good Plus, Good, Fair, Poor */
export type RecordCondition = 'M' | 'VGP' | 'VG' | 'GP' | 'G' | 'F' | 'P';

export const RECORD_CONDITION_LABELS: Record<RecordCondition, string> = {
  M:   'Mint',
  VGP: 'Very Good Plus',
  VG:  'Very Good',
  GP:  'Good Plus',
  G:   'Good',
  F:   'Fair',
  P:   'Poor',
};

export type StoreLocation = 'MAIN_STORE' | 'WAREHOUSE' | 'CONSIGNMENT';

export interface Release {
  id: string;
  artist: string;
  title: string;
  label: string | null;
  catNumber: string | null;
  year: number | null;
  format: RecordFormat;
  genre: string | null;
  condition: RecordCondition;
  priceIdr: number;
  stock: number;
  notes: string | null;
  costIdr?: number | null;
  dealposProductId?: string | null;
  dealposVariantId?: string | null;
  imageUrl: string | null;
  barcode: string | null;
  storeLocation: StoreLocation;
  shelfLocation: string | null;
  lowStockThreshold: number;
  discogsId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseListItem extends Pick<Release,
  'id' | 'artist' | 'title' | 'label' | 'catNumber' | 'format' | 'condition' |
  'priceIdr' | 'stock' | 'storeLocation' | 'shelfLocation' |
  'barcode' | 'imageUrl' | 'lowStockThreshold'
> {}

export interface CreateReleaseInput extends Omit<Release,
  'id' | 'createdAt' | 'updatedAt'
> {}
