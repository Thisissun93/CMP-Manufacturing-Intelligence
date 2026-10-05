// 240 Batch 시연 데이터 생성기 (결정적 난수, 외부 패키지 없음)
// node work/generate-sample240.cjs  → work/sample240.json, samples/*.csv 갱신
//
// 시나리오 설계 의도
//  - 원료 LOT 교체 주기를 원료마다 엇갈리게 둠 (SILICA 6, ADDITIVE 9, DIW 15 Batch).
//    동시에 바뀌면 어느 원료가 원인인지 데이터로 구분할 수 없기 때문.
//  - 사건 A: ADDITIVE-LOT-23 (Batch 195~203)만 알칼리 함량이 높게 설정 → pH USL 초과.
//    단, LOT 교체 직후에는 이전 원료가 배관·탱크에 남아 영향이 점진적으로 올라온다(ADDITIVE_RAMP).
//    그 결과 같은 의심 LOT 안에서도 앞 Batch 일부는 규격을 통과한다 → 영향 범위 산정이 필요해지는 지점.
//    같은 기간 SILICA/DIW LOT은 정상 Batch와 공유되므로 비교로 배제 가능.
//  - 사건 B: MIX-2 필터 교체가 지연(정기 8 Batch 주기 누락) → Filter_DP 상승 → 80 kPa 경보 →
//    LPC_1p0 USL 초과. FILTER_CHANGE 이후 정상 복귀.
//  - 혼합 온도·교반 속도는 정상 범위 유지 (교란 요인 제거).
//  - Ship_Status: HOLD는 출하되지 않는다. RELEASED 중 초기 생산분은 이미 출하(SHIPPED)된 것으로 둔다.
const fs=require('fs'),path=require('path');

const SEED=20261001;
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

function generate(){
 const rand=rng(SEED);
 const normal=(m,s)=>{let u=0,v=0;while(u===0)u=rand();while(v===0)v=rand();return m+s*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
 const r4=v=>String(Math.round(v*10000)/10000);
 const T0=Date.parse('2026-08-31T22:00:00Z'),MIN=60000;
 const iso=ms=>new Date(ms).toISOString().replace('.000Z','Z');
 const N=240,MIXERS=['MIX-1','MIX-2','MIX-3'];
 const ADDITIVE_EVENT_LOT='ADDITIVE-LOT-23';
 const ADDITIVE_RAMP=[0.52,0.70,1,1,1,1,1,1,1]; // 의심 LOT 내 순번별 영향 비율
 const SHIP_CUTOFF=210; // 이 순번 이전의 RELEASED Batch는 이미 출하된 것으로 본다
 const lots=i=>({SILICA:'SILICA-LOT-'+(Math.floor(i/6)+1),ADDITIVE:'ADDITIVE-LOT-'+(Math.floor((i+4)/9)+1),DIW:'DIW-LOT-'+(Math.floor((i+7)/15)+1)});
 const spec={pH:['pH',9.5,10.5,10,0.08],Solids:['wt%',9.5,10.5,10,0.075],Viscosity:['mPa.s',1.2,2.2,1.7,0.06],D50:['nm',75,105,90,1.9],D90:['nm',110,180,130,4.7],LPC_0p5:['count/mL','',3000,1000,140],LPC_1p0:['count/mL','',600,80,11],Zeta:['mV',-50,-30,-40,0.9],Fe:['ug/kg','',1,0.3,0.027]};

 // 설비별 필터 교체 계획: 설비 내 순번 j 기준. 정기 8 Batch 주기, MIX-2는 j=64 교체 누락 → j=77에 교체.
 const filterChangeBefore=(mixer,j)=>{if(j===0)return false;if(mixer==='MIX-2'&&j>56){return j===77;}return j%8===0;};

 const B=[],M=[],P=[],Q=[],E=[],C=[];
 const sinceChange={},perMixer={};
 for(let i=0;i<N;i++){
  const slot=Math.floor(i/3),mixer=MIXERS[i%3],line='LINE-'+(i%3+1),j=slot;
  const start=T0+slot*90*MIN,end=start+80*MIN,id='SIM-S'+String(i+1).padStart(4,'0');
  if(filterChangeBefore(mixer,j)){sinceChange[mixer]=0;E.push({Equipment_Event_ID:'EQ-FC-'+mixer+'-'+j,Equipment_ID:mixer,Event_Type:'FILTER_CHANGE',Valid_From_TS:iso(start-10*MIN),Valid_To_TS:iso(start),Result:'PASS',Data_Origin:'SYNTHETIC'});}
  else sinceChange[mixer]=(sinceChange[mixer]??-1)+1;
  const age=sinceChange[mixer];
  const L=lots(i);
  // 원료 투입
  [['SILICA',100],['ADDITIVE',10],['DIW',890]].forEach(([mat,q],k)=>M.push({Material_Record_ID:id+'-M'+(k+1),Batch_ID:id,Material_ID:mat,Lot_ID:L[mat],Quantity:String(q),Unit:'kg',Charge_TS:iso(start+5*MIN),Data_Origin:'SYNTHETIC'}));
  // 공정: MIX(온도 6점, 교반 3점) / FILTER(차압 3점)
  let pn=0;const proc=(step,s0,s1,param,value,unit,ts,tv,ul,td,ud)=>P.push({Process_Record_ID:id+'-P'+(pn++),Batch_ID:id,Step_Run_ID:id+'-'+step,Step_ID:step,Equipment_ID:mixer,Parameter:param,Value:r4(value),Unit:unit,Event_TS:iso(ts),Step_Start_TS:iso(s0),Step_End_TS:iso(s1),Data_Origin:'SYNTHETIC',Target_Value:String(tv),Upper_Limit:String(ul),Target_Duration_min:String(td),Upper_Duration_min:String(ud)});
  const ms=start+10*MIN,me=start+60*MIN,tBase=normal(25.4,0.35);
  for(let k=0;k<6;k++)proc('MIX',ms,me,'Temperature',tBase+normal(0,0.15),'C',ms+k*8*MIN,25,30,50,60);
  const rpmBase=normal(300,2.5);
  for(let k=0;k<3;k++)proc('MIX',ms,me,'Agitator_Speed',rpmBase+normal(0,1.2),'rpm',ms+(5+k*20)*MIN,300,330,50,60);
  const fs0=start+60*MIN,fe=start+75*MIN,dp=36+3*age+normal(0,1.5);
  for(let k=0;k<3;k++)proc('FILTER',fs0,fe,'Filter_DP',dp+k*0.8+normal(0,0.4),'kPa',fs0+k*6*MIN,40,80,15,20);
  const dpMax=dp+1.6;
  // QC
  const addPos=(i+4)%9; // 첨가제 LOT 내 순번(0~8)
  let out=false;
  for(const[an,[unit,lsl,usl,target,sd]]of Object.entries(spec)){
   let v=normal(target,sd);
   if(an==='pH'&&L.ADDITIVE===ADDITIVE_EVENT_LOT)v+=0.58*ADDITIVE_RAMP[addPos];
   if(an==='Zeta'&&L.ADDITIVE===ADDITIVE_EVENT_LOT)v-=1.4*ADDITIVE_RAMP[addPos];
   if(an==='LPC_1p0'&&dpMax>70)v+=38*(dpMax-70);
   if(an==='LPC_0p5'&&dpMax>70)v+=55*(dpMax-70);
   if(an==='LPC_0p5')v=Math.max(v,400);
   if((lsl!==''&&v<lsl)||(usl!==''&&v>usl))out=true;
   Q.push({QC_Record_ID:id+'-Q-'+an,Batch_ID:id,Sample_ID:id+'-S',Analyte_ID:an,Value:r4(v),Unit:unit,Method_ID:'SIM-M-'+an,Spec_Rev:'SIM-Q02',LSL:String(lsl),USL:String(usl),Qualifier:'EQ',Sample_TS:iso(start+75*MIN),Result_TS:iso(start+120*MIN),Is_Final:'true',Approval_Status:'APPROVED',Spec_Status:'DEMO',Data_Origin:'SYNTHETIC',Target:String(target)});
  }
  B.push({Batch_ID:id,Product_ID:'SIM-OX-02',Recipe_Rev:'SIM-R02',Site_ID:'SITE-01',Line_ID:line,Equipment_ID:mixer,Start_TS:iso(start),End_TS:iso(end),Disposition:out?'HOLD':'RELEASED',Ship_Status:out?'HOLD':(i<SHIP_CUTOFF?'SHIPPED':'IN_STOCK'),Ship_TS:(!out&&i<SHIP_CUTOFF)?iso(end+3*1440*MIN):'',Data_Origin:'SYNTHETIC',Reference_Eligible:i<180?'true':'false'});
 }
 const STATUS=MIXERS.map((m,k)=>({Equipment_Event_ID:'EQ-'+(k+1),Equipment_ID:m,Event_Type:'STATUS',Valid_From_TS:iso(T0),Valid_To_TS:iso(T0+120*60*MIN),Result:'PASS',Data_Origin:'SYNTHETIC'}));
 for(let s=0;s<10;s++){const f=T0+s*720*MIN;C.push({Checksheet_Record_ID:'SHIFT-'+s,Scope_Type:'SITE',Scope_ID:'SITE-01',Checklist_Type:'SHIFT_PRESTART',Valid_From_TS:iso(f),Valid_To_TS:iso(f+720*MIN),Completed_TS:iso(f),Result:'PASS',Comment:'SYNTHETIC factory-wide 12-hour shift',Data_Origin:'SYNTHETIC'});}
 const csv=rows=>{const h=Object.keys(rows[0]);return '﻿'+[h,...rows.map(r=>h.map(k=>r[k]))].map(a=>a.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');};
 return {Batch:csv(B),Material:csv(M),Process:csv(P),Equipment:csv([...STATUS,...E]),QC:csv(Q),Checksheet:csv(C)};
}

module.exports={generate,SEED};
if(require.main===module){
 const root=path.resolve(__dirname,'..'),data=generate();
 fs.writeFileSync(path.join(__dirname,'sample240.json'),JSON.stringify(data));
 for(const[k,v]of Object.entries(data))fs.writeFileSync(path.join(root,'samples',k+'.csv'),v);
 console.log('sample240.json and samples/*.csv regenerated (seed '+SEED+')');
}
