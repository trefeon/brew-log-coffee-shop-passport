import { STORAGE_KEY, createEntry, deleteEntry, loadEntries, saveEntries, filterSort, stats, searchEntries, isQuotaError, sanitizeEntries, loadDraft, saveDraft, clearDraft, mergeImport, loadPrefs, savePrefs } from "./store.js";

const state = { entries: [], filter: { mode: "all", sort: "newest", q: "" } };
const $ = (s) => document.querySelector(s);
const form = $("#entryForm");
const grid = $("#stampGrid");
const banner = $("#validationBanner");
const bannerMsg = $("#validationMsg");
let lastRemoved = null;
let snackTimer = 0;

const CUP_SVG = '<svg class="seal-cup" viewBox="0 0 24 24"><path fill="currentColor" d="M2 21h18v-2H2v2zm2-11v5c0 2.2 1.8 4 4 4h6c2.2 0 4-1.8 4-4v-5H4zm14-5H4v3h14V5zm2 0h-1v5h1c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/></svg>';

function esc(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function showBanner(msg) {
  if (!banner || !bannerMsg) return;
  bannerMsg.textContent = msg;
  banner.hidden = false;
  banner.scrollIntoView({ behavior: "smooth", block: "center" });
}

function dismissBanner() { if (banner) banner.hidden = true; }

function makeCard(e) {
  const card = document.createElement("article");
  card.className = "stamp-card";
  const r = Number(e.rating) || 0;
  const stars = "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);
  const dStr = new Date(e.visitedAt).toLocaleDateString("en-US", { dateStyle: "medium" });
  card.innerHTML =
    '<div><div class="card-top"><span class="city-badge">' + esc(e.city.toUpperCase()) + '</span>' +
    '<div class="card-seal" aria-hidden="true"><span class="seal-star">' + r + '★</span>' + CUP_SVG + '<span class="seal-verif">VERIF</span></div></div>' +
    '<h3 class="card-title">' + esc(e.name) + '</h3>' +
    '<p class="card-drink">Drank: ' + esc(e.drink) + '</p>' +
    '<div class="card-stars"><span class="stars-glyph">' + stars + '</span><span class="stars-score">' + r + '/5</span></div>' +
    (e.note && e.note.trim() ? '<div class="card-note"><p class="note-quote">&ldquo;' + esc(e.note.trim()) + '&rdquo;</p></div>' : "") +
    '</div><div class="card-footer"><span class="card-date">Visited ' + dStr + '</span>' +
    '<button type="button" class="card-btn danger" data-act="del" data-id="' + esc(e.id) + '">Remove</button></div>';
  return card;
}

export function render() {
  const s = stats(state.entries);
  const count = s.count;
  const avg = s.avg !== null ? s.avg.toFixed(1) : "0.0";
  const hoods = new Set(state.entries.map((e) => String(e.city || "").trim().toLowerCase()).filter(Boolean)).size;

  $("#statVisits").textContent = String(count);
  $("#statAvg").textContent = count ? avg + " / 5" : "0.0 / 5";
  $("#statSubtitle").textContent = count === 0
    ? "0 visits, awaiting your first entry"
    : count + " visit" + (count === 1 ? "" : "s") + ", poured across " + hoods + " neighborhood" + (hoods === 1 ? "" : "s");

  const dist = [0, 0, 0, 0, 0, 0];
  for (const item of state.entries) if (item.rating >= 1 && item.rating <= 5) dist[item.rating]++;
  const dp = $("#distStrip");
  if (dp) {
    dp.replaceChildren();
    if (count) {
      const mx = Math.max(1, dist[1], dist[2], dist[3], dist[4], dist[5]);
      for (let star = 5; star >= 1; star--) {
        const row = document.createElement("div");
        row.className = "drow";
        const lab = document.createElement("span");
        lab.className = "dlab";
        lab.textContent = star + "★ " + dist[star];
        const bar = document.createElement("span");
        bar.className = "dbar";
        bar.style.width = (dist[star] / mx) * 100 + "%";
        row.append(lab, bar);
        dp.append(row);
      }
    }
  }

  const mark = count >= 25 ? 25 : count >= 10 ? 10 : 0;
  const ms = $("#milestone");
  if (ms) {
    ms.hidden = !mark;
    if (mark) ms.textContent = "MILESTONE: " + mark + " STAMPS IN BOOKLET";
  }

  const list = filterSort(searchEntries(state.entries, state.filter.q || ""), state.filter);
  grid.replaceChildren();
  const emptyState = $("#emptyState");
  if (!list.length) {
    grid.hidden = true;
    if (emptyState) {
      emptyState.hidden = false;
      const fresh = !count;
      const q = (state.filter.q || "").trim();
      $("#emptyTitle").textContent = fresh ? "Your first stamp is waiting" : "No matching stamps found";
      $("#emptyDesc").textContent = fresh
        ? "No coffee shops recorded yet. Walk to a nearby roaster, order a cup, and stamp your passport."
        : q ? 'No entries match "' + q + '". Try a different search or clear your filter.'
        : "No coffee shops match this rating filter. Reset filters to view all stamps.";
    }
  } else {
    grid.hidden = false;
    if (emptyState) emptyState.hidden = true;
    for (const item of list) grid.append(makeCard(item));
  }
}

function persist() {
  try { saveEntries(localStorage, state.entries); }
  catch (e) { if (isQuotaError(e)) showSnack("Cannot save, browser storage is full."); }
}

function onSubmit(e) {
  e.preventDefault();
  dismissBanner();
  const name = $("#fName").value.trim();
  const city = $("#fCity").value.trim();
  const drink = $("#fDrink").value.trim();
  const rating = Number($('input[name="rating"]:checked')?.value || 0);
  const note = $("#fNote").value.trim();

  if (!name) { showBanner("Enter a cafe name."); $("#fName").focus(); return; }
  if (!city) { showBanner("Enter the city or neighborhood."); $("#fCity").focus(); return; }
  if (!drink) { showBanner("Enter what was in the cup."); $("#fDrink").focus(); return; }
  if (rating < 1 || rating > 5) { showBanner("Tap a rating stamp, 1 through 5."); return; }

  const result = createEntry({ name, city, drink, rating, note });
  if (!result.ok) { showBanner(result.problem); return; }

  state.entries.unshift(result.value);
  persist();
  form.reset();
  setRatingDisplay(4);
  const defRadio = $('input[name="rating"][value="4"]');
  if (defRadio) defRadio.checked = true;
  try { clearDraft(localStorage); } catch {}
  render();
  grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onGridClick(e) {
  const btn = e.target.closest?.("[data-act]");
  if (!btn) return;
  if (btn.dataset.act !== "del") return;
  const idx = state.entries.findIndex((x) => x.id === btn.dataset.id);
  if (idx < 0) return;
  lastRemoved = { entry: state.entries[idx], index: idx };
  state.entries = deleteEntry(state.entries, btn.dataset.id);
  persist(); render();
  showSnack('Removed "' + lastRemoved.entry.name + '".');
}

function showSnack(msg) {
  $("#snackMsg").textContent = msg;
  $("#snackBar").hidden = false;
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => { $("#snackBar").hidden = true; }, 6000);
}

function onUndo() {
  if (!lastRemoved) return;
  const found = lastRemoved;
  lastRemoved = null;
  $("#snackBar").hidden = true;
  state.entries.splice(Math.min(found.index, state.entries.length), 0, found.entry);
  persist(); render();
}

function setRatingDisplay(val) {
  const v = Number(val) || 0;
  $("#rateCount").textContent = v + " / 5 STARS";
  form.querySelectorAll("#fRating .star-label").forEach((lb, idx) => {
    const s = idx + 1;
    lb.classList.toggle("on", s <= v);
    const g = lb.querySelector(".star-glyph");
    if (g) g.textContent = s <= v ? "★" : "☆";
  });
}

function onRatingChange() {
  setRatingDisplay($('input[name="rating"]:checked')?.value || 0);
  onDraft();
}

function onChips(e) {
  const btn = e.target.closest?.(".chip");
  if (!btn || !btn.dataset.drink) return;
  $("#fDrink").value = btn.dataset.drink;
  $("#drinkChips").querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === btn ? "true" : "false"));
  onDraft();
  $("#fDrink").focus();
}

function onFilterChange() {
  state.filter.mode = $("#filterMode").value;
  state.filter.sort = $("#sortMode").value;
  try { savePrefs(localStorage, state.filter); } catch {}
  render();
}

function onSearch() {
  state.filter.q = $("#searchBox").value;
  try { savePrefs(localStorage, state.filter); } catch {}
  render();
}

function onDraft() {
  try {
    saveDraft(localStorage, {
      name: $("#fName").value,
      city: $("#fCity").value,
      drink: $("#fDrink").value,
      rating: Number($('input[name="rating"]:checked')?.value || 4),
      note: $("#fNote").value
    });
  } catch {}
}

function restoreDraft() {
  let d = null;
  try { d = loadDraft(localStorage); } catch {}
  if (!d) return;
  if (d.name) $("#fName").value = d.name;
  if (d.city) $("#fCity").value = d.city;
  if (d.drink) $("#fDrink").value = d.drink;
  if (d.note) $("#fNote").value = d.note;
  const r = form.querySelector('input[name="rating"][value="' + d.rating + '"]');
  if (r) r.checked = true;
  setRatingDisplay(d.rating || 4);
}

function onExport() {
  const blob = new Blob([JSON.stringify(state.entries)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "brew-log-passport.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function onImport() {
  const pick = $("#importFile");
  const f = pick.files && pick.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const out = mergeImport(state.entries, JSON.parse(String(rd.result)));
      state.entries = out.merged;
      persist(); render();
      showSnack("Imported " + out.imported + ", skipped " + out.skipped + ".");
    } catch { showSnack("Import failed: invalid JSON file."); }
    pick.value = "";
  };
  rd.readAsText(f);
}

function onArchiveToggle() {
  const drawer = $("#archiveDrawer");
  const btn = $("#archiveToggleBtn");
  if (!drawer) return;
  drawer.hidden = !drawer.hidden;
  btn.setAttribute("aria-expanded", String(!drawer.hidden));
}

function onResetFilters() {
  $("#filterMode").value = "all";
  $("#sortMode").value = "newest";
  if ($("#searchBox")) $("#searchBox").value = "";
  state.filter = { mode: "all", sort: "newest", q: "" };
  try { savePrefs(localStorage, state.filter); } catch {}
  render();
}

function init() {
  let stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch {}
  if (stored === null) {
    state.entries = [];
  } else {
    try { state.entries = sanitizeEntries(loadEntries(localStorage)) || []; }
    catch { state.entries = []; }
  }

  try {
    const p = loadPrefs(localStorage);
    state.filter = { mode: p.mode, sort: p.sort, q: p.q };
    $("#filterMode").value = p.mode;
    $("#sortMode").value = p.sort;
    if ($("#searchBox")) $("#searchBox").value = p.q;
  } catch {}

  restoreDraft();
  setRatingDisplay($('input[name="rating"]:checked')?.value || 4);

  form.onsubmit = onSubmit;
  form.oninput = onDraft;
  grid.onclick = onGridClick;
  $("#drinkChips").onclick = onChips;
  $("#fRating").onchange = onRatingChange;
  $("#filterMode").onchange = onFilterChange;
  $("#sortMode").onchange = onFilterChange;
  $("#searchBox").oninput = onSearch;
  $("#undoBtn").onclick = onUndo;
  $("#exportBtn").onclick = onExport;
  $("#importFile").onchange = onImport;
  $("#archiveToggleBtn").onclick = onArchiveToggle;
  $("#dismissBanner").onclick = dismissBanner;
  $("#resetFiltersBtn").onclick = onResetFilters;

  render();
}

init();
