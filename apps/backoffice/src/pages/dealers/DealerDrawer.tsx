import { useState } from 'react';
import { createDealer, updateDealer, DEALER_STATUS_LABEL, type Dealer, type DealerStatus } from '../../api/dealers';
import { Drawer, Field, Section, Segmented, btnGhost, btnPrimary, errMsg, inputCls } from '../../components/ui/Drawer';

const STATUSES = (Object.keys(DEALER_STATUS_LABEL) as DealerStatus[]).map(v => ({ value: v, label: DEALER_STATUS_LABEL[v] }));

/** Create / edit a dealer (third-party record shop). `dealer` null = new. */
export function DealerDrawer({ dealer, onClose, onSaved, onToast }: {
  dealer: Dealer | null;
  onClose: () => void;
  onSaved: (d: Dealer) => void;
  onToast: (kind: 'ok' | 'err', text: string) => void;
}) {
  const [name, setName] = useState(dealer?.name ?? '');
  const [kind, setKind] = useState(dealer?.kind ?? '');
  const [area, setArea] = useState(dealer?.area ?? '');
  const [city, setCity] = useState(dealer?.city ?? 'Jakarta');
  const [status, setStatus] = useState<DealerStatus>(dealer?.status ?? 'PROSPECT');
  const [feePct, setFeePct] = useState(dealer ? String(Number(dealer.feePct)) : '2.5');
  const [contact, setContact] = useState(dealer?.contact ?? '');
  const [notes, setNotes] = useState(dealer?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (close: () => void) => {
    if (name.trim().length < 2) { onToast('err', 'Shop name is required.'); return; }
    const body = { name: name.trim(), kind, area, city, status, contact, notes, feePct: Number(feePct.replace(',', '.')) || 0 };
    setSaving(true);
    try {
      const saved = dealer ? await updateDealer(dealer.id, body) : await createDealer(body);
      onToast('ok', dealer ? 'Dealer updated.' : 'Dealer added.');
      onSaved(saved);
      close();
    } catch (e) {
      onToast('err', errMsg(e, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      eyebrow={dealer ? 'Dealer' : 'Add dealer'}
      title={name.trim() || 'New dealer'}
      onClose={onClose}
      footer={close => (
        <>
          <div className="flex-1" />
          <button className={btnGhost} onClick={close}>Cancel</button>
          <button className={btnPrimary} disabled={saving} onClick={() => save(close)}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      )}
    >
      <Section title="Shop">
        <Field label="Name"><input className={inputCls} value={name} onChange={e => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><input className={inputCls} value={kind} onChange={e => setKind(e.target.value)} placeholder="Record shop, cassette & CD…" /></Field>
          <Field label="Area"><input className={inputCls} value={area} onChange={e => setArea(e.target.value)} /></Field>
          <Field label="City"><input className={inputCls} value={city} onChange={e => setCity(e.target.value)} /></Field>
        </div>
      </Section>
      <Section title="Partnership">
        <Field label="Status"><Segmented value={status} options={STATUSES} onChange={setStatus} /></Field>
        <Field label="MF fee (%)"><input className={`${inputCls} font-mono text-right`} inputMode="decimal" value={feePct} onChange={e => setFeePct(e.target.value)} /></Field>
        <Field label="Contact"><input className={inputCls} value={contact} onChange={e => setContact(e.target.value)} placeholder="Name · phone / email" /></Field>
        <Field label="Notes"><textarea className={`${inputCls} min-h-[80px]`} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      </Section>
    </Drawer>
  );
}
