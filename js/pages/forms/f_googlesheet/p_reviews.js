// p_reviews.js — product-level review summary
import { REVIEWS_JSON_URL, REVIEWS_JSON_KEY } from './config.js';

const DEFAULT_IDS = {
  tbody: 'tbody',
  errors: 'errors',
  sort: 'sortSelect',
  minCount: 'minCount',
  refresh: 'refreshBtn',
};

export function initProductReviews({
  jsonUrl = REVIEWS_JSON_URL,
  ids = {},
} = {}) {
  const finalIds = { ...DEFAULT_IDS, ...ids };

  const els = {
    tbody: document.getElementById(finalIds.tbody),
    errors: document.getElementById(finalIds.errors),
    sort: document.getElementById(finalIds.sort),
    minCount: document.getElementById(finalIds.minCount),
    refresh: document.getElementById(finalIds.refresh),
  };

  // If required bits are missing, bail
  if (!els.tbody || !els.errors || !els.sort || !els.minCount || !els.refresh) {
    console.warn('[p_reviews] Missing required DOM nodes:', els);
    return;
  }

  const state = {
    reviews: [],
    groups: [],
    sort: els.sort.value || 'avg_desc',
    minCount: Number(els.minCount.value || 0),
  };

  // wire controls
  els.sort.addEventListener('change', () => {
    state.sort = els.sort.value;
    applyView();
  });

  els.minCount.addEventListener('input', () => {
    state.minCount = Number(els.minCount.value || 0);
    applyView();
  });

  els.refresh.addEventListener('click', () => load(true));

  // init
  load(false);

  async function load(force = false) {
    try {
      showError(null);

      const headers = { 'X-Bin-Meta': 'false' };
      if (REVIEWS_JSON_KEY) headers['X-Master-Key'] = REVIEWS_JSON_KEY;

      const res = await fetch(jsonUrl, { method: 'GET', headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

      const data = await res.json();

      // Accept several shapes: array, {reviews:[]}, {record:{reviews:[]}}, {record:[]}
      const rows =
        Array.isArray(data) ? data :
        Array.isArray(data?.reviews) ? data.reviews :
        Array.isArray(data?.record?.reviews) ? data.record.reviews :
        Array.isArray(data?.record) ? data.record :
        [];

      state.reviews = sanitize(rows);
      state.groups = groupByProduct(state.reviews);

      if (!force) {
        // Reset filters only on first load
        state.sort = 'avg_desc';
        els.sort.value = 'avg_desc';
        state.minCount = 0;
        els.minCount.value = '0';
      }

      applyView();
    } catch (err) {
      console.error('[p_reviews] load error', err);
      showError(err.message || 'Failed to load reviews.');
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
        reviewText: safeText(r?.reviewText ?? r?.review),
        createdAt: safeText(r?.createdAt) || null,
      }))
      .filter(r =>
        r.productId &&
        Number.isFinite(r.rating) &&
        r.rating >= 0 &&
        r.rating <= 5
      );
  }

  function groupByProduct(reviews) {
    const parseDate = (s) => {
      const d = Date.parse(s);
      return Number.isFinite(d) ? d : NaN;
    };

    const map = new Map();

    for (const r of reviews) {
      let g = map.get(r.productId);
      if (!g) {
        g = { productId: r.productId, count: 0, sum: 0, snippets: [] };
      }
      g.count += 1;
      g.sum += r.rating;

      const name = buildName(r.firstName, r.lastName);
      const snippet = r.reviewText ? truncate(r.reviewText, 120) : '';
      const when = parseDate(r.createdAt);

      if (snippet) {
        g.snippets.push({
          name,
          text: snippet,
          fullText: r.reviewText,
          rating: r.rating,
          createdAt: when,
        });
      }

      map.set(r.productId, g);
    }

    return Array.from(map.values()).map(g => {
      const hasDates = g.snippets.some(s => Number.isFinite(s.createdAt));
      if (hasDates) {
        g.snippets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
      g.snippets = g.snippets.slice(0, 3);
      return { ...g, avg: g.count ? g.sum / g.count : 0 };
    });
  }

  function applyView() {
    const min = state.minCount || 0;
    let rows = state.groups.filter(g => g.count >= min);
    rows = sortRows(rows, state.sort);
    render(rows);
  }

  function sortRows(rows, mode) {
    const a = rows.slice();
    switch (mode) {
      case 'avg_desc':
        a.sort((x, y) => y.avg - x.avg || x.productId.localeCompare(y.productId));
        break;
      case 'avg_asc':
        a.sort((x, y) => x.avg - y.avg || x.productId.localeCompare(y.productId));
        break;
      case 'count_desc':
        a.sort((x, y) => y.count - x.count || x.productId.localeCompare(y.productId));
        break;
      case 'count_asc':
        a.sort((x, y) => x.count - y.count || x.productId.localeCompare(y.productId));
        break;
      case 'pid_desc':
        a.sort((x, y) => y.productId.localeCompare(x.productId));
        break;
      case 'pid_asc':
      default:
        a.sort((x, y) => x.productId.localeCompare(y.productId));
        break;
    }
    return a;
  }

  function render(rows) {
    els.tbody.innerHTML = '';

    if (!rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="4" class="px-4 py-6 text-sm text-[color:#93a1b3]">
          No reviews to display.
        </td>`;
      els.tbody.appendChild(tr);
      return;
    }

    for (const r of rows) {
      els.tbody.appendChild(renderProductRow(r));
    }
  }

  function renderProductRow(r) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-white/5 transition';

    const pct = Math.max(0, Math.min(100, (r.avg / 5) * 100));
    const avgStr = (Math.round(r.avg * 10) / 10).toFixed(1);

    const reviewsHtml = r.snippets.length
      ? r.snippets
          .map(s => {
            const p = Math.max(0, Math.min(100, (s.rating / 5) * 100));
            return `
              <div class="p-2 pr-3 mr-2 mb-2 rounded-lg border border-border bg-white/5 inline-flex items-start gap-2 max-w-full">
                <div class="mt-0.5">
                  <div class="relative leading-none text-[14px] tracking-[2px] select-none">
                    <div class="text-[color:#2a3545]">★★★★★</div>
                    <div class="absolute inset-0 overflow-hidden whitespace-nowrap" style="width:${p}%">
                      <div class="text-[color:#fbbf24]">★★★★★</div>
                    </div>
                  </div>
                </div>
                <div class="text-xs sm:text-sm">
                  <div class="font-semibold">${escapeHtml(s.name || 'Anonymous')}</div>
                  <div class="text-[color:#93a1b3] break-words">${escapeHtml(s.text)}</div>
                </div>
              </div>
            `;
          })
          .join('')
      : `<span class="text-[color:#93a1b3] text-sm">—</span>`;

    tr.innerHTML = `
      <td class="px-4 py-4 font-mono text-sm">${escapeHtml(r.productId)}</td>
      <td class="px-4 py-4">
        <div class="inline-flex items-center">
          <div class="relative inline-block leading-none text-xl tracking-[2px] select-none">
            <div class="text-[color:#2a3545]">★★★★★</div>
            <div class="absolute inset-0 overflow-hidden whitespace-nowrap" style="width:${pct}%">
              <div class="text-[color:#fbbf24] drop-shadow">★★★★★</div>
            </div>
          </div>
          <span class="ml-2 font-semibold">${avgStr}</span>
        </div>
      </td>
      <td class="px-4 py-4 text-[color:#93a1b3]">${r.count}</td>
      <td class="px-4 py-4">
        <div class="flex flex-wrap">
          ${reviewsHtml}
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
  function truncate(s, n) {
    const str = String(s || '');
    return str.length > n ? str.slice(0, n - 1) + '…' : str;
  }
  function showError(msg) {
    if (!els.errors) return;
    if (!msg) {
      els.errors.classList.add('hidden');
      els.errors.textContent = '';
    } else {
      els.errors.classList.remove('hidden');
      els.errors.textContent = msg;
    }
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
