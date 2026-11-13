import { orderNumber, priceLines } from './web-order.pricing';

const lp = { id: 'a', artist: 'A', title: 'One', format: 'LP', priceIdr: 400_000, stock: 2 };
const cd = { id: 'b', artist: 'B', title: 'Two', format: 'CD', priceIdr: 150_000, stock: 1 };

describe('priceLines', () => {
  it('prices from the DB and sums the subtotal', () => {
    const r = priceLines([{ releaseId: 'a', qty: 2 }, { releaseId: 'b', qty: 1 }], [lp, cd]);
    expect(r).toMatchObject({ ok: true, subtotalIdr: 950_000 });
  });

  it('merges duplicate lines before checking stock', () => {
    const r = priceLines([{ releaseId: 'a', qty: 2 }, { releaseId: 'a', qty: 1 }], [lp]);
    expect(r).toEqual({ ok: false, error: 'Only 2 left of A — One.' });
  });

  it('says sold out when nothing is left', () => {
    const r = priceLines([{ releaseId: 'a', qty: 1 }], [{ ...lp, stock: 0 }]);
    expect(r).toEqual({ ok: false, error: 'A — One just sold out.' });
  });

  it('rejects an unknown release', () => {
    expect(priceLines([{ releaseId: 'zzz', qty: 1 }], [lp]).ok).toBe(false);
  });
});

describe('orderNumber', () => {
  it('uses the WIB date and a 5-char tail', () => {
    expect(orderNumber(new Date('2026-11-12T18:00:00Z'), () => 0)).toBe('MF-261113-AAAAA');
  });
});
