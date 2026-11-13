import { useState } from 'react';
import { createVenue, updateVenue, type Venue, type VenueStatus, VENUE_STATUS_LABEL } from '../../api/peers';
import { Drawer, Field, Section, Segmented, btnGhost, btnPrimary, errMsg, inputCls } from '../../components/ui/Drawer';

const STATUSES = (Object.keys(VENUE_STATUS_LABEL) as VenueStatus[]).map(v => ({ value: v, label: VENUE_STATUS_LABEL[v] }));

/** Create / edit a Peers venue. `venue` null = new. */
export function VenueDrawer({ venue, onClose, onSaved, onToast }: {
  venue: Venue | null;
  onClose: () => void;
  onSaved: (v: Venue) => void;
  onToast: (kind: 'ok' | 'err', text: string) => void;
}) {
  const [name, setName] = useState(venue?.name ?? '');
  const [kind, setKind] = useState(venue?.kind ?? '');
  const [area, setArea] = useState(venue?.area ?? '');
  const [city, setCity] = useState(venue?.city ?? 'Jakarta');
  const [capacity, setCapacity] = useState(venue?.capacity ? String(venue.capacity) : '');
  const [status, setStatus] = useState<VenueStatus>(venue?.status ?? 'ONBOARDING');
  const [feePct, setFeePct] = useState(venue ? String(Number(venue.feePct)) : '3');
  const [contact, setContact] = useState(venue?.contact ?? '');
  const [notes, setNotes] = useState(venue?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (close: () => void) => {
    if (name.trim().length < 2) { onToast('err', 'Venue name is required.'); return; }
    const body = {
      name: name.trim(), kind, area, city, status, contact, notes,
      capacity: capacity ? Math.max(1, Number(capacity)) : null,
      feePct: Number(feePct.replace(',', '.')) || 0,
    };
    setSaving(true);
    try {
      const saved = venue ? await updateVenue(venue.id, body) : await createVenue(body);
      onToast('ok', venue ? 'Venue updated.' : 'Venue added.');
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
      eyebrow={venue ? 'Peers venue' : 'Invite venue'}
      title={name.trim() || 'New venue'}
      onClose={onClose}
      footer={close => (
        <>
          <div className="flex-1" />
          <button className={btnGhost} onClick={close}>Cancel</button>
          <button className={btnPrimary} disabled={saving} onClick={() => save(close)}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      )}
    >
      <Section title="Venue">
        <Field label="Name"><input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Venue name" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><input className={inputCls} value={kind} onChange={e => setKind(e.target.value)} placeholder="Live house, club, bar…" /></Field>
          <Field label="Capacity"><input className={`${inputCls} font-mono text-right`} inputMode="numeric" value={capacity} onChange={e => setCapacity(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Area"><input className={inputCls} value={area} onChange={e => setArea(e.target.value)} placeholder="Kebayoran Baru" /></Field>
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
