import test from"node:test";
import assert from"node:assert";
import{createEntry as c,deleteEntry as d,loadEntries as l,saveEntries as s,filterSort as f,stats as t,searchEntries as q,isQuotaError as qe,sanitizeEntries as se,loadDraft as ld,saveDraft as sd,clearDraft as cd,mergeImport as mi,loadPrefs as lp,savePrefs as sp}from"../store.js";
const e=o=>c({name:"N",city:"C",drink:"D",rating:5,...o}).value;
const eq=assert.deepEqual;
const mem=()=>{const m={};return{getItem:x=>(x in m?m[x]:null),setItem:(x,v)=>{m[x]=v},removeItem:x=>{delete m[x]}}};
test("validate+delete",()=>{
assert(!c({name:" ",city:"C",drink:"D",rating:3}).ok);
assert(!c({name:"N",city:"C",drink:"D",rating:6}).ok);
assert(c({name:"K",city:"O",drink:"L",rating:4}).value.id);
const a=e(),b=e();
eq(d([a,b],a.id),[b]);
});
test("filter+sort+stats",()=>{
const g=[e({city:"Oslo"}),e({city:"Bergen",rating:3}),e({city:"Arendal",rating:4})];
assert.equal(f(g,{mode:"top"}).length,2);
eq(f(g,{mode:"all",sort:"city"}).map(x=>x.city),["Arendal","Bergen","Oslo"]);
eq(t(g),{count:3,avg:4});
eq(t([]),{count:0,avg:null});
});
test("search+quota",()=>{
const g=[e({name:"Maple and Main"}),e({city:"Old Town",drink:"Pour Over"})];
assert.equal(q(g,"maple").length,1);
assert.equal(q(g,"OLD")[0].city,"Old Town");
assert.equal(q(g,"mocha").length,0);
assert(qe({name:"QuotaExceededError"})&&qe({code:22})&&!qe(null));
});
test("store+sanitize",()=>{
const good=e({id:"a"}),k=mem();
s(k,[good]);eq(l(k),[good]);
assert.equal(se([good,{...good,id:""},null,"x"]).length,1);
assert.equal(se("nope").length,0);
});
test("draft",()=>{
const k=mem();
assert.equal(ld(k),null);
sd(k,{name:"N",city:"C",drink:"D",rating:5,note:"hi"});
eq(ld(k),{name:"N",city:"C",drink:"D",rating:5,note:"hi"});
cd(k);assert.equal(ld(k),null);
});
test("import+prefs",()=>{
const a=e({}),b=e({});
const r=mi([a],[b,a,{...b,id:""},{name:"junk"}]);
assert.equal(r.imported,1);assert.equal(r.skipped,1);
const k=mem();
eq(lp(k),{mode:"all",sort:"newest",q:""});
sp(k,{mode:"top",sort:"city",q:"Maple"});
eq(lp(k),{mode:"top",sort:"city",q:"Maple"});
sp(k,{mode:"zzz",sort:"zzz",q:7});
eq(lp(k),{mode:"all",sort:"newest",q:"7"});
});
