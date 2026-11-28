import { useState } from 'react';
import { createCustomer, type CustomerDetail } from '../../api/ops';
import { Drawer, Field, Section, Segmented, btnGhost, btnPrimary, errMsg, inputCls } from '../../components/ui/Drawer';
import { ENTRY_CHANNELS } from '../../components/ui/OrderStatus';

/** "Add customer" (mockup-customers). Stored in MF — DealPOS is not written
 *  to — and listed with the DealPOS customers from then on. */
export function AddCustomerSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (c: CustomerDetail) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState('');
  const [type, setType] = useState<'retail' | 'wholesale'>('retail');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(close: () => void) {
    setSaving(true);
    setError(null);
    try {
      const c = await createCustomer({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        channel: channel || undefined,
        wholesale: type === 'wholesale',
        notes: notes.trim() || undefined,
      });
      onCreated(c);
      close();
    } catch (e) {
      setError(errMsg(e, 'Could not add the customer.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      eyebrow="Customers"
      title="Add customer"
      onClose={onClose}
      footer={close => (
        <>
          {error && <span className="text-[12px] text-[var(--danger)] mr-auto">{error}</span>}
          <div className="flex-1" />
          <button className={btnGhost} onClick={close}>Cancel</button>
          <button className={btnPrimary} disabled={saving || name.trim().length < 2} onClick={() => save(close)}>
            {saving ? 'Saving…' : 'Add customer'}
          </button>
        </>
      )}
    >
      <Section title="Customer">
        <Field label="Name">
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Full name or shop name" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <Field label="Email">
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@mail.com" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+62 812-…" />
          </Field>
        </div>
        <Field label="Type">
          <Segmented value={type} onChange={setType} options={[{ value: 'retail', label: 'Retail' }, { value: 'wholesale', label: 'Wholesale' }]} />
        </Field>
        <Field label="Acquired via">
          <select className={inputCls} value={channel} onChange={e => setChannel(e.target.value)}>
            <option value="">— not set —</option>
            {ENTRY_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className={`${inputCls} min-h-[72px]`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Preferences, billing terms…" />
        </Field>
        <p className="text-[11px] text-[var(--text-muted)]">
          Saved in Medium Format. Orders under this exact name — from DealPOS or entered here — count towards the customer.
        </p>
      </Section>
    </Drawer>
  );
}
