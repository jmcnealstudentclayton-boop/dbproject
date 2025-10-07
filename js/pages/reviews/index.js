// /js/pages/reviews/index.js
const JSON_URL = "https://api.jsonbin.io/v3/b/68ded247d0ea881f4093334a";

const els = {
  tbody: document.getElementById('tbody'),
  errors: document.getElementById('errors'),
  sort: document.getElementById('sortSelect'),
  minCount: document.getElementById('minCount'),
  refresh: document.getElementById('refreshBtn')
};

const state = {
  reviews: [],
  groups: [],
  sort: "avg_desc",
  minCount: 0
};

els.sort.addEventListener('change', () => {
  state.sort = els.sort.value;
  applyView();
});
els.minCount.addEventListener('input', () => {
  state.minCount = Number(els.minCount.value || 0);
  applyView();
});
els.refresh.addEventListener('click', () => load(true));

init();

async function init() {
  await load();
}

async function load(force = false) {
  try {
    showError(null);
    const res = await fetch(JSON_URL, {
      method: 'GET',
      headers: { 'X-Bin-Meta': 'false' } // only body if bin allows it
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();
    const arr = Array.isArray(data?.reviews) ? data.reviews : [];
    state.reviews = sanitize(arr);
    state.groups = groupByProduct(state.reviews);

    if (!force) {
      // reset controls on first load
      state.sort = 'avg_desc';
      els.sort.value = 'avg_desc';
      state.minCount = 0;
      els.minCount.value = '0';
    }
    applyView();
  } catch (err) {
    showError(err.message || 'Failed to load reviews.');
  }
}

function sanitize(arr) {
  return arr
    .map(r => ({
      productId: r?.productId ?? r?.itemId ?? null,
      rating: Number(r?.rating),
    }))
    .filter(r => r.productId && Number.isFinite(r.rating) && r.rating >= 0 && r.rating <= 5);
}

function groupByProduct(reviews) {
  const map = new Map();
  for (const r of reviews) {
    const g = map.get(r.productId) || { productId: r.productId, count: 0, sum: 0 };
    g.count += 1;
    g.sum += r.rating;
    map.set(r.productId, g);
  }
  return Array.from(map.values()).map(g => ({ ...g, avg: g.count ? g.sum / g.count : 0 }));
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
    case 'avg_desc': a.sort((x,y) => y.avg - x.avg || x.productId.localeCompare(y.productId)); break;
    case 'avg_asc': a.sort((x,y) => x.avg - y.avg || x.productId.localeCompare(y.productId)); break;
    case 'count_desc': a.sort((x,y) => y.count - x.count || x.productId.localeCompare(y.productId)); break;
    case 'count_asc': a.sort((x,y) => x.count - y.count || x.productId.localeCompare(y.productId)); break;
    case 'pid_desc': a.sort((x,y) => y.productId.localeCompare(x.productId)); break;
    case 'pid_asc':
    default: a.sort((x,y) => x.productId.localeCompare(y.productId)); break;
  }
  return a;
}

function render(rows) {
  els.tbody.innerHTML = '';
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" class="px-4 py-6 text-sm text-[color:#93a1b3]">No reviews to display.</td>`;
    els.tbody.appendChild(tr);
    return;
  }
  for (const r of rows) {
    els.tbody.appendChild(renderRow(r));
  }
}

function renderRow(r) {
  const tr = document.createElement('tr');
  tr.className = 'hover:bg-white/5 transition';
  const pct = Math.max(0, Math.min(100, (r.avg / 5) * 100));
  const avgStr = (Math.round(r.avg * 10) / 10).toFixed(1);

  tr.innerHTML = `
    <td class="px-4 py-4 font-mono text-sm">${escapeHtml(r.productId)}</td>
    <td class="px-4 py-4">
      <div class="inline-block align-middle">
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
  `;
  return tr;
}

function showError(msg) {
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
