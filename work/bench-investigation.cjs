// Times the case-study flow end to end with the app's own functions and writes docs/BENCHMARK.md.
//   node work/bench-investigation.cjs
const fs=require('node:fs'),path=require('node:path');
const C=require('./v2-core.js'),S=require('./v2-schema.js'),stats=require('./statistics-core.js'),sample=require('./sample240.json');
const REPEAT=20,median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const ms=f=>{const t=process.hrtime.bigint();const v=f();return [Number(process.hrtime.bigint()-t)/1e6,v];};

function run(){
 const steps=[];const step=(name,f)=>{const [t,v]=ms(f);steps.push({name,ms:t});return v;};
 const t=step('CSV 6종 읽기·검증 (Batch·Material·Process·Equipment·QC·Checksheet)',()=>Object.fromEntries(Object.entries(sample).map(([k,csv])=>[k,C.readTable(k,csv,S)])));
 const ph=new Map(t.QC.rows.filter(r=>r.Analyte_ID==='pH').map(r=>[r.Batch_ID,r]));
 const rep=step('이탈 Batch 보고서 (SIM-S0197: 원료·공정·설비·QC·점검 이력 연결)',()=>C.investigate(t,'SIM-S0197'));
 const groups=step('원료 3종 LOT별 비교 (이탈 집중도 + 분산성분)',()=>['ADDITIVE','SILICA','DIW'].map(m=>{
  let g=t.Material.rows.filter(r=>r.Material_ID===m).map(r=>{const q=ph.get(r.Batch_ID);return{group:r.Lot_ID,y:Number(q.Value),out:Number(q.Value)>Number(q.USL)||Number(q.Value)<Number(q.LSL)};});
  const outByLot=new Map();for(const r of g)if(r.out)outByLot.set(r.group,(outByLot.get(r.group)||0)+1);
  const top=[...outByLot].sort((a,b)=>b[1]-a[1])[0],nOut=g.filter(r=>r.out).length;
  const size=g.reduce((s,r)=>s.set(r.group,(s.get(r.group)||0)+1),new Map());g=g.filter(r=>size.get(r.group)>=2);
  return {material:m,nOut,topLot:top[0],share:top[1]/nOut,lotBatches:size.get(top[0]),lotOut:top[1],contribution:stats.contribution(g).percent};
 }));
 const scope=step('영향 범위 (ADDITIVE-LOT-23 투입 Batch 전수와 출하 상태)',()=>{
  const ids=new Set(t.Material.rows.filter(r=>r.Material_ID==='ADDITIVE'&&r.Lot_ID==='ADDITIVE-LOT-23').map(r=>r.Batch_ID));
  return t.Batch.rows.filter(b=>ids.has(b.Batch_ID)).map(b=>({id:b.Batch_ID,disp:b.Disposition,ship:b.Ship_Status,pH:Number(ph.get(b.Batch_ID).Value)}));
 });
 const reg=step('공정 변수 회귀 (LPC ~ 필터 차압 최대값, 240 Batch)',()=>{
  const dp=new Map();for(const p of t.Process.rows.filter(p=>p.Parameter==='Filter_DP'))dp.set(p.Batch_ID,Math.max(dp.get(p.Batch_ID)??-Infinity,Number(p.Value)));
  const lpc=new Map(t.QC.rows.filter(r=>r.Analyte_ID==='LPC_1p0').map(r=>[r.Batch_ID,Number(r.Value)]));
  return stats.regression([...dp].filter(([b])=>lpc.has(b)).map(([b,x])=>({x,y:lpc.get(b)})));
 });
 const records=Object.values(t).reduce((s,x)=>s+x.rows.length,0);
 return {steps,total:steps.reduce((s,x)=>s+x.ms,0),records,report:rep,groups,scope,reg};
}

const runs=Array.from({length:REPEAT},run),last=runs[runs.length-1];
const med=last.steps.map((s,i)=>({name:s.name,ms:median(runs.map(r=>r.steps[i].ms))})),total=median(runs.map(r=>r.total));
const add=last.groups.find(g=>g.material==='ADDITIVE'),shipped=last.scope.filter(s=>/SHIP/i.test(s.ship)&&s.disp!=='HOLD');
const L=['# 업무 시나리오 측정: 이탈 Batch 1건 → 원인 LOT → 영향 범위','',
'README 케이스 스터디(사건 A·C)의 흐름을 앱 함수로 그대로 실행하고 시간을 쟀습니다. `node work/bench-investigation.cjs`로 다시 잴 수 있습니다.','',
'| 단계 | 결과 | 시간 (중앙값) |','|---|---|---|'];
const res=[`${last.records.toLocaleString()}행`,`발견 사항 ${last.report.findings.length}건`,
 last.groups.map(g=>`${g.material}: pH 이탈 ${g.nOut}건 중 ${g.lotOut}건이 ${g.topLot} (이 LOT ${g.lotBatches} Batch), LOT 간 분산 기여 ${g.contribution.toFixed(0)}%`).join('<br>'),
 `${last.scope.length} Batch 중 규격 통과·출하 ${shipped.length}건`, `기울기 ${last.reg.slope.toFixed(2)}, R² ${last.reg.r2.toFixed(2)}`];
med.forEach((s,i)=>L.push(`| ${s.name} | ${res[i]} | ${s.ms.toFixed(1)} ms |`));
L.push(`| **합계** | | **${total.toFixed(0)} ms** |`,'',
`- ${REPEAT}회 반복의 중앙값, Node ${process.version}, CPU만 사용, 합성 데이터 240 Batch`,
'- 비교 기준: 같은 작업을 MES·LIMS·설비 이력에서 수작업으로 조회하고 엑셀로 합치면 작성자 경험상 반나절 가까이 걸립니다 (계측값 아님).',
'- 측정 대상은 자료 연결과 계산입니다. 어떤 LOT을 원인으로 볼지, 출하분을 어떻게 처리할지는 사람이 판단합니다.',
'- ADDITIVE와 함께 SILICA도 분산 기여가 크게 나옵니다. 같은 기간에 쓰인 LOT이 겹치는 교란 때문이고, README 사건 A의 3단계(정상 Batch와 공유하는 LOT 배제)가 이 구분을 보여 줍니다.','');
fs.writeFileSync(path.join(__dirname,'..','docs','BENCHMARK.md'),L.join('\n'));
console.log(L.join('\n'));
