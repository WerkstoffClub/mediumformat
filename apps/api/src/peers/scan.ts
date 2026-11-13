import { randomInt } from 'node:crypto';

export type ScanResult = 'VALID' | 'ALREADY' | 'WRONG_EVENT' | 'VOID' | 'NOT_FOUND';

interface ScannedTicket {
  eventId: string;
  status: 'VALID' | 'VOID';
  checkedInAt: Date | null;
}

/** Door decision for one scanned code. Pure so it can be unit-tested. */
export function classifyScan(ticket: ScannedTicket | null, eventId: string): ScanResult {
  if (!ticket) return 'NOT_FOUND';
  if (ticket.eventId !== eventId) return 'WRONG_EVENT';
  if (ticket.status === 'VOID') return 'VOID';
  if (ticket.checkedInAt) return 'ALREADY';
  return 'VALID';
}

// No 0/O/1/I/L — codes get read out loud and typed at the door.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Ticket code like TK-7QH4M2XA (8 chars ≈ 40 bits, crypto RNG). */
export function newTicketCode(): string {
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `TK-${out}`;
}

/** Normalise what a scanner / staff typed: trim, upper-case, tolerate missing dash. */
export function normaliseCode(raw: string): string {
  const c = raw.trim().toUpperCase().replace(/\s+/g, '');
  return /^TK[A-Z0-9]{8}$/.test(c) ? `TK-${c.slice(2)}` : c;
}
