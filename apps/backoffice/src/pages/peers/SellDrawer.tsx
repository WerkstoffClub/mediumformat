import { useState } from 'react';
import { PAYMENT_LABEL, sellTickets, type Ticket, type Tier, type TicketPayment } from '../../api/peers';
import { Drawer, Field, Section, Segmented, btnGhost, btnPrimary, errMsg, inputCls } from '../../components/ui/Drawer';
import { fmtNum, fmtRp } from '../../lib/idFormat';

const PAYMENTS: { value: TicketPayment; label: string }[] = (['CASH', 'QRIS', 'EDC'] as const).map(p => ({ value: p, label: PAYMENT_LABEL[p] }));
const MAX_QTY = 20;

/** Box-office Sell sheet: issues ticket codes immediately; payment is taken at the counter. */
export function SellDrawer({ eventId, tiers, onClose, onSold, onToast }: {
  eventId: string;
  tiers: Tier[];
  onClose: () => void;
  onSold: () => void;
  onToast: (kind: 'ok' | 'err', text: string) => void;
}) {
  const open = tiers.filter(t => t.quota - t.sold > 0);
  const [tierId, setTierId] = useState(open[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [comp, setComp] = useState(false);
  const [payment, setPayment] = useState<TicketPayment>('CASH');
  const [holderName, setHolderName] = useState('');
  const [holderEmail, setHolderEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Ticket[] | null>(null);

  const tier = tiers.find(t => t.id === tierId);
  const left = tier ? tier.quota - tier.sold : 0;
  const total = comp || !tier ? 0 : tier.priceIdr * qty;

  const sell = async () => {
    if (!tier) return;
    setBusy(true);
    try {
      const t = await sellTickets(eventId, {
        tierId, qty, channel: comp ? 'COMP' : 'BOX_OFFICE', payment: comp ? 'NONE' : payment,
        holderName: holderName.trim() || undefined, holderEmail: holderEmail.trim() || undefined,
      });
      setIssued(t);
      onToast('ok', `${fmtNum(t.length)} ticket${t.length === 1 ? '' : 's'} issued.`);
      onSold();
    } catch (e) {
      onToast('err', errMsg(e, 'Sale failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      eyebrow="Box office"
      title={issued ? 'Tickets issued' : 'Sell tickets'}
      onClose={onClose}
      footer={close => issued ? (
        <>
          <div className="flex-1" />
          <button className={btnGhost} onClick={() => { setIssued(null); setHolderName(''); setHolderEmail(''); setQty(1); }}>Sell more</button>
          <button className={btnPrimary} onClick={close}>Done</button>
        </>
      ) : (
        <>
          <span className="font-mono text-[14px] text-[var(--text-primary)]">{fmtRp(total)}</span>
          <div className="flex-1" />
          <button className={btnGhost} onClick={close}>Cancel</button>
          <button className={btnPrimary} disabled={busy || !tier || qty > left} onClick={sell}>{busy ? 'Issuing…' : comp ? 'Issue comp' : 'Take payment & issue'}</button>
        </>
      )}
    >
      {issued ? (
        <Section title="Ticket codes">
          <p className="text-[12px] text-[var(--text-muted)]">Write these on the wristband or read them out — the door scans or types the code.</p>
          <ul className="space-y-1.5">
            {issued.map(t => (
              <li key={t.id} className="flex items-center justify-between border border-[var(--border)] rounded-[6px] px-3 py-2">
                <span className="font-mono text-[14px] tracking-[0.04em] text-[var(--text-primary)]">{t.code}</span>
                <span className="text-[11px] text-[var(--text-muted)]">{t.tier.name}{t.holderName ? ` · ${t.holderName}` : ''}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : open.length === 0 ? (
        <p className="mx-4 text-[12px] text-[var(--text-muted)]">Every tier is sold out or no tiers exist yet.</p>
      ) : (
        <>
          <Section title="Tickets">
            <Field label="Tier">
              <select className={inputCls} value={tierId} onChange={e => { setTierId(e.target.value); setQty(1); }}>
                {open.map(t => <option key={t.id} value={t.id}>{t.name} · {fmtRp(t.priceIdr)} · {fmtNum(t.quota - t.sold)} left</option>)}
              </select>
            </Field>
            <Field label={`Quantity (max ${Math.min(left, MAX_QTY)})`}>
              <div className="flex items-center gap-2">
                <button type="button" className={btnGhost} onClick={() => setQty(n => Math.max(1, n - 1))}>−</button>
                <span className="font-mono text-[16px] w-10 text-center">{qty}</span>
                <button type="button" className={btnGhost} onClick={() => setQty(n => Math.min(Math.min(left, MAX_QTY), n + 1))}>+</button>
              </div>
            </Field>
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <input type="checkbox" checked={comp} onChange={e => setComp(e.target.checked)} /> Complimentary (guest list, Rp 0)
            </label>
          </Section>
          {!comp && (
            <Section title="Payment">
              <Segmented value={payment} options={PAYMENTS} onChange={setPayment} />
              <p className="text-[11px] text-[var(--text-faint)]">Record what the buyer paid with at the counter. Online Xendit sales come later via the public ticket page.</p>
            </Section>
          )}
          <Section title="Buyer (optional)">
            <Field label="Name"><input className={inputCls} value={holderName} onChange={e => setHolderName(e.target.value)} /></Field>
            <Field label="Email"><input type="email" className={inputCls} value={holderEmail} onChange={e => setHolderEmail(e.target.value)} /></Field>
          </Section>
        </>
      )}
    </Drawer>
  );
}
