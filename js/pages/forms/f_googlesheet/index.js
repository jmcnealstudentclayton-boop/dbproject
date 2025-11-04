// index.js — single entry point for f_googlesheet page
import { pingBuildOnce, fetchCatalog } from './api.js';
import { populateItemSelect, showToast } from './ui.js';
import { REVIEW_WEBHOOK } from './config.js';
import { initReviews } from './reviews.js';

const form = document.getElementById('reviewForm');
const toast = document.getElementById('toast');
const submitBtn = document.getElementById('submitBtn');
const itemEl = document.getElementById('item');

pingBuildOnce();

// Load catalog and (if #item is a <select>) populate options
(async function initCatalog() {
  try {
    const data = await fetchCatalog();
    const list = Array.isArray(data?.products) ? data.products : [];
    populateItemSelect(itemEl, list);
  } catch (e) {
    console.error('initCatalog error', e);
    populateItemSelect(itemEl, []);
  }
})();

// Init review visualization after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initReviews(); // uses config REVIEWS_JSON_URL
});

async function handleSubmit(e) {
  e.preventDefault();
  if (!form) return;

  // accept either #rating or #stars (or name="rating"/"stars")
  const ratingEl =
    form.querySelector('#rating, [name="rating"], #stars, [name="stars"]');

  const ratingVal = Number(ratingEl?.value);

  const payload = {
    event: 'review_submit',
    firstName: form.firstName?.value.trim(),
    lastName:  form.lastName?.value.trim(),
    email:     form.email?.value.trim(),
    itemId:    itemEl?.value ?? form.item?.value,
    rating:    ratingVal,          // always set rating
    stars:     ratingVal,          // also set stars for backward compatibility
    quality:   Number(form.quality?.value), // if present in form
    reviewText: form.reviewText?.value.trim(),
    submittedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    pageUrl: location.href,
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.itemId || !payload.reviewText) {
    return showToast(toast, 'Please complete all fields.', false);
  }
  if (!(ratingVal >= 1 && ratingVal <= 5)) {
    return showToast(toast, 'Rating must be between 1 and 5.', false);
  }

  try {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70');

    const res = await fetch(REVIEW_WEBHOOK, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Network error: ' + res.status);

    showToast(toast, 'Thanks! Your review was submitted.');
    form.reset();
    if (itemEl && itemEl instanceof HTMLSelectElement) itemEl.selectedIndex = 0;
  } catch (err) {
    console.error(err);
    showToast(toast, 'Submission failed. Please try again.', false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-70');
  }
}
if (form) form.addEventListener('submit', handleSubmit);
