import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DealposClient } from './dealpos.client';
import { DpProduct, mapVariantToRelease } from './dealpos.mapper';

export const SYNC_ENTITIES = [
  'outlets',
  'suppliers',
  'customers',
  'paymentMethods',
  'products',
  'inventory',
  'invoices',
  'bills',
] as const;
export type SyncEntity = (typeof SYNC_ENTITIES)[number];

export interface SyncResult {
  entity: SyncEntity;
  status: 'ok' | 'error';
  upserted: number;
  skipped: number;
  message?: string;
}

interface EntityRunResult {
  upserted: number;
  skipped: number;
  cursor?: string;
}

const PAGE_SIZE = 100;
/** Re-scan window so late edits to recent documents are picked up. */
const CURSOR_OVERLAP_MS = 24 * 60 * 60 * 1000;
const EPOCH_FROM = '2000-01-01';

const dec = (v: unknown): Prisma.Decimal | null =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? null
    : new Prisma.Decimal(Number(v));
const dateOrNull = (v: unknown): Date | null => {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) || d.getFullYear() < 1902 ? null : d;
};

interface DpInvoiceRow {
  ID: string;
  Outlet?: string;
  Number: string;
  Customer?: string;
  Date: string;
  Amount: number;
  Payment?: string;
  Fulfillment?: string;
  Created: string;
  Tag?: string;
  Variants?: Array<{
    VariantID?: string; Name?: string; Code?: string; Quantity?: number;
    Cost?: number; Price?: number; DiscountAmount?: number; Sales?: number; Tax?: number;
  }>;
  Payments?: Array<{ Date?: string; Amount?: number; Method?: string; Code?: string; Note?: string }>;
}

interface DpBillRow {
  ID: string; Outlet?: string; Number: string; Supplier?: string; Type?: string;
  Date: string; Due?: string; Amount: number; Delivery?: string; Payment?: string; Created?: string;
}

@Injectable()
export class DealposSyncService {
  private readonly logger = new Logger(DealposSyncService.name);
  private running = false;

  constructor(
    private prisma: PrismaService,
    private client: DealposClient,
  ) {}

  get isRunning() {
    return this.running;
  }

  async getStatus() {
    return this.prisma.syncState.findMany({ orderBy: { entity: 'asc' } });
  }

  /** Run all (or one) entity syncs; per-entity failures don't abort the run. */
  async syncAll(only?: SyncEntity): Promise<SyncResult[]> {
    if (!this.client.isConfigured) {
      throw new Error('DealPOS credentials are not configured (DEALPOS_* env vars)');
    }
    if (this.running) throw new Error('A DealPOS sync is already running');
    this.running = true;
    try {
      const entities = only ? [only] : [...SYNC_ENTITIES];
      const results: SyncResult[] = [];
      for (const entity of entities) {
        results.push(await this.runEntity(entity));
      }
      return results;
    } finally {
      this.running = false;
    }
  }

  private async runEntity(entity: SyncEntity): Promise<SyncResult> {
    await this.prisma.syncState.upsert({
      where: { entity },
      create: { entity, status: 'running' },
      update: { status: 'running', message: null },
    });
    try {
      const result: EntityRunResult = await this[entity]();
      await this.prisma.syncState.update({
        where: { entity },
        data: {
          status: 'ok',
          lastRunAt: new Date(),
          message: `upserted ${result.upserted}, skipped ${result.skipped}`,
          ...(result.cursor ? { cursor: result.cursor } : {}),
        },
      });
      return { entity, status: 'ok', ...result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`sync ${entity} failed: ${message}`);
      await this.prisma.syncState.update({
        where: { entity },
        data: { status: 'error', lastRunAt: new Date(), message: message.slice(0, 500) },
      });
      return { entity, status: 'error', upserted: 0, skipped: 0, message };
    }
  }

  private async outlets() {
    const rows = await this.client.get<Array<{ ID: string; Name: string; Code?: string; Suspended?: boolean }>>(
      '/api/v3/Outlet',
    );
    let upserted = 0;
    for (const o of rows ?? []) {
      if (!o.ID || !o.Name) continue;
      await this.prisma.dpOutlet.upsert({
        where: { id: o.ID },
        create: { id: o.ID, name: o.Name, code: o.Code ?? null, suspended: o.Suspended ?? false },
        update: { name: o.Name, code: o.Code ?? null, suspended: o.Suspended ?? false },
      });
      upserted++;
    }
    return { upserted, skipped: (rows?.length ?? 0) - upserted };
  }

  private async suppliers() {
    let upserted = 0, skipped = 0;
    for await (const page of this.client.paginate<{ Name?: string; Code?: string; Phone?: string; Mobile?: string; Email?: string }>(
      '/api/v3/Supplier', {}, PAGE_SIZE,
    )) {
      for (const s of page) {
        if (!s.Name) { skipped++; continue; }
        const data = { code: s.Code ?? null, phone: s.Phone ?? null, mobile: s.Mobile ?? null, email: s.Email ?? null };
        await this.prisma.dpSupplier.upsert({
          where: { name: s.Name },
          create: { name: s.Name, ...data },
          update: data,
        });
        upserted++;
      }
    }
    return { upserted, skipped };
  }

  private async customers() {
    let upserted = 0, skipped = 0;
    for await (const page of this.client.paginate<{ ID?: string; Name?: string; Code?: string; Mobile?: string; Email?: string; BirthDate?: string; JoinDate?: string }>(
      '/api/v3/Customer', {}, PAGE_SIZE,
    )) {
      for (const c of page) {
        if (!c.ID || !c.Name) { skipped++; continue; }
        const data = {
          name: c.Name, code: c.Code ?? null, mobile: c.Mobile ?? null, email: c.Email ?? null,
          birthDate: dateOrNull(c.BirthDate), joinDate: dateOrNull(c.JoinDate),
        };
        await this.prisma.dpCustomer.upsert({ where: { id: c.ID }, create: { id: c.ID, ...data }, update: data });
        upserted++;
      }
    }
    return { upserted, skipped };
  }

  private async paymentMethods() {
    const rows = await this.client.get<Array<{ ID: number; Name: string; Type?: string; Suspended?: boolean }>>(
      '/api/v3/PaymentMethod',
    );
    let upserted = 0;
    // The sample docs show duplicate IDs across rows; last write wins deliberately.
    for (const m of rows ?? []) {
      if (m.ID == null || !m.Name) continue;
      await this.prisma.dpPaymentMethod.upsert({
        where: { id: m.ID },
        create: { id: m.ID, name: m.Name, type: m.Type ?? null, suspended: m.Suspended ?? false },
        update: { name: m.Name, type: m.Type ?? null, suspended: m.Suspended ?? false },
      });
      upserted++;
    }
    return { upserted, skipped: (rows?.length ?? 0) - upserted };
  }

  /** Products + variants → Release rows (this is what populates Inventory). */
  private async products() {
    let upserted = 0, skipped = 0;
    for await (const page of this.client.paginate<DpProduct>(
      '/api/v3/Product',
      { QueryInventory: true },
      PAGE_SIZE,
      res => ((res as { DataArray?: DpProduct[] }).DataArray ?? (Array.isArray(res) ? (res as DpProduct[]) : [])),
    )) {
      for (const product of page) {
        for (const variant of product.Variants ?? []) {
          if (!variant.ID) { skipped++; continue; }
          try {
            const data = mapVariantToRelease(product, variant);
            const { dealposVariantId, barcode, ...rest } = data;
            const existingByBarcode = barcode
              ? await this.prisma.release.findFirst({ where: { barcode, dealposVariantId: null } })
              : null;
            if (existingByBarcode) {
              await this.prisma.release.update({
                where: { id: existingByBarcode.id },
                data: { ...rest, dealposVariantId },
              });
            } else {
              await this.prisma.release.upsert({
                where: { dealposVariantId },
                create: { ...rest, dealposVariantId, barcode, condition: 'M' },
                update: rest,
              });
            }
            upserted++;
          } catch (err) {
            skipped++;
            this.logger.warn(`product variant ${variant.ID} skipped: ${err instanceof Error ? err.message : err}`);
          }
        }
      }
    }
    return { upserted, skipped };
  }

  /** Refresh Release.stock from the Inventory endpoint (OnHand across outlets). */
  private async inventory() {
    const onHandByCode = new Map<string, number>();
    for await (const page of this.client.paginate<{ Code?: string; I?: { OnHand?: number } }>(
      '/api/v3/Inventory', {}, PAGE_SIZE,
    )) {
      for (const row of page) {
        if (!row.Code) continue;
        onHandByCode.set(row.Code, (onHandByCode.get(row.Code) ?? 0) + (row.I?.OnHand ?? 0));
      }
    }
    let upserted = 0, skipped = 0;
    for (const [code, onHand] of onHandByCode) {
      const stock = Math.max(0, Math.floor(onHand));
      const { count } = await this.prisma.release.updateMany({
        where: { OR: [{ barcode: code }, { catNumber: code }] },
        data: { stock },
      });
      if (count > 0) upserted += count; else skipped++;
    }
    return { upserted, skipped };
  }

  private async invoiceCursor(): Promise<string> {
    const state = await this.prisma.syncState.findUnique({ where: { entity: 'invoices' } });
    if (!state?.cursor) return EPOCH_FROM;
    return new Date(new Date(state.cursor).getTime() - CURSOR_OVERLAP_MS).toISOString().slice(0, 10);
  }

  private async invoices() {
    const from = await this.invoiceCursor();
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let upserted = 0, skipped = 0, maxCreated = '';

    for (let page = 1; ; page++) {
      const rows = await this.client.post<DpInvoiceRow[]>(
        '/api/v3/Invoice/MultipleOutlet/WithVariant',
        { From: from, To: to, PageNumber: page, PageSize: PAGE_SIZE },
        { IncludePayments: 'true' },
      );
      const list = Array.isArray(rows) ? rows : [];
      for (const inv of list) {
        if (!inv.ID || !inv.Number) { skipped++; continue; }
        try {
          await this.upsertInvoice(inv);
          upserted++;
          if (inv.Created > maxCreated) maxCreated = inv.Created;
        } catch (err) {
          skipped++;
          this.logger.warn(`invoice ${inv.Number} skipped: ${err instanceof Error ? err.message : err}`);
        }
      }
      if (list.length < PAGE_SIZE) break;
    }
    return { upserted, skipped, cursor: maxCreated || undefined };
  }

  private async upsertInvoice(inv: DpInvoiceRow) {
    const date = dateOrNull(inv.Date) ?? new Date();
    const created = dateOrNull(inv.Created) ?? date;
    const base = {
      number: inv.Number,
      outlet: inv.Outlet ?? null,
      customerName: inv.Customer || null,
      tag: inv.Tag || null,
      date,
      created,
      amount: dec(inv.Amount) ?? new Prisma.Decimal(0),
      paymentStatus: inv.Payment ?? null,
      fulfillment: inv.Fulfillment ?? null,
      isVoid: false,
    };
    await this.prisma.$transaction(async tx => {
      await tx.dpInvoice.upsert({
        where: { id: inv.ID },
        create: { id: inv.ID, ...base },
        update: base,
      });
      await tx.dpInvoiceLine.deleteMany({ where: { invoiceId: inv.ID } });
      await tx.dpInvoicePayment.deleteMany({ where: { invoiceId: inv.ID } });
      if (inv.Variants?.length) {
        await tx.dpInvoiceLine.createMany({
          data: inv.Variants.filter(v => v.Name != null || v.VariantID).map(v => ({
            invoiceId: inv.ID,
            variantId: v.VariantID ?? null,
            name: v.Name ?? '(unnamed)',
            code: v.Code ?? null,
            quantity: dec(v.Quantity) ?? new Prisma.Decimal(0),
            cost: dec(v.Cost),
            price: dec(v.Price) ?? new Prisma.Decimal(0),
            discountAmount: dec(v.DiscountAmount),
            sales: dec(v.Sales),
            tax: dec(v.Tax),
          })),
        });
      }
      if (inv.Payments?.length) {
        await tx.dpInvoicePayment.createMany({
          data: inv.Payments.filter(p => p.Method).map(p => ({
            invoiceId: inv.ID,
            date: dateOrNull(p.Date),
            amount: dec(p.Amount) ?? new Prisma.Decimal(0),
            method: p.Method as string,
            code: p.Code ?? null,
            note: p.Note ?? null,
          })),
        });
      }
    });
  }

  private async bills() {
    let upserted = 0, skipped = 0;
    for (let page = 1; ; page++) {
      const res = await this.client.get<{ Data?: DpBillRow[] } | DpBillRow[]>(
        '/api/v3/Bill/WithTotalCount',
        { From: EPOCH_FROM, To: new Date(Date.now() + 86400000).toISOString().slice(0, 10), PageNumber: page, PageSize: PAGE_SIZE },
      );
      const list = Array.isArray(res) ? res : (res.Data ?? []);
      for (const bill of list) {
        if (!bill.ID || !bill.Number) { skipped++; continue; }
        try {
          await this.upsertBill(bill);
          upserted++;
        } catch (err) {
          skipped++;
          this.logger.warn(`bill ${bill.Number} skipped: ${err instanceof Error ? err.message : err}`);
        }
      }
      if (list.length < PAGE_SIZE) break;
    }
    return { upserted, skipped };
  }

  private async upsertBill(bill: DpBillRow) {
    interface BillDetail {
      Gross?: number; Tax?: number; Purchase?: number;
      Variants?: Array<{ VariantID?: string; Name?: string; Code?: string; Quantity?: number; Price?: number; Discount?: number }>;
    }
    let detail: BillDetail = {};
    try {
      detail = await this.client.get<BillDetail>('/api/v3/Bill/Detail', { id: bill.ID });
    } catch {
      this.logger.warn(`bill detail unavailable for ${bill.Number}; storing header only`);
    }
    const base = {
      number: bill.Number,
      outlet: bill.Outlet ?? null,
      supplierName: bill.Supplier ?? null,
      type: bill.Type ?? null,
      date: dateOrNull(bill.Date) ?? new Date(),
      due: dateOrNull(bill.Due),
      created: dateOrNull(bill.Created),
      amount: dec(bill.Amount) ?? new Prisma.Decimal(0),
      gross: dec(detail.Gross),
      tax: dec(detail.Tax),
      purchase: dec(detail.Purchase),
      delivery: bill.Delivery ?? null,
      paymentStatus: bill.Payment ?? null,
    };
    await this.prisma.$transaction(async tx => {
      await tx.dpBill.upsert({ where: { id: bill.ID }, create: { id: bill.ID, ...base }, update: base });
      await tx.dpBillLine.deleteMany({ where: { billId: bill.ID } });
      if (detail.Variants?.length) {
        await tx.dpBillLine.createMany({
          data: detail.Variants.map(v => ({
            billId: bill.ID,
            variantId: v.VariantID ?? null,
            name: v.Name ?? '(unnamed)',
            code: v.Code ?? null,
            quantity: dec(v.Quantity) ?? new Prisma.Decimal(0),
            price: dec(v.Price) ?? new Prisma.Decimal(0),
            discount: dec(v.Discount),
          })),
        });
      }
    });
  }
}
