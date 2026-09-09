// @ts-check
import { STORAGE_KEY, createEntry, deleteEntry, loadEntries, saveEntries, filterSort, stats } from "./store.js";
/** @typedef {{id:string,name:string,city:string,drink:string,rating:number,note:string,visitedAt:string}} Entry */
/** @type {{entries:Entry[],filter:{mode:string,sort:string}}} */
const state = { entries: [], filter: { mode: "all", sort: "newest" } };
/** @param {string} s @returns {any} */
function $(s) { return document.querySelector(s); }
const form = $("#entryForm");
const grid = $("#stampGrid");
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
  const head = count === 1 ? "1 café in your passport" : count + " cafés in your passport";
  $("#statStrip").textContent = avg ? head + " · Average rating " + avg : head + " · No ratings yet";
  const list = filterSort(state.entries, state.filter);
  grid.replaceChildren();
  const none = !list.length;
  grid.hidden = none;
  $("#emptyState").hidden = !none;
  if (none) {
    const fresh = !count;
    $("#emptyTitle").textContent = fresh ? "Your passport is empty" : "No matching stamps";
    $("#emptyDesc").textContent = fresh ? "Log your first café visit above." : "Show all entries instead.";
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
  state.entries = deleteEntry(state.entries, btn.dataset.id);
  persist();
  render();
}
/** @param {any} e @returns {void} */
function onChips(e) {
  const btn = e.target.closest?.("[data-drink]");
  if (!btn) return;
  $("#fDrink").value = btn.dataset.drink;
  $("#fDrink").focus();
}
/** @returns {void} */
function onView() {
  state.filter = { mode: $("#filterMode").value, sort: $("#sortMode").value };
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
  render();
}
init();
