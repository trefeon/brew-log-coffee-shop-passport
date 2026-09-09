// @ts-check
/**
 * @typedef {Object} Entry
 * @property {string} id
 * @property {string} name
 * @property {string} city
 * @property {string} drink
 * @property {number} rating
 * @property {string} note
 * @property {string} visitedAt
 * @typedef {Object} Filter
 * @property {"all"|"top"} mode
 * @property {"newest"|"city"|"rating"} sort
 */
export const STORAGE_KEY="brewlog.passport.v1";
/** @param {{[k:string]:unknown}} d @returns {{ok:true,value:Entry}|{ok:false,problem:string}} */
export function createEntry(d={}){
const name=String(d.name||"").trim(),city=String(d.city||"").trim(),drink=String(d.drink||"").trim();
if(!name||!city||!drink)return{ok:false,problem:!name?"Enter a cafe name.":!city?"Enter the city.":"Enter your drink."};
const rating=Number(d.rating);
if(!Number.isInteger(rating)||rating<1||rating>5)return{ok:false,problem:"Rate it 1 to 5."};
const id=globalThis.crypto?.randomUUID?.()??Date.now()+""+Math.random();
return{ok:true,value:{id,name,city,drink,rating,note:String(d.note||""),visitedAt:new Date().toISOString()}}
}
/** @param {Entry[]} a @param {string} id @returns {Entry[]} */
export function deleteEntry(a,id){return a.filter(e=>e.id!==id)}
/** @param {any} s @returns {Entry[]} */
export function loadEntries(s=globalThis.localStorage){try{const v=JSON.parse(s.getItem(STORAGE_KEY));return Array.isArray(v)?v:[]}catch{return[]}}
/** @param {any} s @param {Entry[]} a @returns {void} */
export function saveEntries(s=globalThis.localStorage,a){s.setItem(STORAGE_KEY,JSON.stringify(a))}
/** @param {Entry[]} ls @param {Partial<Filter>} o @returns {Entry[]} */
export function filterSort(ls,o={}){
const r=ls.filter(e=>o.mode!=="top"||e.rating>=4);
// stable sort keeps newest-first ties
r.sort((a,b)=>b.visitedAt.localeCompare(a.visitedAt));
if(o.sort==="city")r.sort((a,b)=>a.city.localeCompare(b.city,[],{sensitivity:"base"}));
else if(o.sort==="rating")r.sort((a,b)=>b.rating-a.rating);
return r
}
/** @param {Entry[]} a @returns {{count:number,avg:number|null}} */
export function stats(a){
const n=a.length;
if(!n)return{count:0,avg:null};
const s=a.reduce((t,e)=>t+e.rating,0);
return{count:n,avg:Math.round(s/n*10)/10}
}
/** @param {Entry[]} a @param {string} q @returns {Entry[]} */
export function searchEntries(a,q){
const n=String(q||"").trim().toLowerCase();
if(!n)return a;
return a.filter(e=>(e.name+" "+e.city+" "+e.drink).toLowerCase().includes(n))
}
