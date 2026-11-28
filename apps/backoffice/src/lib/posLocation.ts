/** The location this register sells from (per device). Empty = each item's home store. */
const KEY = 'mf-pos-location';

export function getPosLocation(): string {
  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
}

export function setPosLocation(id: string): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch { /* storage blocked: the choice lasts for this page only */ }
}
