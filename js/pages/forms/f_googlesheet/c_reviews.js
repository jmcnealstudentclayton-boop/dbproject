// c_reviews.js — customer-level review summary
import { REVIEWS_JSON_URL, REVIEWS_JSON_KEY } from './config.js';

const DEFAULT_IDS = {
  userTbody: 'userTbody',
  userSort: 'userSort',
  userMin: 'userMinReviews',
};

export function initCustomerReviews({
  jsonUrl = REVIEWS_JSON_URL,
  ids = {},
} = {}) {
  const finalIds = { ...DEFAULT_IDS, ...ids };

  const els = {
    userTbody: document.getElementById(finalIds.userTbody),
    userSort: document.getElementById(finalIds.userSort),
    userMin: document.getElementById(finalIds.userMin),
  };

  // If the page doesn't have the reviewer section, just skip
  if (!els.userTbody) {
    console.log('[c_reviews] No reviewer summary table found; skipping.');
    return;
  }

  const state = {
    reviews: [],
    userGroups: [],
    sort: (els.userSort && els.userSort.value) || 'reviews_desc',
    minReviews: Number((els.userMin && els.userMin.value) || 1),
  };

  if (els.userSort) {
    els.userSort.addEventListener('change', () => {
      state.sort = els.userSort.value;
      applyView();
    });
  }

  if (els.userMin) {
    els.userMin.addEventListener('input', () => {
      state.minReviews = Number(els.userMin.value || 0);
      applyView();
    });
  }

  load();

  async function load() {
    try {
      const headers = { 'X-Bin-Meta': 'false' };
      if (REVIEWS_JSON_KEY) headers['X-Master-Key'] = REVIEWS_JSON_KEY;

      const res = await fetch(jsonUrl, { method: 'GET', headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

      const data = await res.json();

      const rows =
        Array.isArray(data) ? data :
        Array.isArray(data?.reviews) ? data.reviews :
        Array.isArray(data?.record?.reviews) ? data.record.reviews :
        Array.isArray(data?.record) ? data.record :
        [];

      state.reviews = sanitize(rows);
      state.userGroups = groupByUser(state.reviews);

      // default filters
      if (els.userSort) {
        state.sort = 'reviews_desc';
        els.userSort.value = 'reviews_desc';
      }
      if (els.userMin) {
        state.minReviews = 1;
        els.userMin.value = '1';
      }

      applyView();
    } catch (err) {
      console.error('[c_reviews] load error', err);
      renderErrorRow('Failed to load reviewer data.');
    }
  }

  function sanitize(arr) {
    return arr
      .map(r => ({
        productId: r?.productId ?? r?.itemId ?? r?.item ?? null,
        rating: Number(r?.rating ?? r?.stars),
        firstName: safeText(r?.firstName),
        lastName: safeText(r?.lastName),
        email: safeText(r?.email),
      }))
      .filter(r =>
        Number.isFinite(r.rating) &&
        r.rating >= 0 &&
        r.rating <= 5
      );
  }

  function groupByUser(reviews) {
    const map = new Map();

    for (const r of reviews) {
      const displayName =
        buildName(r.firstName, r.lastName) ||
        (r.email ? r.email.split('@')[0] : 'Anonymous');

      const key = r.email
        ? r.email.toLowerCase()
        : displayName.toLowerCase();

      let g = map.get(key);
      if (!g) {
        g = {
          key,
          name: displayName,
          email: r.email || '',
          count: 0,
          sum: 0,
          products: new Set(),
        };
      }

      g.count += 1;
      g.sum += r.rating;
      if (r.productId) g.products.add(r.productId);
      map.set(key, g);
    }

    return Array.from(map.values()).map(g => ({
      ...g,
      avg: g.count ? g.sum / g.count : 0,
      products: Array.from(g.products).sort(),
    }));
  }

  function applyView() {
    let rows = state.userGroups;

    const min = state.minReviews || 0;
    rows = rows.filter(u => u.count >= min);

    rows = sortRows(rows, state.sort);

    render(rows);
  }

  function sortRows(rows, mode) {
    const a = rows.slice();
    switch (mode) {
      case 'reviews_desc':
        a.sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
        break;
      case 'reviews_asc':
        a.sort((x, y) => x.count - y.count || x.name.localeCompare(y.name));
        break;
      case 'avg_desc':
        a.sort((x, y) => y.avg - x.avg || x.name.localeCompare(y.name));
        break;
      case 'avg_asc':
        a.sort((x, y) => x.avg - y.avg || x.name.localeCompare(y.name));
        break;
      case 'name_desc':
        a.sort((x, y) => y.name.localeCompare(x.name));
        break;
      case 'name_asc':
      default:
        a.sort((x, y) => x.name.localeCompare(y.name));
        break;
    }
    return a;
  }

  function render(rows) {
    els.userTbody.innerHTML = '';

    if (!rows.length) {
      renderErrorRow('No reviewer data to display.');
      return;
    }

    for (const u of rows) {
      els.userTbody.appendChild(renderUserRow(u));
    }
  }

  function renderErrorRow(message) {
    els.userTbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-6 text-sm text-[color:#93a1b3]">
          ${escapeHtml(message)}
        </td>
      </tr>
    `;
  }

  function renderUserRow(u) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-white/5 transition';

    const pct = Math.max(0, Math.min(100, (u.avg / 5) * 100));
    const avgStr = (Math.round(u.avg * 10) / 10).toFixed(1);

    const productsLabel = u.products.length ? u.products : [];

    const emailLine = u.email
      ? `<div class="text-xs text-[color:#93a1b3] break-all">${escapeHtml(u.email)}</div>`
      : '';

    tr.innerHTML = `
      <td class="px-4 py-4">
        <div class="text-sm font-semibold">${escapeHtml(u.name || 'Anonymous')}</div>
        ${emailLine}
      </td>
      <td class="px-4 py-4">
        <div class="inline-flex items-center">
          <div class="relative inline-block leading-none text-lg tracking-[2px] select-none">
            <div class="text-[color:#2a3545]">★★★★★</div>
            <div class="absolute inset-0 overflow-hidden whitespace-nowrap" style="width:${pct}%">
              <div class="text-[color:#fbbf24] drop-shadow">★★★★★</div>
            </div>
          </div>
          <span class="ml-2 font-semibold">${avgStr}</span>
        </div>
      </td>
      <td class="px-4 py-4 text-[color:#93a1b3]">${u.count}</td>
      <td class="px-4 py-4 text-[color:#cbd5f5]">
        <div class="flex flex-wrap gap-1">
          ${
            productsLabel.length
              ? productsLabel
                  .map(
                    pid => `
            <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-gray-700 text-xs font-mono">
              ${escapeHtml(pid)}
            </span>`
                  )
                  .join('')
              : '<span class="text-[color:#93a1b3] text-sm">—</span>'
          }
        </div>
      </td>
    `;

    return tr;
  }

  // helpers
  function safeText(v) {
    return v == null ? '' : String(v).trim();
  }
  function buildName(first, last) {
    const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
    const f = cap(first);
    const l = cap(last);
    return f && l ? `${f} ${l}` : (f || l);
  }
  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
