// Compares work/statistics-core.js with independent values from work/reference/compute_reference.py
// (pandas, numpy, scipy, statsmodels) on the same 240-batch demo data.
const assert=require('node:assert/strict');
const C=require('./v2-core.js'),S=require('./v2-schema.js'),stats=require('./statistics-core.js');
const sample=require('./sample240.json'),ref=require('./reference/expected.json');
const t=Object.fromEntries(Object.entries(sample).map(([k,csv])=>[k,C.readTable(k,csv,S)]));
const order=[...t.Batch.rows].sort((a,b)=>Date.parse(a.Start_TS)-Date.parse(b.Start_TS));
const eq=new Map(order.map(b=>[b.Batch_ID,b.Equipment_ID]));
const qc=a=>new Map(t.QC.rows.filter(r=>r.Analyte_ID===a).map(r=>[r.Batch_ID,r]));
const close=(name,got,want,tol=1e-9)=>{assert(Math.abs(got-want)<=tol*Math.max(1,Math.abs(want)),`${name}: app ${got} vs reference ${want}`);rows.push([name,got,want]);};
const rows=[];

const ph=qc('pH'),lsl=Number(ph.get(order[0].Batch_ID).LSL),usl=Number(ph.get(order[0].Batch_ID).USL);
const phRows=order.map(b=>({y:Number(ph.get(b.Batch_ID).Value),equipment:b.Equipment_ID,time:Date.parse(b.Start_TS),group:null,id:b.Batch_ID}));
const all=stats.capability(phRows,{lsl,usl});
for(const [k,f] of [['mean','mean'],['overall','overall'],['Pp','Pp'],['Ppk','Ppk']])close('pH 전체 '+k,all[f],ref.capability_pH_all[k]);
const mix1=stats.capability(phRows.filter(r=>r.equipment==='MIX-1'),{lsl,usl,within:'mr'});
for(const k of ['within','Cp','Cpk','Ppk'])close('pH MIX-1 '+k,mix1[k],ref.capability_pH_MIX1_mr[k]);

const dp=new Map();for(const p of t.Process.rows.filter(p=>p.Parameter==='Filter_DP'))dp.set(p.Batch_ID,Math.max(dp.get(p.Batch_ID)??-Infinity,Number(p.Value)));
const lpc=qc('LPC_1p0'),xy=order.filter(b=>dp.has(b.Batch_ID)&&lpc.has(b.Batch_ID)).map(b=>({x:dp.get(b.Batch_ID),y:Number(lpc.get(b.Batch_ID).Value)}));
const reg=stats.regression(xy);
for(const k of ['slope','intercept','r','r2','rmse'])close('LPC~Filter_DP '+k,reg[k],ref.regression_LPC_vs_FilterDPmax[k]);
close('LPC~Filter_DP Spearman',stats.spearman(xy),ref.spearman_LPC_vs_FilterDPmax);

for(const m of ['ADDITIVE','SILICA','DIW']){
 let g=t.Material.rows.filter(r=>r.Material_ID===m).map(r=>({group:r.Lot_ID,y:Number(ph.get(r.Batch_ID).Value)}));
 const size=g.reduce((s,r)=>s.set(r.group,(s.get(r.group)||0)+1),new Map());g=g.filter(r=>size.get(r.group)>=2); // app needs >= 2 per lot
 const c=stats.contribution(g),want=ref[`contribution_pH_by_${m}_lot`];
 for(const k of ['between','residual','percent'])close(`pH 분산성분 ${m} LOT ${k}`,c[k],want[k]);
}
console.log(`reference check: ${rows.length} values match (pandas/scipy/statsmodels)`);
module.exports=rows;
