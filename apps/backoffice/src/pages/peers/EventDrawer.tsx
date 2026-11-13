import { useEffect, useState } from 'react';
import {
  createEvent, deleteEvent, EVENT_STATUS_LABEL, listVenues, updateEvent,
  type EventStatus, type VenueRow,
} from '../../api/peers';
import { Drawer, Field, Section, Segmented, btnGhost, btnPrimary, errMsg, inputCls } from '../../components/ui/Drawer';
import { fromLocalInput, toLocalInput } from '../../lib/idFormat';

const STATUSES = (Object.keys(EVENT_STATUS_LABEL) as EventStatus[]).map(v => ({ value: v, label: EVENT_STATUS_LABEL[v] }));

interface EditableEvent {
  id: string; title: string; venueId: string; startsAt: string; doorsAt: string | null; endsAt: string | null;
  lineup: string | null; status: EventStatus; notes: string | null;
}

/** Create / edit a show. `event` null = new; `venueId` presets the venue. */
export function EventDrawer({ event, venueId, onClose, onSaved, onDeleted, onToast }: {
  event: EditableEvent | null;
  venueId?: string;
  onClose: () => void;
  onSaved: (id: string) => void;
  onDeleted?: () => void;
  onToast: (kind: 'ok' | 'err', text: string) => void;
}) {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [title, setTitle] = useState(event?.title ?? '');
  const [venue, setVenue] = useState(event?.venueId ?? venueId ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.startsAt));
  const [doorsAt, setDoorsAt] = useState(toLocalInput(event?.doorsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.endsAt));
  const [lineup, setLineup] = useState(event?.lineup ?? '');
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'DRAFT');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { listVenues().then(setVenues).catch(() => setVenues([])); }, []);

  const save = async (close: () => void) => {
    if (title.trim().length < 2) { onToast('err', 'Show title is required.'); return; }
    if (!venue) { onToast('err', 'Pick a venue.'); return; }
    if (!startsAt) { onToast('err', 'Start date & time is required.'); return; }
    const body = {
      title: title.trim(), venueId: venue, status, lineup, notes,
      startsAt: fromLocalInput(startsAt)!, doorsAt: fromLocalInput(doorsAt), endsAt: fromLocalInput(endsAt),
    };
    setSaving(true);
    try {
      const saved = event ? await updateEvent(event.id, body) : await createEvent(body);
      onToast('ok', event ? 'Show updated.' : 'Show created — add ticket tiers next.');
      onSaved(saved.id);
      close();
    } catch (e) {
      onToast('err', errMsg(e, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (close: () => void) => {
    if (!event || !confirm(`Delete "${event.title}"? This can't be undone.`)) return;
    try {
      await deleteEvent(event.id);
      onToast('ok', 'Show deleted.');
      close();
      onDeleted?.();
    } catch (e) {
      onToast('err', errMsg(e, 'Delete failed.'));
    }
  };

  return (
    <Drawer
      eyebrow={event ? 'Edit show' : 'New show'}
      title={title.trim() || 'New show'}
      onClose={onClose}
      footer={close => (
        <>
          {event && <button className={`${btnGhost} text-[var(--danger)]`} onClick={() => remove(close)}>Delete</button>}
          <div className="flex-1" />
          <button className={btnGhost} onClick={close}>Cancel</button>
          <button className={btnPrimary} disabled={saving} onClick={() => save(close)}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      )}
    >
      <Section title="Show">
        <Field label="Title"><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} /></Field>
        <Field label="Lineup"><input className={inputCls} value={lineup} onChange={e => setLineup(e.target.value)} placeholder="Artists, separated by ·" /></Field>
        <Field label="Venue">
          <select className={inputCls} value={venue} onChange={e => setVenue(e.target.value)}>
            <option value="">Select venue…</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
      </Section>
      <Section title="Schedule">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts"><input type="datetime-local" className={inputCls} value={startsAt} onChange={e => setStartsAt(e.target.value)} /></Field>
          <Field label="Doors (optional)"><input type="datetime-local" className={inputCls} value={doorsAt} onChange={e => setDoorsAt(e.target.value)} /></Field>
          <Field label="Ends (optional)"><input type="datetime-local" className={inputCls} value={endsAt} onChange={e => setEndsAt(e.target.value)} /></Field>
        </div>
        <Field label="Status"><Segmented value={status} options={STATUSES} onChange={setStatus} /></Field>
        <Field label="Notes"><textarea className={`${inputCls} min-h-[70px]`} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      </Section>
    </Drawer>
  );
}
