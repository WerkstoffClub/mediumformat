import { useState } from 'react';
import { addTier, deleteTier, updateTier, type Tier } from '../../api/peers';
import { Drawer, Field, Section, btnGhost, btnPrimary, errMsg, inputCls } from '../../components/ui/Drawer';
import { fmtNum, fromLocalInput, toLocalInput } from '../../lib/idFormat';

const digits = (v: string) => v.replace(/\D/g, '');

/** Create / edit a ticket tier. Quota can't drop below tickets already sold (API enforces). */
export function TierDrawer({ eventId, tier, onClose, onSaved, onToast }: {
  eventId: string;
  tier: Tier | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (kind: 'ok' | 'err', text: string) => void;
}) {
  const [name, setName] = useState(tier?.name ?? '');
  const [price, setPrice] = useState(tier ? String(tier.priceIdr) : '');
  const [quota, setQuota] = useState(tier ? String(tier.quota) : '');
  const [salesStart, setSalesStart] = useState(toLocalInput(tier?.salesStart));
  const [salesEnd, setSalesEnd] = useState(toLocalInput(tier?.salesEnd));
  const [sortOrder, setSortOrder] = useState(tier ? String(tier.sortOrder) : '0');
  const [saving, setSaving] = useState(false);

  const save = async (close: () => void) => {
    if (!name.trim()) { onToast('err', 'Tier name is required.'); return; }
    if (!quota || Number(quota) < 1) { onToast('err', 'Quota must be at least 1.'); return; }
    const body = {
      name: name.trim(), priceIdr: Number(price || 0), quota: Number(quota), sortOrder: Number(sortOrder || 0),
      salesStart: fromLocalInput(salesStart), salesEnd: fromLocalInput(salesEnd),
    };
    setSaving(true);
    try {
      if (tier) await updateTier(tier.id, body); else await addTier(eventId, body);
      onToast('ok', tier ? 'Tier updated.' : 'Tier added.');
      onSaved();
      close();
    } catch (e) {
      onToast('err', errMsg(e, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (close: () => void) => {
    if (!tier || !confirm(`Delete tier ${tier.name}?`)) return;
    try { await deleteTier(tier.id); onToast('ok', 'Tier deleted.'); onSaved(); close(); }
    catch (e) { onToast('err', errMsg(e, 'Delete failed.')); }
  };

  return (
    <Drawer
      eyebrow={tier ? 'Edit tier' : 'New tier'}
      title={name.trim() || 'New tier'}
      onClose={onClose}
      footer={close => (
        <>
          {tier && tier.sold === 0 && <button className={`${btnGhost} text-[var(--danger)]`} onClick={() => remove(close)}>Delete</button>}
          <div className="flex-1" />
          <button className={btnGhost} onClick={close}>Cancel</button>
          <button className={btnPrimary} disabled={saving} onClick={() => save(close)}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      )}
    >
      <Section title="Tier">
        <Field label="Name"><input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Presale, Regular, CAT 1…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (Rp)"><input className={`${inputCls} font-mono text-right`} inputMode="numeric" value={price} onChange={e => setPrice(digits(e.target.value))} /></Field>
          <Field label={tier ? `Quota (min ${fmtNum(tier.sold)} sold)` : 'Quota'}><input className={`${inputCls} font-mono text-right`} inputMode="numeric" value={quota} onChange={e => setQuota(digits(e.target.value))} /></Field>
        </div>
      </Section>
      <Section title="Sale phase">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sales open (optional)"><input type="datetime-local" className={inputCls} value={salesStart} onChange={e => setSalesStart(e.target.value)} /></Field>
          <Field label="Sales close (optional)"><input type="datetime-local" className={inputCls} value={salesEnd} onChange={e => setSalesEnd(e.target.value)} /></Field>
        </div>
        <Field label="Sort order"><input className={`${inputCls} font-mono text-right w-24`} inputMode="numeric" value={sortOrder} onChange={e => setSortOrder(e.target.value.replace(/[^\d-]/g, ''))} /></Field>
      </Section>
    </Drawer>
  );
}
