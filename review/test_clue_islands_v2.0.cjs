// v1.0 | 2026-11-23 | Codex | Isolated checks for the six-island practice module.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/clue_islands_v2.0.html', 'utf8');
const configs = JSON.parse(source.match(/<script id="clueConfig" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
function setup({blocked=false, initial={}, badExport=false}={}) {
  const elements={}, store={...initial}, writes=[];
  const el = id => elements[id] || (elements[id] = {
    id,value:'',checked:false,disabled:false,textContent:'',innerHTML:'',height:1600,width:1200,
    style:{setProperty(){}},classList:{values:new Set(),add(v){this.values.add(v);},remove(v){this.values.delete(v);},contains(v){return this.values.has(v);},toggle(v,on){if(on)this.add(v);else this.remove(v);}},
    setAttribute(k,v){this[k]=v;},addEventListener(k,f){this[k]=f;},
    focus(){document.activeElement=this;},scrollIntoView(){this.scrolled=true;},
    querySelector(selector){return selector==='button'?el('clueDownload'):null;},querySelectorAll(){return [];},
    getContext(){return new Proxy({measureText:t=>({width:Array.from(t).length*26})},{get:(o,k)=>o[k]||(()=>{})});},
    toDataURL(){if(badExport)throw Error('blocked');return 'data:image/png;base64,test';}
  });
  const document = {getElementById:el,querySelectorAll(){return [];},activeElement:null,documentElement:{contains(){return true;}},body:{appendChild(){}},createElement(){return {click(){},remove(){}};}};
  el('clueConfig').textContent=JSON.stringify(configs);
  const context={document,localStorage:{getItem(k){if(blocked)throw Error('blocked');return store[k]||null;},setItem(k,v){if(blocked)throw Error('blocked');writes.push(k);store[k]=v;}},openPanel(){},closePanel(){},Date,Array,Math,isFinite};
  vm.runInNewContext(script,context);
  return {el,store,writes,open:context.openPanel,document};
}
function fill(h,{verdict='unknown',long=false}={}) {
  const values={observation:long?'測'.repeat(240):'資料 A 與 B 的條件不同。',verdict,reason:long?'測'.repeat(240):'還需要補充證據。',evidence:long?'測'.repeat(240):'本頁兩張測試資料卡。'};
  for(const [k,value] of Object.entries(values)){h.el('clue-'+k).value=value;h.el('clue-'+k).change();}
  for(const k of ['explored','kept']){h.el('clue-'+k).checked=true;h.el('clue-'+k).onchange();}
}
assert.equal(configs.length,6);assert.equal(new Set(configs.map(c=>c.id)).size,6);assert.equal(new Set(configs.map(c=>c.icon)).size,6);for(const c of configs){assert.match(c.svg,/<svg/);assert.ok(c.features.length>=3);assert.ok(c.sources.some(s=>s.url&&s.publisher));assert.ok(!c.claim.includes('測試展板'));assert.equal(c.sourceChecked,'2026-11-23');}
const h=setup({initial:{'yuliIslandProgress.v1':'DO NOT TOUCH'}});
for(let i=0;i<configs.length;i++) {
  const c=configs[i];h.open(c.id);
  // Clear fake current fields so a prior mock mount cannot carry values.
  for(const k of ['observation','verdict','reason','evidence'])h.el('clue-'+k).value='';
  for(const k of ['explored','kept'])h.el('clue-'+k).checked=false;
  assert.match(h.el('pBody').innerHTML,/先看材料/);
  h.el('clueGenerate').onclick();assert.equal(h.document.activeElement.id,'clue-observation');
  fill(h,{verdict:i===0?'support':i===1?'conflict':'unknown',long:i===5});
  h.el('clue-kept').checked=false;h.el('clue-kept').onchange();assert.match(h.el('clueRequired').textContent,/勾選觀察與來源確認/);
  h.el('clueGenerate').onclick();assert.equal(h.document.activeElement.id,'clue-kept');assert.equal(h.el('clueEntry').textContent,'外圍探索護照 · '+i+' / 6');
  h.el('clue-kept').checked=true;h.el('clue-kept').onchange();h.el('clueGenerate').onclick();
  assert.equal(h.el('clueEntry').textContent,'外圍探索護照 · '+(i+1)+' / 6');
  assert.match(h.el('clueModalBody').innerHTML,/不是館方|不代表結論已被查核認證/);
  h.el('clueDownload').onclick();assert.match(h.el('clueExport').textContent,/已送出/);
  if(i===5) assert.ok(h.el('clueCanvas').height>1600);
}
assert.equal(h.store['yuliIslandProgress.v1'],'DO NOT TOUCH');assert.ok(h.writes.every(k=>k.startsWith('oneMore.clue.')));
const restored=setup({initial:h.store});assert.equal(restored.el('clueEntry').textContent,'外圍探索護照 · 6 / 6');
restored.open(configs[0].id);assert.equal(restored.el('clueModal').classList.contains('is-open'),true);assert.match(restored.el('clueModalBody').innerHTML,/臺灣黑熊教育館/);restored.el('clueEdit').onclick();assert.equal(restored.el('clueModal').classList.contains('is-open'),false);assert.equal(restored.el('clue-observation').value,'資料 A 與 B 的條件不同。');
restored.el('clue-reason').value='已修正';restored.el('clue-reason').input();assert.equal(restored.el('clueEntry').textContent,'外圍探索護照 · 5 / 6');
const blocked=setup({blocked:true,badExport:true});blocked.open(configs[0].id);fill(blocked);blocked.el('clueGenerate').onclick();assert.match(blocked.el('clueStoreNote').textContent,/無法儲存/);blocked.el('clueDownload').onclick();assert.match(blocked.el('clueExport').textContent,/無法匯出/);
const malformed=setup({initial:{'oneMore.clue.blackBear.test.v1':'{broken','oneMore.clue.chike-mountain.test.v1':'{"v":1,"observation":123,"at":"bad"}'}});assert.equal(malformed.el('clueEntry').textContent,'外圍探索護照 · 0 / 6');
const xss=setup();xss.open(configs[0].id);fill(xss);xss.el('clue-reason').value='<img src=x onerror=alert(1)>';xss.el('clue-reason').input();xss.el('clueGenerate').onclick();assert.ok(!xss.el('clueModalBody').innerHTML.includes('<img src=x'));assert.ok(xss.el('clueModalBody').innerHTML.includes('&lt;img'));
console.log('PASS: all 6 workflows, unique stamps, all verdicts, missing checkbox guidance, PNG request/fallback, storage isolation/reload/corruption, long text, HTML escaping.');

const oldOnly=setup({initial:{'oneMore.clue.blackBear.test.v1':JSON.stringify({v:1,observation:'舊三片葉子',verdict:'support',reason:'舊測試',evidence:'舊展板',explored:true,kept:true,at:1})}});assert.equal(oldOnly.el('clueEntry').textContent,'外圍探索護照 · 0 / 6');assert.ok(oldOnly.store['oneMore.clue.blackBear.test.v1']);console.log('PASS: each island has an observable SVG, sourced local content, and fresh lesson progress without deleting old test records.');
