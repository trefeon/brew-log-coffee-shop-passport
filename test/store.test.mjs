import test from"node:test";
import assert from"node:assert/strict";
import{createEntry as c,deleteEntry as d,loadEntries as l,saveEntries as s,filterSort as f,stats as t,searchEntries as q,isQuotaError as qe,sanitizeEntries as se,loadDraft as ld,saveDraft as sd,clearDraft as cd,mergeImport as mi,loadPrefs as lp,savePrefs as sp}from"../store.js";
const e=o=>c({name:"N",city:"C",drink:"D",rating:5,...o}).value;
const eq=assert.deepEqual;
test("store",()=>{
for(const o of[{name:" "},{city:""},{drink:" "}])assert(!c({name:"N",city:"C",drink:"D",rating:3,...o}).ok);
for(const r of[0,6,"abc"])assert(!c({name:"N",city:"C",drink:"D",rating:r}).ok);
const h=c({name:"Kaffa",city:"Oslo",drink:"Latte",rating:4});
assert(h.ok&&h.value.id&&h.value.visitedAt);
const a=e(),b=e();
eq(d([a,b],a.id),[b]);
const g=[e({city:"Oslo"}),e({city:"Bergen",rating:3}),e({city:"Arendal",rating:4})];
assert.equal(f(g,{mode:"top"}).length,2);
eq(f(g,{mode:"all",sort:"city"}).map(x=>x.city),["Arendal","Bergen","Oslo"]);
eq(t(g),{count:3,avg:4});
eq(t([]),{count:0,avg:null});
const m={},k={getItem:x=>m[x],setItem:(x,v)=>m[x]=v};
s(k,g);eq(l(k),g);
});
test("search",()=>{
const g=[e({name:"Maple and Main",city:"Riverside"}),e({city:"Old Town",drink:"Pour Over"}),e({city:"Garden District",drink:"Flat White"})];
assert.equal(q(g,"").length,3);
assert.equal(q(g,"   ").length,3);
assert.equal(q(g,"maple").length,1);
assert.equal(q(g,"OLD")[0].city,"Old Town");
assert.equal(q(g,"pour over").length,1);
assert.equal(q(g,"mocha").length,0);
});
test("quota",()=>{
assert(qe({name:"QuotaExceededError"}));
assert(qe({code:22}));
assert(qe(new Error("Quota exceeded")));
assert(!qe(new Error("nope")));
assert(!qe(null));
assert(!qe({}));
});
test("sanitize",()=>{
const good=e({id:"a"});
assert.equal(se([good]).length,1);
assert.equal(se("nope").length,0);
const bad=[{...good,id:""},{...good,name:" "},{...good,city:""},{...good,drink:""},{...good,rating:0},{...good,rating:6},{...good,rating:2.5},null,42,"x"];
assert.equal(se([good,...bad]).length,1);
const m={},k={getItem:x=>m[x],setItem:(x,v)=>m[x]=v};
m["brewlog.passport.v1"]=JSON.stringify([good,{name:"junk"},null]);
assert.equal(l(k).length,1);
});
test("draft",()=>{
const m={},k={getItem:x=>(x in m?m[x]:null),setItem:(x,v)=>{m[x]=v},removeItem:x=>{delete m[x]}};
assert.equal(ld(k),null);
sd(k,{name:"N",city:"C",drink:"D",rating:5,note:"hi"});
assert.deepEqual(ld(k),{name:"N",city:"C",drink:"D",rating:5,note:"hi"});
sd(k,{name:"N",city:"C",drink:"D",rating:9,note:""});
assert.equal(ld(k).rating,4);
cd(k);
assert.equal(ld(k),null);
});
test("import+prefs",()=>{
const a=e({}),b=e({});
const r=mi([a],[b,a,{...b,id:""},{name:"junk"}]);
assert.equal(r.imported,1);assert.equal(r.skipped,1);
eq(r.merged.map(x=>x.id),[a.id,b.id]);
const m={},k={getItem:x=>(x in m?m[x]:null),setItem:(x,v)=>{m[x]=v}};
eq(lp(k),{mode:"all",sort:"newest",q:""});
sp(k,{mode:"top",sort:"city",q:"Maple"});
eq(lp(k),{mode:"top",sort:"city",q:"Maple"});
sp(k,{mode:"zzz",sort:"zzz",q:7});
eq(lp(k),{mode:"all",sort:"newest",q:"7"});
});
