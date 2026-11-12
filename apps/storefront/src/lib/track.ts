import { getToken } from '../admin/adminAuth';

/** First-party page-view beacon → POST /api/v1/track. Random ids only, no cookies,
 *  no personal data. Staff signed in to the storefront editor are not counted. */

const VISITOR_KEY = 'mf-vid';
const SESSION_KEY = 'mf-sid';

function storedId(storage: Storage, key: string): string {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}

export function trackPageView(path: string): void {
  try {
    if (getToken()) return;
    const isNewSession = !sessionStorage.getItem(SESSION_KEY);
    const ref = document.referrer;
    const external = ref && !ref.startsWith(location.origin);
    const body = JSON.stringify({
      path,
      visitorId: storedId(localStorage, VISITOR_KEY),
      sessionId: storedId(sessionStorage, SESSION_KEY),
      // Referrer only counts on a session's entry page (where traffic came from).
      ...(isNewSession && external ? { referrer: ref.slice(0, 500) } : {}),
    });
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/v1/track', blob)) {
      void fetch('/api/v1/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Storage blocked (private mode) or crypto missing — analytics is best-effort.
  }
}
