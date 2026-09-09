import test from"node:test";
import assert from"node:assert/strict";
import{createEntry as c,deleteEntry as d,loadEntries as l,saveEntries as s,filterSort as f,stats as t,searchEntries as q}from"../store.js";
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
