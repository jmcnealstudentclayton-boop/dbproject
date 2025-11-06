// js/pages/forms/f_superbase/index.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("supabaseReviewForm");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const itemSelect = document.getElementById("itemId");

// Summary elements
const itemSummaryBody = document.getElementById("itemSummaryBody");
const customerSummaryBody = document.getElementById("customerSummaryBody");
const itemSummaryStatus = document.getElementById("itemSummaryStatus");
const customerSummaryStatus = document.getElementById("customerSummaryStatus");
const refreshSummariesBtn = document.getElementById("refreshSummariesBtn");

function setStatus(message, type = "info") {
  if (!statusEl) return;
  const colors = {
    info: "text-gray-600 dark:text-gray-300",
    success: "text-emerald-600 dark:text-emerald-400",
    error: "text-red-600 dark:text-red-400",
  };
  statusEl.className = `text-xs sm:text-sm ${colors[type] || colors.info}`;
  statusEl.textContent = message;
}

// ---------- LOAD ITEMS FOR DROPDOWN ----------
async function loadItems() {
  if (!itemSelect) return;

  itemSelect.innerHTML = `<option value="">Loading items…</option>`;

  const { data, error } = await supabase
    .from("items")
    .select("item_id, item_name")
    .order("item_id", { ascending: true });

  if (error) {
    console.error("Error loading items:", error);
    itemSelect.innerHTML = `<option value="">Failed to load items</option>`;
    setStatus("Could not load items from Supabase.", "error");
    return;
  }

  if (!data || data.length === 0) {
    itemSelect.innerHTML = `<option value="">No items found</option>`;
    return;
  }

  const options = data
    .map(
      (item) =>
        `<option value="${item.item_id}">
          [${item.item_id}] ${item.item_name}
        </option>`
    )
    .join("");

  itemSelect.innerHTML = `<option value="">Select an item…</option>${options}`;
}

// ---------- FORM SUBMIT ----------
async function handleSubmit(event) {
  event.preventDefault();
  if (!form) return;

  const formData = new FormData(form);
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const itemIdRaw = formData.get("itemId")?.toString().trim();
  const ratingRaw = formData.get("rating")?.toString().trim();
  const reviewText = formData.get("reviewText")?.toString().trim() || null;

  if (!firstName || !lastName || !email || !itemIdRaw || !ratingRaw) {
    setStatus("Please fill in all required fields.", "error");
    return;
  }

  const itemId = Number(itemIdRaw);
  const starScore = Number(ratingRaw);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    setStatus("Please choose a valid item.", "error");
    return;
  }
  if (!Number.isInteger(starScore) || starScore < 1 || starScore > 5) {
    setStatus("Rating must be a whole number between 1 and 5.", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Submitting review to Supabase…", "info");

  try {
    // 1) Upsert customer by email
    const { data: customerRow, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
        },
        {
          onConflict: "email",
        }
      )
      .select("customer_id")
      .single();

    if (customerError || !customerRow) {
      console.error("Customer upsert error:", customerError);
      throw new Error("Could not save customer in Supabase.");
    }

    const customerId = customerRow.customer_id;

    // 2) Insert review
    const { error: reviewError } = await supabase.from("reviews").insert({
      customer_id: customerId,
      item_id: itemId,
      star_score: starScore,
      review_text: reviewText,
      // review_date defaults in DB
    });

    if (reviewError) {
      console.error("Review insert error:", reviewError);
      throw new Error("Could not insert review into Supabase.");
    }

    setStatus("Review submitted successfully to Supabase! 🎉", "success");
    form.reset();
    if (itemSelect) {
      itemSelect.selectedIndex = 0;
    }

    // Reload summaries so the new review is reflected
    loadSummaries();
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Something went wrong submitting your review.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------- VIEW: ITEM SUMMARY ----------
function setItemSummaryStatus(message, type = "info") {
  if (!itemSummaryStatus) return;
  const colors = {
    info: "text-gray-500 dark:text-gray-400",
    error: "text-red-500 dark:text-red-400",
  };
  itemSummaryStatus.className = `px-4 py-2 text-[11px] ${colors[type] || colors.info}`;
  itemSummaryStatus.textContent = message;
}

async function loadItemSummary() {
  if (!itemSummaryBody) return;

  itemSummaryBody.innerHTML = `
    <tr>
      <td colspan="4" class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
        Loading item summary…
      </td>
    </tr>
  `;
  setItemSummaryStatus("", "info");

  const { data, error } = await supabase
    .from("v_item_review_summary")
    .select("item_id, item_name, reviews_count, avg_score, first_review_at, last_review_at")
    .order("item_id", { ascending: true });

  if (error) {
    console.error("Error loading item summary:", error);
    itemSummaryBody.innerHTML = `
      <tr>
        <td colspan="4" class="px-3 py-3 text-xs text-red-500 dark:text-red-400">
          Failed to load item summary.
        </td>
      </tr>
    `;
    setItemSummaryStatus("Could not load v_item_review_summary from Supabase.", "error");
    return;
  }

  if (!data || data.length === 0) {
    itemSummaryBody.innerHTML = `
      <tr>
        <td colspan="4" class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
          No items found in the summary view yet.
        </td>
      </tr>
    `;
    setItemSummaryStatus("No summary data yet — submit a review to get started.", "info");
    return;
  }

  const rows = data
    .map((row) => {
      const avg = row.avg_score !== null ? Number(row.avg_score).toFixed(2) : "—";
      const firstDate = row.first_review_at
        ? new Date(row.first_review_at).toLocaleDateString()
        : "—";
      const lastDate = row.last_review_at
        ? new Date(row.last_review_at).toLocaleDateString()
        : "—";

      return `
        <tr>
          <td class="px-3 py-2 align-top">
            <div class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
              ${row.item_name || "(no name)"}
            </div>
            <div class="text-[11px] text-gray-500 dark:text-gray-400">
              ID: ${row.item_id}
            </div>
          </td>
          <td class="px-3 py-2 text-right text-xs sm:text-sm">
            ${avg}
          </td>
          <td class="px-3 py-2 text-right text-xs sm:text-sm">
            ${row.reviews_count ?? 0}
          </td>
          <td class="px-3 py-2 text-left text-[11px] text-gray-500 dark:text-gray-400 hidden sm:table-cell">
            <div>First: ${firstDate}</div>
            <div>Last: ${lastDate}</div>
          </td>
        </tr>
      `;
    })
    .join("");

  itemSummaryBody.innerHTML = rows;
  setItemSummaryStatus(`Loaded ${data.length} item rows from v_item_review_summary.`, "info");
}

// ---------- VIEW: CUSTOMER SUMMARY ----------
function setCustomerSummaryStatus(message, type = "info") {
  if (!customerSummaryStatus) return;
  const colors = {
    info: "text-gray-500 dark:text-gray-400",
    error: "text-red-500 dark:text-red-400",
  };
  customerSummaryStatus.className = `px-4 py-2 text-[11px] ${colors[type] || colors.info}`;
  customerSummaryStatus.textContent = message;
}

async function loadCustomerSummary() {
  if (!customerSummaryBody) return;

  customerSummaryBody.innerHTML = `
    <tr>
      <td colspan="2" class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
        Loading customer summary…
      </td>
    </tr>
  `;
  setCustomerSummaryStatus("", "info");

  const { data, error } = await supabase
    .from("v_customer_review_summary")
    .select("customer_id, customer_name, reviews_count")
    .order("customer_id", { ascending: true });

  if (error) {
    console.error("Error loading customer summary:", error);
    customerSummaryBody.innerHTML = `
      <tr>
        <td colspan="2" class="px-3 py-3 text-xs text-red-500 dark:text-red-400">
          Failed to load customer summary.
        </td>
      </tr>
    `;
    setCustomerSummaryStatus("Could not load v_customer_review_summary from Supabase.", "error");
    return;
  }

  if (!data || data.length === 0) {
    customerSummaryBody.innerHTML = `
      <tr>
        <td colspan="2" class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
          No customers found in the summary view yet.
        </td>
      </tr>
    `;
    setCustomerSummaryStatus("No summary data yet — submit a review to get started.", "info");
    return;
  }

  const rows = data
    .map((row) => {
      return `
        <tr>
          <td class="px-3 py-2">
            <div class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
              ${row.customer_name || "(no name)"}
            </div>
            <div class="text-[11px] text-gray-500 dark:text-gray-400">
              ID: ${row.customer_id}
            </div>
          </td>
          <td class="px-3 py-2 text-right text-xs sm:text-sm">
            ${row.reviews_count ?? 0}
          </td>
        </tr>
      `;
    })
    .join("");

  customerSummaryBody.innerHTML = rows;
  setCustomerSummaryStatus(`Loaded ${data.length} customer rows from v_customer_review_summary.`, "info");
}

// ---------- LOAD BOTH SUMMARIES ----------
function loadSummaries() {
  loadItemSummary();
  loadCustomerSummary();
}

// Wire up listeners
if (form) {
  form.addEventListener("submit", handleSubmit);
}

if (refreshSummariesBtn) {
  refreshSummariesBtn.addEventListener("click", () => {
    loadSummaries();
  });
}

// Initial loads
loadItems();
loadSummaries();
