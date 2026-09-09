// @ts-check
import { STORAGE_KEY, createEntry, deleteEntry, loadEntries, saveEntries, filterSort, stats } from "./store.js";
/** @typedef {{id:string,name:string,city:string,drink:string,rating:number,note:string,visitedAt:string}} Entry */
/** @typedef {{mode:"all"|"top",sort:"newest"|"city"|"rating"}} Filter */
/** @type {{entries:Entry[],filter:Filter}} */
const state = { entries: [], filter: { mode: "all", sort: "newest" } };
/** Find a node. @param {string} s selector @returns {any} el */
function $(s) { return document.querySelector(s); }
const form = $("#entryForm");
const nameEl = $("#fName");
const cityEl = $("#fCity");
const drinkEl = $("#fDrink");
const grid = $("#stampGrid");
const errorBanner = $("#errorBanner");
/** Append a text-only child. @param {any} p @param {string} t @param {string} c @param {string} x @returns {any} */
function tx(p, t, c, x) {
  const el = document.createElement(t);
  el.className = c;
  el.textContent = x;
  p.append(el);
  return el;
}
/** Build one stamp card. @param {Entry} e entry @returns {any} card */
function makeCard(e) {
  const card = document.createElement("article");
  card.className = "stamp";
  tx(card, "h3", "stamp-name", e.name);
  tx(card, "p", "stamp-city", e.city);
  tx(card, "p", "stamp-drink", e.drink);
  const r = Number(e.rating) || 0;
  const stars = tx(card, "p", "stamp-stars", "★".repeat(r) + "☆".repeat(5 - r));
  stars.setAttribute("aria-label", "Rated " + r + " out of 5");
  if (e.note && e.note.trim()) tx(card, "p", "stamp-note", e.note);
  tx(card, "time", "stamp-date", new Date(e.visitedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
  const del = tx(card, "button", "stamp-del", "Remove");
  del.type = "button";
  del.dataset.id = e.id;
  return card;
}
/** Paint the stat strip. @returns {void} */
function renderStats() {
  const bar = $("#statStrip");
  if (!bar) return;
  const s = stats(state.entries) || {};
  const count = s.count ?? state.entries.length;
  const avg = s.avg ?? 0;
  const head = count === 1 ? "1 café in your passport" : count + " cafés in your passport";
  bar.textContent = avg > 0 ? head + " · Average rating " + avg : head + " · No ratings yet";
}
/** Paint cards or the empty guide. @param {Entry[]} list entries @returns {void} */
function renderGrid(list) {
  const empty = $("#emptyState");
  grid.replaceChildren();
  const none = list.length === 0;
  grid.hidden = none;
  empty.hidden = !none;
  if (none) {
    const fresh = state.entries.length === 0;
    $("#emptyTitle").textContent = fresh ? "Your passport is empty" : "No stamps match this view";
    $("#emptyDesc").textContent = fresh ? "Log your first café visit above." : "Show all entries or change the sort.";
    return;
  }
  for (const item of list) grid.append(makeCard(item));
}
/** Paint stats and grid. @returns {void} */
export function render() {
  renderStats();
  renderGrid(filterSort(state.entries, state.filter) || []);
}
/** Persist the list, keep memory copy on failure. @returns {void} */
function persist() {
  try { saveEntries(localStorage, state.entries); } catch { /* storage blocked */ }
}
/** Save a new entry. @param {any} e event @returns {void} */
function onSubmit(e) {
  e.preventDefault();
  errorBanner.hidden = true;
  const pick = $('input[name="rating"]:checked');
  const rating = pick ? Number(pick.value) : 4;
  const result = createEntry({ name: nameEl.value, city: cityEl.value, drink: drinkEl.value, rating: rating >= 1 && rating <= 5 ? rating : 4, note: $("#fNote").value });
  if (!result.ok) {
    const problem = result.problem || "Could not save this entry.";
    $("#errorMsg").textContent = problem;
    errorBanner.hidden = false;
    const t = problem.toLowerCase();
    (t.includes("city") ? cityEl : t.includes("drink") ? drinkEl : t.includes("star") ? $("#fRating input") : nameEl).focus();
    return;
  }
  state.entries.push(result.value);
  persist();
  form.reset();
  render();
}
/** Delete via grid delegation. @param {any} e event @returns {void} */
function onGridClick(e) {
  const btn = e.target.closest ? e.target.closest(".stamp-del") : null;
  if (!btn || !btn.dataset.id) return;
  state.entries = deleteEntry(state.entries, btn.dataset.id);
  persist();
  render();
}
/** Fill drink from a chip. @param {any} e event @returns {void} */
function onChips(e) {
  const btn = e.target.closest ? e.target.closest("[data-drink]") : null;
  if (!btn) return;
  drinkEl.value = btn.dataset.drink;
  drinkEl.focus();
}
/** Re-render on view change. @returns {void} */
function onView() {
  state.filter = { mode: $("#filterMode").value, sort: $("#sortMode").value };
  render();
}
/** Wire events and paint first frame. @returns {void} */
function init() {
  try { state.entries = loadEntries(localStorage) || []; } catch { state.entries = []; }
  form.addEventListener("submit", onSubmit);
  grid.addEventListener("click", onGridClick);
  $("#drinkChips").addEventListener("click", onChips);
  $("#filterMode").addEventListener("change", onView);
  $("#sortMode").addEventListener("change", onView);
  render();
}
init();
