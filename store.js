/** @typedef {{id:string,name:string,city:string,drink:string,rating:number,note:string,visitedAt:string}} Entry */
export const STORAGE_KEY="brewlog.passport.v1";
export const DRAFT_KEY=STORAGE_KEY+".draft";
export const PREFS_KEY=STORAGE_KEY+".prefs";
export function isQuotaError(e){
  return !!e&&(e.name==="QuotaExceededError"||e.code===22||(typeof e.message==="string"&&/quota/i.test(e.message||"")));
}
function validEntry(v){
  if(!v||typeof v!=="object")return false;
  for(const k of["id","name","city","drink"])if(!String(v[k]||"").trim())return false;
  const r=Number(v.rating);
  return Number.isInteger(r)&&r>=1&&r<=5;
}
export function sanitizeEntries(list){
  return Array.isArray(list)?list.filter(validEntry):[];
}
export function createEntry(d={}){
  const name=String(d.name||"").trim(),city=String(d.city||"").trim(),drink=String(d.drink||"").trim();
  if(!name||!city||!drink)return{ok:false,problem:!name?"Enter a cafe name.":!city?"Enter the city.":"Enter your drink."};
  const rating=Number(d.rating);
  if(!Number.isInteger(rating)||rating<1||rating>5)return{ok:false,problem:"Rate it 1 to 5."};
  const id=globalThis.crypto?.randomUUID?.()??Date.now()+""+Math.random();
  return{ok:true,value:{id,name,city,drink,rating,note:String(d.note||""),visitedAt:new Date().toISOString()}};
}
export function deleteEntry(a,id){return a.filter(e=>e.id!==id);}
export function loadEntries(s=globalThis.localStorage){
  try{return sanitizeEntries(JSON.parse(s.getItem(STORAGE_KEY)));}catch{return[];}
}
export function saveEntries(s=globalThis.localStorage,a){
  s.setItem(STORAGE_KEY,JSON.stringify(a));
}
export function loadDraft(s=globalThis.localStorage){
  try{
    const v=JSON.parse(s.getItem(DRAFT_KEY));
    if(!v||typeof v!=="object")return null;
    const r=Number(v.rating);
    return{name:String(v.name||""),city:String(v.city||""),drink:String(v.drink||""),rating:Number.isInteger(r)&&r>=1&&r<=5?r:4,note:String(v.note||"")};
  }catch{return null;}
}
export function saveDraft(s=globalThis.localStorage,d){
  s.setItem(DRAFT_KEY,JSON.stringify(d));
}
export function clearDraft(s=globalThis.localStorage){
  try{s.removeItem(DRAFT_KEY);}catch{}
}
export function filterSort(ls,o={}){
  const r=ls.filter(e=>o.mode!=="top"||e.rating>=4);
  r.sort((a,b)=>b.visitedAt.localeCompare(a.visitedAt));
  if(o.sort==="city")r.sort((a,b)=>a.city.localeCompare(b.city));
  else if(o.sort==="rating")r.sort((a,b)=>b.rating-a.rating);
  return r;
}
export function stats(a){
  const n=a.length;
  if(!n)return{count:0,avg:null};
  return{count:n,avg:Math.round(a.reduce((t,e)=>t+e.rating,0)/n*10)/10};
}
export function searchEntries(a,q){
  const n=String(q||"").trim().toLowerCase();
  if(!n)return a;
  return a.filter(e=>(e.name+" "+e.city+" "+e.drink).toLowerCase().includes(n));
}
export function mergeImport(cur,list){
  const seen=new Set(cur.map(e=>e.id));
  const merged=[...cur];
  let imported=0,skipped=0;
  for(const e of sanitizeEntries(list)){
    if(seen.has(e.id)){skipped++;continue;}
    seen.add(e.id);
    merged.push(e);
    imported++;
  }
  return{merged,imported,skipped};
}
export function loadPrefs(s=globalThis.localStorage){
  try{
    const v=JSON.parse(s.getItem(PREFS_KEY))||{};
    return{mode:v.mode==="top"?"top":"all",sort:v.sort==="city"||v.sort==="rating"?v.sort:"newest",q:String(v.q||"")};
  }catch{return{mode:"all",sort:"newest",q:""};}
}
export function savePrefs(s=globalThis.localStorage,p){
  try{s.setItem(PREFS_KEY,JSON.stringify({mode:p.mode,sort:p.sort,q:String(p.q||"")}));}catch{}
}
