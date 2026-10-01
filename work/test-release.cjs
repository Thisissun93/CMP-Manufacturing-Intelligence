const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('./v2-core.js'),S=require('./v2-schema.js'),stats=require('./statistics-core.js'),sample=require('./sample240.json');
const t=Object.fromEntries(Object.entries(sample).map(([k,csv])=>[k,C.readTable(k,csv,S)]));
assert.equal(t.Batch.rows.length,240);
for(const id of new Set(t.Batch.rows.map(r=>r.Equipment_ID))){const rows=t.Batch.rows.filter(r=>r.Equipment_ID===id).sort((a,b)=>Date.parse(a.Start_TS)-Date.parse(b.Start_TS));for(let i=1;i<rows.length;i++)assert(Date.parse(rows[i].Start_TS)>=Date.parse(rows[i-1].End_TS));}
for(const r of t.Checksheet.rows){const hour=new Date(Date.parse(r.Valid_From_TS)+9*3600000).getUTCHours();assert([7,19].includes(hour));assert.equal(Date.parse(r.Valid_To_TS)-Date.parse(r.Valid_From_TS),43200000);}
const lotOf=(bid,mat)=>t.Material.rows.find(r=>r.Batch_ID===bid&&r.Material_ID===mat).Lot_ID;
const lotSize={SILICA:6,ADDITIVE:9,DIW:15},boundaries={};
for(const mat of Object.keys(lotSize)){const counts={};for(const r of t.Material.rows.filter(r=>r.Material_ID===mat))counts[r.Lot_ID]=(counts[r.Lot_ID]||0)+1;assert(Object.values(counts).every(n=>n<=lotSize[mat]&&n>=1));boundaries[mat]=new Set(t.Batch.rows.map((b,i)=>i&&lotOf(b.Batch_ID,mat)!==lotOf(t.Batch.rows[i-1].Batch_ID,mat)?i:null).filter(Boolean));}
const shared=[...boundaries.SILICA].filter(i=>boundaries.ADDITIVE.has(i)&&boundaries.DIW.has(i));assert(shared.length<boundaries.SILICA.size/4,'원료 LOT 교체 시점이 서로 엇갈려야 함');
const qn=t.QC.rows.map(r=>({...r,v:Number(r.Value)})),oos=r=>(r.LSL!==''&&r.v<Number(r.LSL))||(r.USL!==''&&r.v>Number(r.USL));
const phOut=qn.filter(r=>r.Analyte_ID==='pH'&&oos(r));assert(phOut.length>=6&&phOut.every(r=>lotOf(r.Batch_ID,'ADDITIVE')==='ADDITIVE-LOT-23'));
for(const mat of ['SILICA','DIW']){for(const lot of new Set(phOut.map(r=>lotOf(r.Batch_ID,mat)))){const all=t.Batch.rows.filter(b=>lotOf(b.Batch_ID,mat)===lot);assert(all.some(b=>!phOut.some(r=>r.Batch_ID===b.Batch_ID)),mat+' LOT은 정상 Batch와 공유되어야 원인 후보에서 배제 가능');}}
const dpMax=bid=>Math.max(...t.Process.rows.filter(p=>p.Batch_ID===bid&&p.Parameter==='Filter_DP').map(p=>Number(p.Value)));
const lpcOut=qn.filter(r=>r.Analyte_ID==='LPC_1p0'&&oos(r));assert(lpcOut.length>=3&&lpcOut.every(r=>t.Batch.rows.find(b=>b.Batch_ID===r.Batch_ID).Equipment_ID==='MIX-2'&&dpMax(r.Batch_ID)>80));
assert(t.Equipment.rows.some(e=>e.Event_Type==='FILTER_CHANGE'&&e.Equipment_ID==='MIX-2'));
for(const b of t.Batch.rows){const out=qn.some(r=>r.Batch_ID===b.Batch_ID&&oos(r));assert.equal(b.Disposition,out?'HOLD':'RELEASED');}
const regenerated=require('./generate-sample240.cjs').generate();for(const k of Object.keys(sample))assert.equal(regenerated[k],sample[k],'sample240.json은 생성기 결과와 일치해야 함 ('+k+')');
const q=C.parseCSV(sample.QC),csv=rows=>[q.headers,...rows.map(r=>q.headers.map(h=>r[h]))].map(a=>a.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
for(const value of ['', 'None','N/A','미기록']){const out=C.readTable('QC',csv([{...q.rows[0],Value:value}]),S).rows[0];assert.equal(out.Value,'');assert.equal(out.Qualifier,'NOT_MEASURED');}
const rs=[10,12,11,14].map((y,time)=>({y,time,equipment:'A'})),cap=stats.capability(rs,{lsl:0,usl:20,within:'mr'});assert(Math.abs(cap.Cpk-8.25/(3*2/1.128))<1e-10);assert.equal(stats.regression([1,2,3,4].map(x=>({x,y:2*x+1}))).r2,1);
const dir=path.resolve(__dirname,'../outputs/CMP_Batch_Investigator_v2_Update/CMP_Batch_Investigator_v2'),html=fs.readFileSync(path.join(dir,'CMP_Batch_Investigator_v2.html'),'utf8'),dat=JSON.parse(fs.readFileSync(path.join(dir,'CMP_Batch_Investigator_Update.dat'),'utf8'));assert.equal(dat.html,html);assert.equal(dat.sha256,crypto.createHash('sha256').update(html).digest('hex'));assert.equal(dat.version,'1.0');console.log('PASS sequential equipment, 07/19 shifts, staggered material lots, pH↔ADDITIVE-LOT-23, LPC↔MIX-2 filter DP, deterministic sample, missing QC, calculations, DAT');
