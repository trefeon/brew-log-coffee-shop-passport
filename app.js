// @ts-check
import { STORAGE_KEY, createEntry, deleteEntry, loadEntries, saveEntries, filterSort, stats, searchEntries } from "./store.js";
/** @typedef {{id:string,name:string,city:string,drink:string,rating:number,note:string,visitedAt:string}} Entry */
/** @type {{entries:Entry[],filter:{mode:string,sort:string,q:string}}} */
const state = { entries: [], filter: { mode: "all", sort: "newest", q: "" } };
/** @param {string} s @returns {any} */
function $(s) { return document.querySelector(s); }
const form = $("#entryForm");
const grid = $("#stampGrid");
/** @type {{entry:Entry,index:number}|null} */
let lastRemoved = null;
/** @type {any} */
let snackTimer = 0;
/** @param {any} p @param {string} t @param {string} c @param {string} x @returns {any} */
function tx(p, t, c, x) {
  const el = p.appendChild(document.createElement(t));
  el.className = c;
  el.textContent = x;
  return el;
}
/** @param {Entry} e @returns {any} */
function makeCard(e) {
  const card = document.createElement("article");
  card.className = "stamp";
  tx(card, "span", "seal", "VERIF").setAttribute("aria-hidden", "true");
  tx(card, "h3", "stamp-name", e.name);
  tx(card, "p", "stamp-city", e.city);
  tx(card, "p", "stamp-drink", e.drink);
  const r = Number(e.rating) || 0;
  tx(card, "p", "stamp-stars", "★".repeat(r) + "☆".repeat(5 - r)).setAttribute("aria-label", "Rated " + r + " out of 5");
  if (e.note && e.note.trim()) tx(card, "p", "stamp-note", e.note);
  tx(card, "time", "stamp-date", new Date(e.visitedAt).toLocaleDateString(undefined, {month:"short",day:"numeric",year:"numeric"}));
  tx(card, "button", "stamp-del", "Remove").dataset.id = e.id;
  return card;
}
/** @returns {void} */
export function render() {
  const s = stats(state.entries);
  const count = s.count;
  const avg = s.avg ?? 0;
  const hoods = new Set(state.entries.map(e => String(e.city || "").trim().toLowerCase()).filter(Boolean)).size;
  const head = count === 1 ? "1 café in your passport" : count + " cafés in your passport";
  $("#statStrip").textContent = count ? count + " CAFES · AVG " + avg + " · " + hoods + " NEIGHBORHOODS" : head + " · No ratings yet";
  const dist = [0, 0, 0, 0, 0, 0];
  for (const item of state.entries) { const r = item.rating; if (r >= 1 && r <= 5) dist[r]++; }
  const dp = $("#distStrip");
  dp.hidden = !count;
  if (count) dp.textContent = "5★ " + dist[5] + " · 4★ " + dist[4] + " · 3★ " + dist[3] + " · 2★ " + dist[2] + " · 1★ " + dist[1];
  const mark = count >= 25 ? 25 : count >= 10 ? 10 : 0;
  const ms = $("#milestone");
  ms.hidden = !mark;
  if (mark) ms.textContent = "MILESTONE " + mark + " STAMPS";
  const list = filterSort(searchEntries(state.entries, state.filter.q || ""), state.filter);
  grid.replaceChildren();
  const none = !list.length;
  grid.hidden = none;
  $("#emptyState").hidden = !none;
  if (none) {
    const fresh = !count;
    const q = (state.filter.q || "").trim();
    $("#emptyTitle").textContent = fresh ? "Your passport is empty" : "No matching stamps";
    $("#emptyDesc").textContent = fresh ? "Log your first café visit above." : q ? "Try a different name, city, or drink." : "Show all entries instead.";
    return;
  }
  for (const item of list) grid.append(makeCard(item));
}
/** @returns {void} */
function persist() {
  try { saveEntries(localStorage, state.entries); } catch {}
}
/** @param {any} e @returns {void} */
function onSubmit(e) {
  e.preventDefault();
  $("#errorBanner").hidden = true;
  const result = createEntry({ name: $("#fName").value, city: $("#fCity").value, drink: $("#fDrink").value, rating: Number($('input[name="rating"]:checked')?.value || 4), note: $("#fNote").value });
  if (!result.ok) {
    const problem = result.problem;
    $("#errorMsg").textContent = problem;
    $("#errorBanner").hidden = false;
    const t = problem.toLowerCase();
    (t.includes("city") ? $("#fCity") : t.includes("drink") ? $("#fDrink") : t.includes("star") ? $("#fRating input") : $("#fName")).focus();
    return;
  }
  state.entries.push(result.value);
  persist();
  form.reset();
  render();
}
/** @param {any} e @returns {void} */
function onGridClick(e) {
  const btn = e.target.closest?.(".stamp-del");
  if (!btn) return;
  const at = state.entries.findIndex(x => x.id === btn.dataset.id);
  if (at < 0) return;
  lastRemoved = { entry: state.entries[at], index: at };
  state.entries = deleteEntry(state.entries, btn.dataset.id);
  persist();
  render();
  showSnack("Removed " + lastRemoved.entry.name + ".");
}
/** @param {any} e @returns {void} */
function onChips(e) {
  const btn = e.target.closest?.("[data-drink]");
  if (!btn) return;
  $("#fDrink").value = btn.dataset.drink;
  $("#fDrink").focus();
}
/** @param {string} msg @returns {void} */
function showSnack(msg) {
  $("#snackMsg").textContent = msg;
  $("#snackBar").hidden = false;
  $("#undoBtn").focus();
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => { $("#snackBar").hidden = true; }, 6000);
}
/** @returns {void} */
function onUndo() {
  if (!lastRemoved) return;
  const found = lastRemoved;
  lastRemoved = null;
  $("#snackBar").hidden = true;
  state.entries.splice(Math.min(found.index, state.entries.length), 0, found.entry);
  persist();
  render();
  const back = /** @type {any} */ (grid.querySelector('[data-id="' + found.entry.id + '"]'));
  if (back) back.focus();
}
/** @returns {void} */
function onSearch() {
  state.filter.q = $("#searchBox").value;
  render();
}
/** @returns {void} */
function onExport() {
  const blob = new Blob([JSON.stringify(state.entries, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "brew-log-passport.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
/** @returns {void} */
function onView() {
  state.filter = { mode: $("#filterMode").value, sort: $("#sortMode").value, q: state.filter.q };
  render();
}
/** @returns {void} */
function init() {
  try { state.entries = loadEntries(localStorage) || []; } catch {}
  form.onsubmit = onSubmit;
  grid.onclick = onGridClick;
  $("#drinkChips").onclick = onChips;
  $("#filterMode").onchange = onView;
  $("#sortMode").onchange = onView;
  $("#searchBox").oninput = onSearch;
  $("#undoBtn").onclick = onUndo;
  $("#exportBtn").onclick = onExport;
  render();
}
init();
