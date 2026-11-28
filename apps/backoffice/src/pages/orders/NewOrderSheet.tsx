import { useEffect, useMemo, useState } from 'react';
import type { Release } from '@mf/shared';
import { getCustomers, type CustomerRow } from '../../api/ops';
import { getReleases } from '../../api/inventory';
import { createBackofficeOrder } from '../../api/webOrders';
import { Drawer, Field, Section, Segmented, btnGhost, btnPrimary, errMsg, inputCls } from '../../components/ui/Drawer';
import { ENTRY_CHANNELS } from '../../components/ui/OrderStatus';
import { fmtRp } from '../../lib/idFormat';

type Line = { release: Release; qty: number };

/** Debounced value — keeps the lookups below to one request per pause. */
function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** "New order" (mockup-orders): an order taken over WhatsApp, Instagram, the
 *  phone or at an event. Priced and stock-reserved by the API with the same
 *  rules as website checkout; stored in MF (DealPOS is not written to). */
export function NewOrderSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState('WhatsApp');
  const [fulfilment, setFulfilment] = useState<'PICKUP' | 'DELIVERY'>('DELIVERY');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [paid, setPaid] = useState<'paid' | 'unpaid'>('paid');
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer lookup: picking one fills the contact details.
  const [custMatches, setCustMatches] = useState<CustomerRow[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const custQ = useDebounced(customerName.trim());
  useEffect(() => {
    if (custQ.length < 2 || picked === custQ) { setCustMatches([]); return; }
    let active = true;
    getCustomers({ q: custQ, limit: 5 })
      .then(r => { if (active) setCustMatches(r.data); })
      .catch(() => { if (active) setCustMatches([]); });
    return () => { active = false; };
  }, [custQ, picked]);

  function pickCustomer(c: CustomerRow) {
    setCustomerName(c.name);
    setPicked(c.name);
    setEmail(c.email ?? '');
    setPhone(c.mobile ?? '');
    setCustMatches([]);
  }

  // Item lookup over the catalogue.
  const [itemQ, setItemQ] = useState('');
  const itemQd = useDebounced(itemQ.trim());
  const [items, setItems] = useState<Release[]>([]);
  useEffect(() => {
    if (itemQd.length < 2) { setItems([]); return; }
    let active = true;
    getReleases({ q: itemQd, limit: 6, stock: 'in' })
      .then(r => { if (active) setItems(r.data); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [itemQd]);

  function addItem(r: Release) {
    setLines(ls => {
      const at = ls.findIndex(l => l.release.id === r.id);
      if (at >= 0) return ls.map((l, i) => (i === at ? { ...l, qty: Math.min(l.qty + 1, r.stock, 10) } : l));
      return [...ls, { release: r, qty: 1 }];
    });
    setItemQ('');
    setItems([]);
  }

  const subtotal = useMemo(() => lines.reduce((t, l) => t + l.release.priceIdr * l.qty, 0), [lines]);
  const delivery = fulfilment === 'DELIVERY';
  const ready =
    customerName.trim().length >= 2 &&
    lines.length > 0 &&
    (!delivery || (address.trim().length >= 5 && city.trim().length >= 2));

  async function save(close: () => void) {
    setSaving(true);
    setError(null);
    try {
      const order = await createBackofficeOrder({
        customerName: customerName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        channel,
        fulfilment,
        address: delivery ? address.trim() : undefined,
        city: delivery ? city.trim() : undefined,
        postalCode: delivery ? postalCode.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        voucherCode: voucherCode.trim() || undefined,
        paid: paid === 'paid',
        lines: lines.map(l => ({ releaseId: l.release.id, qty: l.qty })),
      });
      onCreated(order.id);
      close();
    } catch (e) {
      setError(errMsg(e, 'Could not create the order.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      eyebrow="Orders"
      title="New order"
      onClose={onClose}
      footer={close => (
        <>
          <div className="mr-auto min-w-0">
            {error
              ? <span className="text-[12px] text-[var(--danger)]">{error}</span>
              : <span className="text-[12px] text-[var(--text-secondary)]">Subtotal <span className="font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{fmtRp(subtotal)}</span></span>}
          </div>
          <button className={btnGhost} onClick={close}>Cancel</button>
          <button className={btnPrimary} disabled={saving || !ready} onClick={() => save(close)}>
            {saving ? 'Saving…' : 'Create order'}
          </button>
        </>
      )}
    >
      <Section title="Customer">
        <Field label="Name">
          <div className="relative">
            <input
              className={inputCls}
              value={customerName}
              onChange={e => { setCustomerName(e.target.value); setPicked(null); }}
              placeholder="Search customers or type a new name"
              autoFocus
            />
            {custMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,.5)] overflow-hidden">
                {custMatches.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickCustomer(c)}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--bg-overlay)] border-t border-[var(--border)] first:border-t-0"
                  >
                    <span className="block text-[12px] text-[var(--text-primary)]">{c.name}</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">{c.email || c.mobile || 'no contact on file'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <Field label="Email (optional)">
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone (optional)">
            <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+62 812-…" />
          </Field>
        </div>
        <Field label="Channel">
          <select className={inputCls} value={channel} onChange={e => setChannel(e.target.value)}>
            {ENTRY_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Items">
        <div className="relative">
          <input
            className={inputCls}
            value={itemQ}
            onChange={e => setItemQ(e.target.value)}
            placeholder="Search artist, title or cat# (in stock)"
          />
          {items.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,.5)] overflow-hidden">
              {items.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addItem(r)}
                  className="w-full flex items-center gap-3 text-left px-3 py-2 hover:bg-[var(--bg-overlay)] border-t border-[var(--border)] first:border-t-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] text-[var(--text-primary)] truncate">{r.artist} — {r.title}</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">{r.format} · {r.stock} in stock</span>
                  </span>
                  <span className="text-[12px] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{fmtRp(r.priceIdr)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {lines.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">No items yet.</p>}
        {lines.map(l => (
          <div key={l.release.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-[var(--text-primary)] truncate">{l.release.artist} — {l.release.title}</span>
              <span className="block text-[11px] text-[var(--text-muted)] [font-variant-numeric:tabular-nums]">{fmtRp(l.release.priceIdr)} each</span>
            </span>
            <input
              type="number"
              min={1}
              max={Math.min(10, l.release.stock)}
              value={l.qty}
              aria-label="Quantity"
              onChange={e => {
                const qty = Math.max(1, Math.min(Number(e.target.value) || 1, 10, l.release.stock));
                setLines(ls => ls.map(x => (x.release.id === l.release.id ? { ...x, qty } : x)));
              }}
              className={`${inputCls} !w-16 flex-shrink-0 text-right`}
            />
            <span className="w-[96px] text-right text-[12px] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{fmtRp(l.release.priceIdr * l.qty)}</span>
            <button
              type="button"
              aria-label="Remove item"
              onClick={() => setLines(ls => ls.filter(x => x.release.id !== l.release.id))}
              className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-overlay)]"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        ))}
        <Field label="Voucher (optional)">
          <input className={inputCls} value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} />
        </Field>
      </Section>

      <Section title="Delivery & payment">
        <Field label="Fulfilment">
          <Segmented value={fulfilment} onChange={setFulfilment} options={[{ value: 'DELIVERY', label: 'Ship' }, { value: 'PICKUP', label: 'Pick up in store' }]} />
        </Field>
        {delivery && (
          <>
            <Field label="Address">
              <textarea className={`${inputCls} min-h-[60px]`} value={address} onChange={e => setAddress(e.target.value)} />
            </Field>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="City"><input className={inputCls} value={city} onChange={e => setCity(e.target.value)} /></Field>
              <Field label="Postal code"><input className={inputCls} value={postalCode} onChange={e => setPostalCode(e.target.value)} /></Field>
            </div>
          </>
        )}
        <Field label="Payment">
          <Segmented value={paid} onChange={setPaid} options={[{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Awaiting payment' }]} />
        </Field>
        <Field label="Notes">
          <textarea className={`${inputCls} min-h-[60px]`} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
        <p className="text-[11px] text-[var(--text-muted)]">
          Stock is reserved when the order is created; cancelling it in Web orders puts it back. Saved in Medium Format — DealPOS is not changed.
        </p>
      </Section>
    </Drawer>
  );
}
