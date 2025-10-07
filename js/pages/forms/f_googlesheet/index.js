import { pingBuildOnce, fetchCatalog } from './api.js';
import { populateItemSelect, showToast } from './ui.js';
import { REVIEW_WEBHOOK } from './config.js';

const form = document.getElementById('reviewForm');
const toast = document.getElementById('toast');
const submitBtn = document.getElementById('submitBtn');
const itemSelect = document.getElementById('item');

pingBuildOnce();

(async function initCatalog() {
  try {
    const data = await fetchCatalog();
    const list = Array.isArray(data?.products) ? data.products : [];
    const finalList = list.length ? list : [];
    populateItemSelect(itemSelect, finalList);
  } catch (e) {
    console.error('initCatalog error', e);
    populateItemSelect(itemSelect, []);
  }
})();

async function handleSubmit(e) {
  e.preventDefault();
  if (!form) return;

  const payload = {
    event: 'review_submit',
    firstName: form.firstName.value.trim(),
    lastName: form.lastName.value.trim(),
    email: form.email.value.trim(),
    itemId: form.item.value,
    stars: Number(form.stars.value),
    reviewText: form.reviewText.value.trim(),
    submittedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    pageUrl: location.href,
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.itemId || !payload.reviewText) {
    return showToast(toast, 'Please complete all fields.', false);
  }
  if (!(payload.stars >= 1 && payload.stars <= 5)) {
    return showToast(toast, 'Stars must be between 1 and 5.', false);
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
    if (itemSelect) itemSelect.selectedIndex = 0;
  } catch (err) {
    console.error(err);
    showToast(toast, 'Submission failed. Please try again.', false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-70');
  }
}
if (form) form.addEventListener('submit', handleSubmit);
