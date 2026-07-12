import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createImport, IMPORT_ORIGINS, parseInvoice, PAYMENT_METHODS,
  type CreateImportInput, type ImportOrigin, type ParsedInvoice, type PaymentMethod,
} from '../../api/imports';
import { LineEditor } from './LineEditor';
import { Field, IMPORT_STATUS_LABEL, ORIGIN_LABEL, PAYMENT_METHOD_LABEL, PanelHeader, inputCls } from './shared';
import type { DraftLine } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

const linesFromParsed = (p: ParsedInvoice): DraftLine[] => p.lines.map(l => ({
  artist: l.artist,
  title: l.title,
  label: l.label ?? '',
  catNumber: l.catNumber ?? '',
  barcode: l.barcode ?? '',
  formatRaw: l.formatRaw,
  format: l.format,
  edition: l.edition ?? '',
  qty: l.qty,
  qtyBackorder: l.qtyBackorder,
  unitPriceNative: l.unitPrice,
  extendedNative: l.extended,
  weightKg: l.weightKg,
  lineValid: l.lineValid,
}));

export function NewImport() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);

  const [vendorName, setVendorName] = useState('');
  const [origin, setOrigin] = useState<ImportOrigin>('INTERNATIONAL');
  const [currency, setCurrency] = useState('');
  const [orderDate, setOrderDate] = useState(todayIso());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paidBy, setPaidBy] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const onPickFile = (f: File | null) => {
    setFile(f);
    setParseError(null);
  };

  const onParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const result = await parseInvoice(file);
      setParsed(result);
      setVendorName(result.vendorName ?? '');
      setCurrency((result.currency ?? '').toUpperCase());
      setOrderDate(result.orderDate ? result.orderDate.slice(0, 10) : todayIso());
      setLines(linesFromParsed(result));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setParseError(
        status === 429
          ? 'The invoice parser is rate-limited right now — wait a moment and try again.'
          : Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Could not parse this invoice. Try again or check the file.'),
      );
    } finally {
      setParsing(false);
    }
  };

  const startOver = () => {
    setParsed(null);
    setFile(null);
    setLines([]);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validate = (): string | null => {
    if (!vendorName.trim()) return 'Vendor name is required.';
    if (!currency.trim()) return 'Currency is required.';
    if (!orderDate) return 'Order date is required.';
    if (lines.length === 0) return 'Add at least one line.';
    if (lines.some(l => !l.artist.trim() || !l.title.trim())) return 'Every line needs an artist and title.';
    return null;
  };

  const onCreate = async () => {
    const err = validate();
    if (err) { setCreateError(err); return; }
    setCreateError(null);
    setCreating(true);
    try {
      const body: CreateImportInput = {
        vendorName: vendorName.trim(),
        origin,
        currency: currency.trim().toUpperCase(),
        orderDate: new Date(orderDate).toISOString(),
        vendorShippingNative: parsed?.vendorShippingNative,
        paymentMethod,
        paidBy: paymentMethod === 'CREDIT_CARD' ? (paidBy.trim() || undefined) : undefined,
        notes: notes.trim() || undefined,
        lines: lines.map(l => ({
          artist: l.artist.trim(),
          title: l.title.trim(),
          label: l.label.trim() || undefined,
          catNumber: l.catNumber.trim() || undefined,
          barcode: l.barcode.trim() || undefined,
          formatRaw: l.formatRaw.trim() || l.format,
          format: l.format,
          edition: l.edition.trim() || undefined,
          qty: Number(l.qty) || 0,
          qtyBackorder: Number(l.qtyBackorder) || 0,
          unitPriceNative: Number(l.unitPriceNative) || 0,
          extendedNative: Number(l.extendedNative) || 0,
          weightKg: Number(l.weightKg) || 0,
        })),
      };
      const created = await createImport(body);
      navigate(`/imports/${created.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setCreateError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create the import.'));
    } finally {
      setCreating(false);
    }
  };

  const subtotal = lines.reduce((s, l) => s + Number(l.extendedNative || 0), 0);
  const invalidCount = lines.filter(l => !l.lineValid).length;

  return (
    <div className="mx-auto w-full max-w-[940px] px-6 py-8 max-md:px-4 max-md:py-6 pb-24">
      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-3">
        <Link to="/purchase-orders?tab=imports" className="hover:text-[var(--text-primary)]">Imports</Link>
        <span className="text-[var(--text-faint)]">/</span>
        <span className="text-[var(--text-secondary)]">New import</span>
      </div>
      <h1 className="text-[22px] font-semibold tracking-[-0.03em] leading-7 text-[var(--text-primary)] mb-5">
        New import
      </h1>

      {!parsed && (
        <div className="border border-dashed border-[var(--border)] rounded-[10px] bg-[var(--bg-surface)] px-6 py-10 flex flex-col items-center text-center gap-3">
          <svg viewBox="0 0 24 24" className="w-9 h-9 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 12 15 15" />
          </svg>
          <div>
            <p className="text-[14px] font-medium text-[var(--text-primary)]">Upload a vendor invoice PDF</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">We'll parse it into line items you can review and correct below.</p>
          </div>

          <label className="mt-2 text-[12px] px-3.5 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors cursor-pointer">
            {file ? file.name : 'Choose PDF…'}
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={e => onPickFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          {parseError && <p className="text-[12px] text-[var(--danger)] max-w-md">{parseError}</p>}

          <button
            type="button"
            onClick={onParse}
            disabled={!file || parsing}
            className="mt-1 inline-flex items-center gap-2 text-[13px] px-4 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {parsing && (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12a9 9 0 11-9-9" strokeLinecap="round" />
              </svg>
            )}
            {parsing ? 'Parsing invoice…' : 'Parse invoice'}
          </button>
          {parsing && (
            <p className="text-[11px] text-[var(--text-faint)]">
              This can take up to two minutes — the parser reads every line off the PDF.
            </p>
          )}
        </div>
      )}

      {parsed && (
        <>
          {(!parsed.totalsReconcile || parsed.warnings.length > 0 || invalidCount > 0) && (
            <div className="mb-5 p-3 rounded-[6px] border border-[var(--warning)] bg-[var(--warning-t)] text-[12px] text-[var(--text-secondary)] space-y-1">
              {!parsed.totalsReconcile && <p className="font-semibold text-[var(--warning)]">The parsed line totals don't reconcile with the invoice total — double-check the figures below.</p>}
              {invalidCount > 0 && <p>{invalidCount} line{invalidCount === 1 ? '' : 's'} flagged for review (marked below).</p>}
              {parsed.warnings.map((w, i) => <p key={i}>· {w}</p>)}
            </div>
          )}

          {createError && (
            <div className="mb-5 text-[12px] text-[var(--danger)] border border-[var(--danger)] rounded-md px-3 py-2">
              {createError}
            </div>
          )}

          <div className="flex flex-col gap-6">
            <PanelHeader number={1} title="Vendor &amp; order" note={`Parsed from ${file?.name ?? 'invoice'}`}>
              <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                <Field label="Vendor name" required htmlFor="vendorName">
                  <input id="vendorName" className={inputCls} value={vendorName} onChange={e => setVendorName(e.target.value)} />
                </Field>
                <Field label="Origin" required htmlFor="origin">
                  <select id="origin" className={inputCls} value={origin} onChange={e => setOrigin(e.target.value as ImportOrigin)}>
                    {IMPORT_ORIGINS.map(o => <option key={o} value={o}>{ORIGIN_LABEL[o]}</option>)}
                  </select>
                </Field>
                <Field label="Currency" required htmlFor="currency">
                  <input id="currency" className={`${inputCls} font-mono uppercase`} value={currency} maxLength={3} onChange={e => setCurrency(e.target.value.toUpperCase())} />
                </Field>
                <Field label="Order date" required htmlFor="orderDate">
                  <input id="orderDate" type="date" className={inputCls} value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                </Field>
              </div>
            </PanelHeader>

            <PanelHeader number={2} title="Lines" note={`${lines.length} line${lines.length === 1 ? '' : 's'}`}>
              <LineEditor value={lines} currency={currency} onChange={setLines} />
            </PanelHeader>

            <PanelHeader number={3} title="Payment &amp; notes">
              <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                <Field label="Payment method" required htmlFor="paymentMethod">
                  <select id="paymentMethod" className={inputCls} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                  </select>
                </Field>
                {paymentMethod === 'CREDIT_CARD' && (
                  <Field label="Paid by" htmlFor="paidBy">
                    <input id="paidBy" className={inputCls} placeholder="Card holder" value={paidBy} onChange={e => setPaidBy(e.target.value)} />
                  </Field>
                )}
                <div className="col-span-2">
                  <Field label="Notes" htmlFor="notes">
                    <textarea id="notes" rows={2} className={`${inputCls} resize-none`} value={notes} onChange={e => setNotes(e.target.value)} />
                  </Field>
                </div>
              </div>
              <div className="flex justify-between text-[13px] font-semibold text-[var(--text-primary)] pt-3 mt-3 border-t border-[var(--border-sub)]">
                <span>Subtotal ({currency || '—'})</span>
                <span className="font-mono">{subtotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              </div>
            </PanelHeader>
          </div>
        </>
      )}

      {parsed && (
        <div className="fixed bottom-0 left-[232px] right-0 max-md:left-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border)] shadow-[0_-4px_12px_rgba(0,0,0,0.28)]">
          <div className="mx-auto max-w-[940px] flex items-center gap-3 px-6 max-md:px-4 py-3">
            <button
              type="button"
              onClick={startOver}
              className="px-3.5 py-[9px] rounded-[6px] text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors"
            >
              Start over
            </button>
            <span className="flex-1" />
            <Link to="/purchase-orders?tab=imports" className="px-3.5 py-[9px] rounded-[6px] text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors">
              Cancel
            </Link>
            <button
              type="button"
              disabled={creating}
              onClick={onCreate}
              className="px-4 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-semibold hover:opacity-[.88] disabled:opacity-50 transition-opacity"
            >
              {creating ? 'Creating…' : `Create import · ${IMPORT_STATUS_LABEL.SUBMITTED}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
