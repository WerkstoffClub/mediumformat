import {
  availableAt, commissionSplit, dayKeys, homeLocationId, mergeLines, pctChange, sellThrough, transferNumber,
} from './location-stock';

const locs = [
  { id: 'wh', kind: 'STORAGE' as const, storeLocation: 'WAREHOUSE' as const, sortOrder: 1, active: true },
  { id: 'main', kind: 'RETAIL' as const, storeLocation: 'MAIN_STORE' as const, sortOrder: 0, active: true },
  { id: 'popup', kind: 'TEMPORARY' as const, storeLocation: null, sortOrder: 5, active: true },
];

describe('location stock rules', () => {
  it('finds the home location by storeLocation, else the first retail one', () => {
    expect(homeLocationId('MAIN_STORE', locs)).toBe('main');
    expect(homeLocationId('WAREHOUSE', locs)).toBe('wh');
    expect(homeLocationId('CONSIGNMENT', locs)).toBe('main');
    expect(homeLocationId('MAIN_STORE', [])).toBeNull();
  });

  it('derives home stock from the total minus what is away', () => {
    const away = [{ locationId: 'popup', qty: 3 }, { locationId: 'consign', qty: 2 }];
    expect(availableAt('main', 'main', 10, away)).toBe(5);
    expect(availableAt('popup', 'main', 10, away)).toBe(3);
    expect(availableAt('elsewhere', 'main', 10, away)).toBe(0);
    expect(availableAt('main', 'main', 4, away)).toBe(0); // never negative when DealPOS total drops
  });

  it('merges duplicate lines', () => {
    expect([...mergeLines([{ releaseId: 'a', qty: 1 }, { releaseId: 'b', qty: 2 }, { releaseId: 'a', qty: 3 }])]).toEqual([['a', 4], ['b', 2]]);
  });

  it('splits commission and net, clamped to 0–100 %', () => {
    expect(commissionSplit(1_000_000, 25)).toEqual({ commissionPct: 25, commissionIdr: 250_000, netIdr: 750_000 });
    expect(commissionSplit(1_000_000, null)).toEqual({ commissionPct: 0, commissionIdr: 0, netIdr: 1_000_000 });
    expect(commissionSplit(100, 150).netIdr).toBe(0);
  });

  it('computes trend and sell-through', () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(0, 0)).toBe(0);
    expect(sellThrough(3, 7)).toBe(30);
    expect(sellThrough(0, 0)).toBe(0);
  });

  it('lists every WIB day in a range and numbers transfers', () => {
    expect(dayKeys(new Date('2026-11-27T18:00:00Z'), new Date('2026-11-29T10:00:00Z'))).toEqual(['2026-11-28', '2026-11-29']);
    expect(transferNumber(new Date('2026-11-28T03:00:00Z'), () => 0)).toBe('TRF-261128-AAAAA');
  });
});
