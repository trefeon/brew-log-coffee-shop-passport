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
 */
/**
 * @typedef {Object} Filter
 * @property {"all"|"top"} mode
 * @property {"newest"|"city"|"rating"} sort
 */
export const STORAGE_KEY="brewlog.passport.v1";
/** @param {{[k:string]:unknown}} d @returns {{ok:true,value:Entry}|{ok:false,problem:string}} */
export function createEntry(d={}){
const name=String(d.name??"").trim(),city=String(d.city??"").trim(),drink=String(d.drink??"").trim();
if(!name||!city||!drink)return{ok:false,problem:!name?"Enter a cafe name.":!city?"Enter the city.":"Enter your drink."};
const rating=Number(d.rating);
if(!Number.isInteger(rating)||rating<1||rating>5)return{ok:false,problem:"Pick 1 to 5 stars."};
const id=globalThis.crypto?.randomUUID?.()??Date.now()+""+Math.random();
return{ok:true,value:{id,name,city,drink,rating,note:String(d.note??""),visitedAt:new Date().toISOString()}};
}
/** @param {Entry[]} list @param {string} id @returns {Entry[]} */
export function deleteEntry(list,id){return list.filter((e)=>e.id!==id)}
/** @param {any} [s] @returns {Entry[]} */
export function loadEntries(s=globalThis.localStorage){try{const v=JSON.parse(s.getItem(STORAGE_KEY));return Array.isArray(v)?v:[]}catch{return[]}}
/** @param {any} [s] @param {Entry[]} list @returns {void} */
export function saveEntries(s=globalThis.localStorage,list=[]){s.setItem(STORAGE_KEY,JSON.stringify(list))}
/** @param {Entry[]} list @param {Filter} [o] @returns {Entry[]} */
export function filterSort(list,o={}){
const out=o.mode==="top"?list.filter((e)=>e.rating>3):list.slice();
if(o.sort==="city")out.sort((a,b)=>a.city.localeCompare(b.city,[],{sensitivity:"base"})||b.visitedAt.localeCompare(a.visitedAt));
else if(o.sort==="rating")out.sort((a,b)=>b.rating-a.rating||b.visitedAt.localeCompare(a.visitedAt));
else out.sort((a,b)=>b.visitedAt.localeCompare(a.visitedAt));
return out;
}
/** @param {Entry[]} list @returns {{count:number,avg:number|null}} */
export function stats(list){
const n=list.length;
if(!n)return{count:0,avg:null};
const s=list.reduce((t,e)=>t+e.rating,0);
return{count:n,avg:Math.round(s/n*10)/10};
}
