export enum SalesChannel {
  SHOPEE = 'SHOPEE',
  TOKOPEDIA = 'TOKOPEDIA',
  WEBSITE = 'WEBSITE',
  POS = 'POS',
  DISCOGS = 'DISCOGS',
}

export enum ImportOrigin {
  INTERNATIONAL = 'INTERNATIONAL',
  DOMESTIC = 'DOMESTIC',
}

export enum ImportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CONSOLIDATED = 'CONSOLIDATED',
  PRICED = 'PRICED',
  RECEIVED = 'RECEIVED',
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

/** Timeline steps shown on the import order detail page (CONSOLIDATED is skipped for domestic orders). */
export const IMPORT_STATUS_STEPS: readonly ImportStatus[] = [
  ImportStatus.SUBMITTED,
  ImportStatus.CONSOLIDATED,
  ImportStatus.PRICED,
  ImportStatus.RECEIVED,
  ImportStatus.INVENTORY_UPDATED,
];
