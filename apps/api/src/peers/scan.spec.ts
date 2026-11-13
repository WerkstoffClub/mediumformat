import { classifyScan, newTicketCode, normaliseCode } from './scan';

describe('classifyScan', () => {
  const base = { eventId: 'e1', status: 'VALID' as const, checkedInAt: null };

  it('accepts a fresh ticket for this event', () => {
    expect(classifyScan(base, 'e1')).toBe('VALID');
  });
  it('rejects unknown codes', () => {
    expect(classifyScan(null, 'e1')).toBe('NOT_FOUND');
  });
  it('rejects tickets for another event before anything else', () => {
    expect(classifyScan({ ...base, eventId: 'e2', checkedInAt: new Date() }, 'e1')).toBe('WRONG_EVENT');
  });
  it('rejects voided tickets', () => {
    expect(classifyScan({ ...base, status: 'VOID' }, 'e1')).toBe('VOID');
  });
  it('flags a second scan', () => {
    expect(classifyScan({ ...base, checkedInAt: new Date() }, 'e1')).toBe('ALREADY');
  });
});

describe('ticket codes', () => {
  it('generates TK- + 8 unambiguous chars', () => {
    expect(newTicketCode()).toMatch(/^TK-[A-HJKMNP-Z2-9]{8}$/);
  });
  it('normalises scanner input', () => {
    expect(normaliseCode(' tk7qh4m2xa ')).toBe('TK-7QH4M2XA');
    expect(normaliseCode('tk-7qh4m2xa')).toBe('TK-7QH4M2XA');
    expect(normaliseCode('MF-0842')).toBe('MF-0842');
  });
});
