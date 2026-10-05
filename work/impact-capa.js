// 4단계 · 영향 범위 / CAPA
// 1~3단계가 "왜 이탈했나"에서 끝나므로, 그 다음 두 질문을 담당한다.
//  (1) 영향 범위 — 의심 원료 LOT으로 만든 Batch 전수와 출하 상태. 방향이 반대(원료 → Batch).
//      QC를 통과했지만 규격 여유가 적은 Batch를 따로 분류한다. 실제 품질 사고는 여기서 난다.
//  (2) CAPA — 봉쇄부터 종결까지. 효과성 검증은 손으로 적는 대신 데이터로 판정한다.
(function(){
 const NEAR=0.05;            // 규격 여유가 이 비율 미만이면 '규격 내 주의'
 const EFF_WINDOW=20;        // 효과성 검증 구간 Batch 수
 const PPK_TARGET=1.33;      // 효과성 검증 통과 기준
 const el=(t,a={},...c)=>{const n=document.createElement(t);for(const[k,v]of Object.entries(a)){if(k==='class')n.className=v;else if(k==='html')n.innerHTML=v;else n.setAttribute(k,v);}c.flat().forEach(x=>x!=null&&n.append(x));return n;};
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const ready=()=>typeof tables==='object'&&tables&&tables.Batch&&tables.Batch.rows&&tables.Batch.rows.length;

 let capa=null;

 // ── 데이터 조회 ─────────────────────────────────────────────
 const batches=()=>tables.Batch.rows;
 const matRows=()=>tables.Material?tables.Material.rows:[];
 const qcRows=()=>tables.QC?tables.QC.rows:[];
 const byIndex=()=>{const m=new Map();batches().forEach((b,i)=>m.set(b.Batch_ID,i));return m;};
 const lotOf=(bid,mat)=>{const r=matRows().find(r=>r.Batch_ID===bid&&r.Material_ID===mat);return r?r.Lot_ID:null;};
 const qcOf=(bid,an)=>qcRows().find(r=>r.Batch_ID===bid&&r.Analyte_ID===an);
 const materials=()=>[...new Set(matRows().map(r=>r.Material_ID))].sort();
 const lotsFor=mat=>[...new Set(matRows().filter(r=>r.Material_ID===mat).map(r=>r.Lot_ID))].sort();
 const analytes=()=>[...new Set(qcRows().map(r=>r.Analyte_ID))];

 // 한 Batch의 한 항목을 규격과 대조해 판정한다
 function judge(bid,an){
  const q=qcOf(bid,an); if(!q)return null;
  const v=num(q.Value); if(v==null)return null;
  const lsl=q.LSL===''?null:num(q.LSL), usl=q.USL===''?null:num(q.USL);
  const oos=(lsl!=null&&v<lsl)||(usl!=null&&v>usl);
  let margin=null;
  if(!oos&&lsl!=null&&usl!=null&&usl>lsl) margin=Math.min(usl-v,v-lsl)/(usl-lsl);
  else if(!oos&&usl!=null&&lsl==null) margin=null;
  return {v,lsl,usl,oos,margin,near:margin!=null&&margin<NEAR,unit:q.Unit};
 }

 // ── 영향 범위 계산 ───────────────────────────────────────────
 function impact(mat,lot,an){
  const idx=byIndex();
  const rows=batches().filter(b=>lotOf(b.Batch_ID,mat)===lot).map(b=>{
   const j=judge(b.Batch_ID,an);
   return {id:b.Batch_ID,i:idx.get(b.Batch_ID),start:b.Start_TS,eq:b.Equipment_ID,
           disp:b.Disposition,ship:b.Ship_Status||(b.Disposition==='HOLD'?'HOLD':'미기록'),shipTS:b.Ship_TS||'',j};
  }).sort((a,b)=>a.i-b.i);
  const oos=rows.filter(r=>r.j&&r.j.oos), near=rows.filter(r=>r.j&&!r.j.oos&&r.j.near);
  const shipped=rows.filter(r=>r.ship==='SHIPPED');
  const shippedRisk=shipped.filter(r=>r.j&&(r.j.oos||r.j.near));
  return {rows,oos,near,shipped,shippedRisk};
 }

 // ── 효과성 검증 ─────────────────────────────────────────────
 // 조치 이후 구간에서 ① 동일 모드 이탈 0건 ② Ppk 목표 이상 ③ 관리도 이상 규칙 미발생
 function effectiveness(afterIndex,an){
  const all=batches();
  const win=all.slice(afterIndex+1,afterIndex+1+EFF_WINDOW)
               .map(b=>({id:b.Batch_ID,j:judge(b.Batch_ID,an)})).filter(r=>r.j);
  if(win.length<5) return {ok:false,reason:'검증 구간 Batch가 부족합니다 (최소 5건, 현재 '+win.length+'건)',win:win.length};
  const vals=win.map(r=>r.j.v);
  const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
  const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/(vals.length-1));
  const {lsl,usl}=win[0].j;
  let ppk=null;
  if(sd>0){const u=usl!=null?(usl-mean)/(3*sd):Infinity,l=lsl!=null?(mean-lsl)/(3*sd):Infinity;ppk=Math.min(u,l);}
  // 기준군(Reference_Eligible=true & RELEASED)으로 관리한계 산출
  const ref=all.filter(b=>String(b.Reference_Eligible)==='true'&&b.Disposition==='RELEASED')
               .map(b=>judge(b.Batch_ID,an)).filter(Boolean).map(j=>j.v);
  let rule1=0,rule2=0;
  if(ref.length>=20){
   const rm=ref.reduce((a,b)=>a+b,0)/ref.length;
   const rs=Math.sqrt(ref.reduce((a,b)=>a+(b-rm)**2,0)/(ref.length-1));
   rule1=vals.filter(v=>Math.abs(v-rm)>3*rs).length;
   let run=0,side=0;
   for(const v of vals){const s=v>rm?1:v<rm?-1:0;if(s!==0&&s===side)run++;else{side=s;run=1;}if(run>=9)rule2++;}
  }
  const c1=win.filter(r=>r.j.oos).length===0, c2=ppk!=null&&ppk>=PPK_TARGET, c3=rule1===0&&rule2===0;
  return {ok:c1&&c2&&c3,c1,c2,c3,n:win.length,oosN:win.filter(r=>r.j.oos).length,ppk,rule1,rule2};
 }

 // ── 화면 ────────────────────────────────────────────────────
 const STEPS=['OPEN','봉쇄','원인확정','조치실행','효과성검증','종결'];
 function newCapa(mat,lot,an,imp){
  return {id:'CAPA-'+lot,mat,lot,an,step:0,
   scope:imp.rows.length+'건 투입 · 이탈 '+imp.oos.length+' · 규격 내 주의 '+imp.near.length+' · 출하 완료 '+imp.shipped.length,
   contain:'',cause:'',action:'',actionIndex:null,note:''};
 }

 function render(){
  const panel=document.querySelector('#impactPanel'); if(!panel)return;
  if(!ready()){panel.innerHTML='<h3>4단계 · 영향 범위 / CAPA</h3><p class="muted">먼저 왼쪽에서 데이터를 불러오세요. <b>통계용 240 Batch 불러오기</b>를 누르면 바로 확인할 수 있습니다.</p>';return;}
  const mat=panel.dataset.mat||(materials().includes('ADDITIVE')?'ADDITIVE':materials()[0]);
  const lotList=lotsFor(mat);
  const lot=lotList.includes(panel.dataset.lot)?panel.dataset.lot:(lotList.includes('ADDITIVE-LOT-23')?'ADDITIVE-LOT-23':lotList[0]);
  const anList=analytes();
  const an=anList.includes(panel.dataset.an)?panel.dataset.an:(anList.includes('pH')?'pH':anList[0]);
  panel.dataset.mat=mat;panel.dataset.lot=lot;panel.dataset.an=an;
  const imp=impact(mat,lot,an);
  if(!capa||capa.lot!==lot||capa.an!==an) capa=newCapa(mat,lot,an,imp);

  const opt=(list,sel)=>list.map(v=>'<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(v)+'</option>').join('');
  const pct=m=>m==null?'—':(m*100).toFixed(1)+'%';
  const shipLabel={SHIPPED:'출하 완료',IN_STOCK:'재고 보유',HOLD:'보류'};

  const tableRows=imp.rows.map(r=>{
   const j=r.j, cls=j&&j.oos?'oos-row':j&&j.near?'near-row':'';
   const vcell=j?('<td class="num-cell '+(j.oos?'oos-cell':j.near?'near-cell':'')+'">'+j.v.toFixed(4)+'</td>'):'<td>—</td>';
   const risk=r.ship==='SHIPPED'&&j&&(j.oos||j.near);
   return '<tr class="'+cls+'"><td>'+esc(r.id)+'</td><td class="num-cell">'+(r.i+1)+'</td><td>'+esc(r.eq)+'</td>'
    +vcell+'<td>'+(j?(j.oos?'<b class="bad">이탈</b>':j.near?'<b class="warn-t">규격 내 주의</b>':'정상'):'—')+'</td>'
    +'<td class="num-cell">'+(j&&!j.oos?pct(j.margin):'—')+'</td>'
    +'<td>'+(shipLabel[r.ship]||esc(r.ship))+(risk?' <span class="risk-flag">확인 필요</span>':'')+'</td></tr>';
  }).join('');

  const eff=capa.actionIndex!=null?effectiveness(capa.actionIndex,an):null;
  const chk=(ok,label,detail)=>'<li class="'+(ok?'c-ok':'c-no')+'"><b>'+(ok?'통과':'미통과')+'</b> '+label+' <span class="muted">'+detail+'</span></li>';

  panel.innerHTML=
   '<h3>4단계 · 영향 범위 / CAPA</h3>'
   +'<p class="muted">1~3단계가 원인 후보를 좁혔다면, 여기서는 <b>그 원료로 만든 Batch 전수</b>와 <b>조치 종결</b>을 다룹니다.</p>'
   +'<div class="row impact-controls">'
     +'<label>원료 구분<select id="impMat">'+opt(materials(),mat)+'</select></label>'
     +'<label>원료 LOT<select id="impLot">'+opt(lotList,lot)+'</select></label>'
     +'<label>검사 항목<select id="impAn">'+opt(anList,an)+'</select></label>'
   +'</div>'
   +'<div class="impact-cards">'
     +'<div class="ic"><span class="k">투입 Batch</span><span class="v">'+imp.rows.length+'</span></div>'
     +'<div class="ic ic-bad"><span class="k">규격 이탈</span><span class="v">'+imp.oos.length+'</span></div>'
     +'<div class="ic ic-warn"><span class="k">규격 내 주의</span><span class="v">'+imp.near.length+'</span><span class="n">여유 '+(NEAR*100)+'% 미만</span></div>'
     +'<div class="ic"><span class="k">출하 완료</span><span class="v">'+imp.shipped.length+'</span><span class="n">그중 확인 필요 '+imp.shippedRisk.length+'</span></div>'
   +'</div>'
   +(imp.shippedRisk.length
     ? '<div class="verdict v-bad"><b>출하된 '+imp.shippedRisk.length+'건에 대한 판단이 필요합니다</b><span>'+esc(lot)+'을(를) 쓴 Batch 중 이탈이거나 규격 여유가 '+(NEAR*100)+'% 미만인데 이미 출하된 건입니다. 봉쇄 범위를 이탈 '+imp.oos.length+'건으로 한정할지, LOT 전체로 넓힐지 결정하세요.</span></div>'
     : '<div class="verdict v-ok"><b>출하된 Batch 중 추가 확인 대상 없음</b><span>이 LOT으로 만든 Batch 가운데 이탈·주의 상태로 출하된 건이 없습니다.</span></div>')
   +'<div class="scroll"><table><thead><tr><th>Batch ID</th><th>생산 순번</th><th>설비</th><th>'+esc(an)+' 값</th><th>판정</th><th>규격 여유</th><th>출하 상태</th></tr></thead><tbody>'+tableRows+'</tbody></table></div>'
   +'<h4>CAPA · '+esc(capa.id)+'</h4>'
   +'<ol class="capa-steps">'+STEPS.map((s,i)=>'<li class="'+(i<capa.step?'done':i===capa.step?'cur':'')+'">'+s+'</li>').join('')+'</ol>'
   +'<label>영향 범위 (자동)<textarea id="capaScope" rows="2" readonly>'+esc(capa.scope)+'</textarea></label>'
   +'<label>봉쇄 조치<textarea id="capaContain" rows="2" placeholder="예: '+esc(lot)+' 투입 Batch 전량 보류, 출하분 고객 통보 검토">'+esc(capa.contain)+'</textarea></label>'
   +'<label>근본 원인 (확정 근거)<textarea id="capaCause" rows="2" placeholder="예: 입고 CoA 재검토 및 보관 샘플 적정 재시험으로 알칼리 함량 편차 확인">'+esc(capa.cause)+'</textarea></label>'
   +'<label>시정·예방 조치<textarea id="capaAction" rows="2" placeholder="예: 입고검사 항목에 알칼리도 추가, 공급사 SCAR 발행">'+esc(capa.action)+'</textarea></label>'
   +'<label>조치 적용 시점 (이 생산 순번 이후를 검증 구간으로 본다)<input id="capaIdx" type="number" min="1" max="'+batches().length+'" value="'+(capa.actionIndex!=null?capa.actionIndex+1:(imp.rows.length?imp.rows[imp.rows.length-1].i+1:''))+'"></label>'
   +'<p><button id="capaVerify" class="primary">효과성 검증 실행</button> <button id="capaExport">CAPA 내보내기 (JSON)</button></p>'
   +(eff?('<div class="eff '+(eff.ok?'eff-ok':'eff-no')+'">'
      +'<b>'+(eff.ok?'효과성 검증 통과 — 종결 가능':'효과성 검증 미통과 — 종결 불가')+'</b>'
      +(eff.reason?'<p class="muted">'+esc(eff.reason)+'</p>':
       '<ul class="eff-list">'
        +chk(eff.c1,'동일 모드 이탈 0건','검증 구간 '+eff.n+'건 중 이탈 '+eff.oosN+'건')
        +chk(eff.c2,'Ppk '+PPK_TARGET+' 이상',(eff.ppk!=null?'Ppk '+eff.ppk.toFixed(2):'산출 불가')+' · 전체 표준편차 기준')
        +chk(eff.c3,'관리도 이상 규칙 미발생','3σ 초과 '+eff.rule1+'건 · 연속 9점 편향 '+eff.rule2+'건')
       +'</ul>')
      +'</div>'):'')
   +'<p class="muted">세 조건을 모두 만족할 때만 종결로 넘어갑니다. 검증 구간은 조치 시점 이후 '+EFF_WINDOW+' Batch이며, 관리한계는 Reference_Eligible=true·RELEASED 기준군에서 산출합니다.</p>';

  // 이벤트 연결
  const bind=(id,fn)=>{const n=panel.querySelector(id);if(n)n.addEventListener('change',fn);};
  bind('#impMat',e=>{panel.dataset.mat=e.target.value;panel.dataset.lot='';render();});
  bind('#impLot',e=>{panel.dataset.lot=e.target.value;capa=null;render();});
  bind('#impAn',e=>{panel.dataset.an=e.target.value;capa=null;render();});
  ['contain','cause','action'].forEach(k=>{const n=panel.querySelector('#capa'+k[0].toUpperCase()+k.slice(1));
   if(n)n.addEventListener('input',e=>{capa[k]=e.target.value;capa.step=Math.max(capa.step,['contain','cause','action'].indexOf(k)+1);});});
  const verify=panel.querySelector('#capaVerify');
  if(verify)verify.onclick=()=>{const v=Number(panel.querySelector('#capaIdx').value);
   if(!Number.isFinite(v)||v<1){alert('조치 적용 시점을 생산 순번으로 입력하세요.');return;}
   capa.actionIndex=v-1;capa.step=4;render();
   const r=effectiveness(capa.actionIndex,panel.dataset.an); if(r.ok)capa.step=5;};
  const exp=panel.querySelector('#capaExport');
  if(exp)exp.onclick=()=>{const blob=new Blob([JSON.stringify({...capa,verifiedAt:new Date().toISOString(),effectiveness:capa.actionIndex!=null?effectiveness(capa.actionIndex,panel.dataset.an):null},null,1)],{type:'application/json'});
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=capa.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  if(window.CMPSetStep)window.CMPSetStep(4);
 }

 // ── 설치 ────────────────────────────────────────────────────
 function install(){
  if(document.querySelector('#impactOpen'))return;
  const anchor=document.querySelector('#report'); if(!anchor)return;
  const btn=el('button',{id:'impactOpen'}); btn.textContent='4단계 · 영향 범위 / CAPA';
  anchor.parentElement.append(btn);
  const panel=el('section',{id:'impactPanel'}); panel.hidden=true;
  (anchor.closest('.grid>div')||document.body).append(panel);
  btn.onclick=()=>{panel.hidden=!panel.hidden; if(!panel.hidden){render();panel.scrollIntoView({behavior:'smooth',block:'start'});}};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install); else install();
 window.CMPImpact={render,impact,effectiveness,judge};
})();
