import { WEBHOOK_BUILD, CACHE_TTL_MS, PRODUCTS_JSON_URL } from './config.js';

export function pingBuildOnce({ forceFetch = false } = {}) {
  try {
    if (!WEBHOOK_BUILD) return;
    if (!forceFetch && sessionStorage.getItem('catalogPinged')) {
      console.log('[build] skipped (already pinged this session)');
      return;
    }
    sessionStorage.setItem('catalogPinged', '1');

    const payload = {
      event: 'build_catalog',
      path: location.pathname,
      ts: new Date().toISOString(),
      sessionId:
        sessionStorage.sessionId ||
        (sessionStorage.sessionId = (crypto?.randomUUID?.() || String(Math.random()))),
      nonce: Math.random().toString(36).slice(2),
    };

    console.log('[build] sending to', WEBHOOK_BUILD, payload);

    if (!forceFetch && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const ok = navigator.sendBeacon(WEBHOOK_BUILD, blob);
      console.log('[build] sendBeacon ok?', ok);
      if (ok) return;
    }

    fetch(WEBHOOK_BUILD, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((r) => console.log('[build] fetch status', r.status))
      .catch((err) => console.error('[build] fetch error', err));
  } catch (e) {
    console.error('[build] error', e);
  }
}

/**
 * Fetch your catalog only from PRODUCTS_JSON_URL and normalize.
 * Returns { products: [...] } or { products: [] }.
 */
export async function fetchCatalog({ cacheKey = 'kk_catalog_v1', ttlMs = CACHE_TTL_MS } = {}) {
  const now = Date.now();
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { ts, data } = JSON.parse(cached);
      if (now - ts < ttlMs) return data;
    } catch (_) {}
  }

  // Normalize into [{ id, name, price? }, ...]
  const normalize = (raw) => {
    if (!raw) return [];
    const payload = raw?.record ? raw.record : raw;

    if (Array.isArray(payload?.items)) {
      return payload.items.map((i) => ({
        id: i.item_id ?? i.id ?? i.product_id ?? i.sku ?? '',
        name: i.item_name ?? i.name ?? i.title ?? String(i.item_id ?? ''),
        price: toNumber(i.item_cost ?? i.price),
      }));
    }

    if (Array.isArray(payload?.products)) {
      return payload.products.map((p) => ({
        id: p.id ?? p.product_id ?? p.sku ?? '',
        name: p.name ?? p.title ?? String(p.id ?? ''),
        price: toNumber(p.price),
      }));
    }

    if (payload?.products && typeof payload.products === 'object') {
      return Object.entries(payload.products).map(([key, val]) => ({
        id: val.id ?? val.product_id ?? val.sku ?? key,
        name: val.name ?? val.title ?? key,
        price: toNumber(val.price),
      }));
    }

    if (Array.isArray(payload)) {
      return payload.map((p, idx) => ({
        id: p.id ?? p.product_id ?? p.sku ?? `ITEM-${idx + 1}`,
        name: p.name ?? p.title ?? `Item ${idx + 1}`,
        price: toNumber(p.price),
      }));
    }

    return [];
  };

  if (!PRODUCTS_JSON_URL) {
    console.warn('[fetchCatalog] No PRODUCTS_JSON_URL set');
    return { products: [] };
  }

  try {
    const res = await fetch(PRODUCTS_JSON_URL, { method: 'GET' });
    if (!res.ok) throw new Error('products.json not ok: ' + res.status);
    const raw = await res.json();
    const products = normalize(raw);
    const data = { products };
    localStorage.setItem(cacheKey, JSON.stringify({ ts: now, data }));
    return data;
  } catch (e) {
    console.error('[fetchCatalog] error', e);
    return { products: [] };
  }
}

function toNumber(v) {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}
