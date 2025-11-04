// js/pageInserts/nav.js
const PROJECT_BASE = "/dbproject"; // <-- your GitHub Pages repo name

export async function loadNav() {
  try {
    const container = document.createElement("div");

    // Use repo base path to load nav.html correctly on GitHub Pages
    const res = await fetch(`${PROJECT_BASE}/pageInserts/nav.html`);
    if (!res.ok) throw new Error("Failed to load nav.html");

    container.innerHTML = await res.text();
    document.body.prepend(container);

    // Mobile toggle
    const toggle = container.querySelector("#navToggle");
    const mobile = container.querySelector("#mobileNav");
    if (toggle && mobile) {
      toggle.addEventListener("click", () => {
        mobile.classList.toggle("hidden");
      });
    }

    // Highlight active section
    highlightActiveSection(container);
  } catch (err) {
    console.error("[nav] Failed to load nav:", err);
  }
}

function highlightActiveSection(root) {
  const path = window.location.pathname || "";

  let section = null;
  if (path.includes("/f_googlesheet") || path.includes("/hiw/googlesheet")) {
    section = "google-sheets";
  } else if (path.includes("/f_sql") || path.includes("/hiw/sql")) {
    section = "sql";
  } else if (path.includes("/f_superbase") || path.includes("/hiw/superbase")) {
    section = "supabase";
  }

  if (!section) return;

  const labels = root.querySelectorAll(
    `[data-section="${section}"] .nav-section-label`
  );

  labels.forEach((el) => {
    el.classList.add("text-blue-400", "font-semibold");
  });
}
