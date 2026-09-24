/* CMP Batch Investigator 1.0. Offline, deterministic analysis. */
(function(root){
'use strict';
const RULE_VERSION='SIM-RULES-1.0';
const limits={pH_25C:[9.5,10.5],Solids_wt_pct:[9.5,10.5],Viscosity_mPa_s:[1.2,2.2],PSD_D50_nm:[75,105],PSD_D90_nm:[110,180],LPC_gt_0p5um_count_mL:[null,3000],LPC_gt_1p0um_count_mL:[null,600],Zeta_mV:[-50,-30],Fe_ug_kg:[null,1]};
const metricLabels={pH_25C:'최종 pH',Solids_wt_pct:'고형분 (wt%)',Viscosity_mPa_s:'점도 (mPa·s)',PSD_D50_nm:'D50 (nm)',PSD_D90_nm:'D90 (nm)',LPC_gt_0p5um_count_mL:'LPC >0.5 μm (개/mL)',LPC_gt_1p0um_count_mL:'LPC >1.0 μm (개/mL)',Zeta_mV:'제타 전위 (mV)',Fe_ug_kg:'Fe (μg/kg)'};
function parseCSV(input){
 const s=input.replace(/^\uFEFF/,'');let rows=[],row=[],field='',quoted=false,closed=false,line=1,start=1;
 const cell=()=>{row.push(field);field='';closed=false;};
 const record=()=>{cell();if(row.some(x=>x!==''))rows.push({cells:row,line:start});row=[];start=line+1;};
 for(let i=0;i<s.length;i++){
  const ch=s[i];
  if(quoted){if(ch==='"'){if(s[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else{field+=ch;if(ch==='\n')line++;}continue;}
  if(ch==='"'){if(field||closed)throw Error(`${line}행: 따옴표 위치가 잘못되었습니다.`);quoted=true;}
  else if(ch===',')cell();
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&s[i+1]==='\n')i++;record();line++;start=line;}
  else {if(closed)throw Error(`${line}행: 닫힌 따옴표 뒤 문자가 있습니다.`);field+=ch;}
 }
 if(quoted)throw Error('닫히지 않은 따옴표가 있습니다.');
 if(field||row.length||closed)record();
 if(!rows.length)throw Error('빈 CSV입니다.');
 const headers=rows.shift().cells.map(x=>x.trim());
 if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error('빈 열 이름 또는 중복 열 이름이 있습니다.');
 return {headers,rows:rows.map(r=>{if(r.cells.length!==headers.length)throw Error(`${r.line}행: 열 수 ${r.cells.length}개, 헤더 ${headers.length}개`);return Object.assign(Object.fromEntries(headers.map((h,i)=>[h,r.cells[i].trim()])),{_line:r.line});})};
}
function readTable(name,csv,schema,filename=name+'.csv'){
 const table=parseCSV(csv);const fields=schema[name];const missing=fields.filter(f=>!table.headers.includes(f.name));
 if(missing.length)throw Error(`${name}: 필수 열 누락 (${missing.map(x=>x.name).join(', ')})`);
 if(table.rows.length>50000)throw Error('파일당 50,000행 이하로 나누어 가져오세요.');
 const keys=new Set(),batchKeys=new Set();
 for(const r of table.rows){
  r._file=filename;
  for(const f of fields){const v=r[f.name],t=f.type;
   if(v===''){if(!t.endsWith('_nullable'))throw Error(`${filename} ${r._line}행: ${f.name} 필수값 누락`);continue;}
   if(t.startsWith('number')||t==='integer'){if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v)||!Number.isFinite(Number(v))||(t==='integer'&&!Number.isInteger(Number(v))))throw Error(`${filename} ${r._line}행: ${f.name} 숫자 형식 오류`);}
   if(t==='boolean'&&!['true','false'].includes(v))throw Error(`${filename} ${r._line}행: ${f.name}는 true/false여야 합니다.`);
   if(t==='timestamp'&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v))))throw Error(`${filename} ${r._line}행: ${f.name} 시간대 포함 ISO 시각이 필요합니다.`);
   if(t==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))throw Error(`${filename} ${r._line}행: ${f.name} 날짜 형식 오류`);
  }
  const id=r[fields[0].name];if(keys.has(id)||batchKeys.has(r.Batch_ID))throw Error(`${filename} ${r._line}행: 중복 키. 이 버전은 Batch당 요약 1행입니다.`);
  keys.add(id);batchKeys.add(r.Batch_ID);
 }
 return {...table,name,filename,byBatch:Object.fromEntries(table.rows.map(r=>[r.Batch_ID,r]))};
}
const num=(r,k)=>r&&r[k]!==''&&r[k]!=null?Number(r[k]):null;
const diff=(a,b)=>(Date.parse(a)-Date.parse(b))/60000;
function investigate(tables,bid){
 const b=tables.Batch?.byBatch[bid];if(!b)throw Error('입력한 Batch ID를 찾을 수 없습니다.');
 const record=Object.fromEntries(Object.keys(tables).map(k=>[k,tables[k].byBatch[bid]||null]));
 const {Material:m,Process:p,Equipment:e,QC:q,Checksheet:c}=record;
 let findings=[];
 const add=(kind,title,current,basis,r,field)=>findings.push({kind,title,current:String(current??'미확인'),basis,source:r?`${r._file} · ${r._line}행 · ${field}`:`${field} · 연결 기록 없음`});
 for(const name of Object.keys(tables))if(!record[name])add('missing',`${name} 기록 누락`,'미연결','Batch_ID로 연결되는 행이 없습니다.',null,name);
 for(const [name,r] of [['Process',p],['Equipment',e],['Checksheet',c]])if(r&&r.Equipment_ID!==b.Equipment_ID)add('integrity','설비 ID 불일치',r.Equipment_ID,`Batch 설비: ${b.Equipment_ID}`,r,'Equipment_ID');
 const chronological=(r,a,z,label)=>{if(r&&Date.parse(r[a])>Date.parse(r[z]))add('integrity',label,`${r[a]} / ${r[z]}`,'시작 시각은 종료 시각보다 늦을 수 없습니다.',r,`${a}, ${z}`);};
 chronological(b,'Start_TS','End_TS','Batch 시간 순서');chronological(m,'Charge_Start_TS','Charge_End_TS','투입 시간 순서');chronological(q,'Sample_TS','Result_TS','시료/결과 시간 순서');
 if(p){const fields=['Mix_Start_TS','Mix_End_TS','Hold_End_TS','Filter_Start_TS','Filter_End_TS','Fill_Start_TS','Fill_End_TS'];for(let i=1;i<fields.length;i++)chronological(p,fields[i-1],fields[i],'공정 시간 순서');
  if(Date.parse(p.Fill_End_TS)!==Date.parse(b.End_TS))add('integrity','충전/Batch 종료 불일치',p.Fill_End_TS,b.End_TS,p,'Fill_End_TS');
  if(num(p,'Mix_Temp_Mean_C')>num(p,'Mix_Temp_Max_C'))add('integrity','온도 평균/최대 불일치',p.Mix_Temp_Mean_C,'평균이 최대보다 큽니다.',p,'Mix_Temp_Mean_C');
 }
 const boundary=(left,right,title,r,field)=>{if(left&&right&&Date.parse(left)>Date.parse(right))add('integrity',title,left,`연결 시각: ${right}`,r,field);};
 boundary(b.Start_TS,m?.Charge_Start_TS,'Batch/투입 시작 순서',m,'Charge_Start_TS');
 boundary(m?.Charge_End_TS,p?.Mix_Start_TS,'투입 완료/혼합 시작 순서',p,'Mix_Start_TS');
 boundary(e?.Snapshot_TS,b.Start_TS,'설비 분석 시점 기록/제조 시작 순서',e,'Snapshot_TS');
 boundary(c?.Prestart_TS,b.Start_TS,'시업 확인/제조 시작 순서',c,'Prestart_TS');
 boundary(p?.Fill_Start_TS,q?.Sample_TS,'충전 시작/시료 채취 순서',q,'Sample_TS');
 boundary(q?.Sample_TS,b.End_TS,'시료 채취/제조 종료 순서',q,'Sample_TS');
 boundary(b.End_TS,c?.Closeout_TS,'제조 종료/체크시트 마감 순서',c,'Closeout_TS');
 if(m){if(Math.abs(num(m,'Silica_Charge_kg')+num(m,'Additive_Charge_kg')+num(m,'DIW_Charge_kg')-num(b,'Target_Mass_kg'))>.01)add('review','계획 대비 투입량 차이',num(m,'Silica_Charge_kg')+num(m,'Additive_Charge_kg')+num(m,'DIW_Charge_kg'),`계획 ${b.Target_Mass_kg} kg`,m,'Silica_Charge_kg / Additive_Charge_kg / DIW_Charge_kg');
  if(Date.parse(m.Silica_Expiry_Date+'T23:59:59+09:00')<Date.parse(m.Charge_End_TS))add('review','원료 사용기한 경과',m.Silica_Expiry_Date,'투입 시점 기준',m,'Silica_Expiry_Date');
 }
 if(e&&Date.parse(e.Calibration_Due_Date+'T23:59:59+09:00')<Date.parse(b.Start_TS))add('review','교정 유효기간 경과',e.Calibration_Due_Date,'제조 시작 시점 기준',e,'Calibration_Due_Date');
 if(q){if(num(q,'PSD_D50_nm')>num(q,'PSD_D90_nm'))add('integrity','입도 순서 불일치',q.PSD_D50_nm,'D50은 D90 이하이어야 합니다.',q,'PSD_D50_nm / PSD_D90_nm');
  if(num(q,'LPC_gt_1p0um_count_mL')>num(q,'LPC_gt_0p5um_count_mL'))add('integrity','LPC 누적 수 불일치',q.LPC_gt_1p0um_count_mL,'>1.0 μm 입자는 >0.5 μm 입자 수 이하여야 합니다.',q,'LPC_gt_1p0um_count_mL');
  for(const key of ['Zeta_mV','Zeta_Test_pH'])if(q[key]==='')add('missing',`${key} 미측정`,'빈 값','0으로 대체하지 않았습니다.',q,key);
  if((q.Zeta_Status==='MEASURED'&&(q.Zeta_mV===''||q.Zeta_Test_pH===''))||(q.Zeta_Status==='NOT_MEASURED'&&(q.Zeta_mV!==''||q.Zeta_Test_pH!=='')))add('integrity','제타 측정 상태/값 불일치',q.Zeta_Status,'미측정 상태와 값의 존재 여부를 확인하세요.',q,'Zeta_Status');
  for(const key of ['LPC_gt_0p5um_count_mL','LPC_gt_1p0um_count_mL','PSD_D50_nm','PSD_D90_nm','Fe_ug_kg'])if(num(q,key)<0)add('integrity','음수 측정값 확인',q[key],'해당 측정량은 음수일 수 없습니다.',q,key);
  if(!['PASS','FAIL','INCOMPLETE'].includes(q.QC_Status))add('integrity','QC 상태 코드 확인',q.QC_Status,'지원 코드: PASS, FAIL, INCOMPLETE',q,'QC_Status');
 }
 if(c)for(const k of ['Line_Clearance','Cleaning_Verified','Calibration_Verified','Filter_Identity_Verified','Addition_Order_Verified'])if(c[k]!=='PASS')add('review','체크시트 확인 필요',`${k}: ${c[k]}`,'점검 항목 원본 확인',c,k);
 const synthetic=Object.values(record).filter(Boolean).every(r=>r.Data_Origin==='SYNTHETIC')&&b.Product_ID==='SIM-OX-01'&&b.Recipe_Rev==='SIM-R01'&&q?.Spec_Rev==='SIM-Q01'&&q?.Method_Set_ID==='SIM-QC-M01';
 if(synthetic){
  if(p){for(const [key,threshold,title] of [['Mix_Temp_Max_C',30,'최고 혼합온도 검토'],['Filter_DP_Max_kPa',80,'최대 여과 차압 검토']])if(num(p,key)>threshold)add('review',title,p[key],`등록 검토 기준 > ${threshold} ${key.endsWith('C')?'°C':'kPa'}`,p,key);
   const hold=diff(p.Hold_End_TS,p.Mix_End_TS);if(hold>60)add('review','혼합 후 대기시간 연장',hold+'분','등록 검토 기준 > 60분',p,'Mix_End_TS / Hold_End_TS');
  }
  for(const [k,[lo,hi]] of Object.entries(limits)){const value=num(q,k);if(value!==null&&((lo!==null&&value<lo)||(hi!==null&&value>hi)))add('oos',metricLabels[k]+' 규격 이탈',value,`SIM-Q01: ${lo===null?'하한 없음':lo} ~ ${hi===null?'상한 없음':hi}`,q,k);}
  const incomplete=Object.keys(limits).some(k=>num(q,k)===null);const failed=Object.entries(limits).some(([k,[lo,hi]])=>num(q,k)!==null&&((lo!==null&&num(q,k)<lo)||(hi!==null&&num(q,k)>hi)));
  const calculated=incomplete?'INCOMPLETE':failed?'FAIL':'PASS';if(q.QC_Status!==calculated)add('integrity','QC 원본 판정/계산 불일치',q.QC_Status,`등록 규격 재계산: ${calculated}`,q,'QC_Status');
 }
 // Reference flags are supplied by the imported data, not inferred from the result.
 const refs=tables.Batch.rows.filter(r=>r.Batch_ID!==bid&&r.Reference_Eligible==='true'&&r.Disposition==='RELEASED'&&r.Product_ID===b.Product_ID&&r.Recipe_Rev===b.Recipe_Rev&&r.Data_Origin===b.Data_Origin&&Date.parse(r.End_TS)<Date.parse(b.Start_TS)&&Object.values(tables).every(t=>t.byBatch[r.Batch_ID])&&['Process','Equipment','Checksheet'].every(n=>tables[n].byBatch[r.Batch_ID].Equipment_ID===r.Equipment_ID)&&tables.QC.byBatch[r.Batch_ID]?.QC_Status==='PASS'&&tables.QC.byBatch[r.Batch_ID]?.Method_Set_ID===q?.Method_Set_ID&&tables.QC.byBatch[r.Batch_ID]?.Spec_Rev===q?.Spec_Rev);
 const metrics=Object.keys(limits).map(key=>{const vals=refs.map(r=>num(tables.QC.byBatch[r.Batch_ID],key)).filter(x=>x!==null);const n=vals.length;const mean=n?vals.reduce((a,v)=>a+v,0)/n:null;const sd=n>1?Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/(n-1)):null;const value=num(q,key);const z=value!==null&&sd>0?(value-mean)/sd:null;
  if(n>=10&&z!==null&&Math.abs(z)>3)add('signal',metricLabels[key]+' 기준군 차이',value,`과거 기준군 n=${n}, 평균 ${mean.toFixed(3)}, s ${sd.toFixed(3)}, 편차 ${z.toFixed(2)}s (탐색용)`,q,key);
  return {key,label:metricLabels[key],value,n,mean,sd,z,limit:synthetic?limits[key]:null};
 });
 if(m&&refs.length){for(const key of ['Silica_Lot_ID','Additive_Lot_ID']){const lots=new Set(refs.map(r=>tables.Material.byBatch[r.Batch_ID]?.[key]).filter(Boolean));if(lots.size&&!lots.has(m[key]))add('change','기준군에 없는 원료 Lot',m[key],`${key}: 비교 가능한 과거 기준군에 없음. 불량 판정이 아닙니다.`,m,key);}}
 const rank={integrity:0,missing:1,oos:2,review:3,signal:4,change:5};findings.sort((a,b)=>rank[a.kind]-rank[b.kind]);
 return {bid,batch:b,record,findings,refs:refs.map(r=>r.Batch_ID),metrics,synthetic,generated:new Date().toISOString(),ruleVersion:RULE_VERSION,holdMinutes:p?diff(p.Hold_End_TS,p.Mix_End_TS):null};
}
const api={parseCSV,readTable,investigate,limits,metricLabels};root.CMP=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
