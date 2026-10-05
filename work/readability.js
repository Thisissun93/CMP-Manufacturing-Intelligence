// 가독성 레이어 — 기존 화면 구조는 그대로 두고 표시 방식만 보강한다.
// 1) 한글 본문 가독성(폰트 스택·행간·자간)  2) 숫자 정렬(tabular-nums)
// 3) 규격 이탈 값 시각 강조  4) 보고서 최상단 결론 배너  5) 단계 진행 표시
// 6) 좌측 패널 접기  7) 다크 모드
(function(){
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

 // ── 숫자 셀 정렬: 숫자로만 이루어진 셀을 우측 정렬 + 등폭 숫자
 function alignNumbers(scope){
  for(const td of scope.querySelectorAll('td')){
   const t=td.textContent.trim();
   if(t && /^[-+]?\d[\d,]*(\.\d+)?$/.test(t)) td.classList.add('num-cell');
  }
 }

 // ── 규격 이탈 강조: '현재 값'과 '규격 하한 / 상한'을 가진 표를 찾아 비교
 function markOOS(scope){
  for(const table of scope.querySelectorAll('table')){
   try{
    const heads=[...table.querySelectorAll('thead th, tr:first-child th')].map(th=>th.textContent.replace(/\s+/g,''));
    const vi=heads.findIndex(h=>h.includes('현재값'));
    const si=heads.findIndex(h=>h.includes('규격하한')||h.includes('하한/상한'));
    if(vi<0||si<0) continue;
    for(const tr of table.querySelectorAll('tbody tr, tr')){
     const tds=tr.querySelectorAll('td'); if(tds.length<=Math.max(vi,si)) continue;
     const v=Number(tds[vi].textContent.replace(/,/g,'').trim());
     const m=tds[si].textContent.split('/').map(x=>x.trim());
     if(!Number.isFinite(v)||m.length<2) continue;
     const lsl=m[0]===''||m[0]==='-'?null:Number(m[0]), usl=m[1]===''||m[1]==='-'?null:Number(m[1]);
     const low=lsl!=null&&Number.isFinite(lsl)&&v<lsl, high=usl!=null&&Number.isFinite(usl)&&v>usl;
     if(low||high){ tr.classList.add('oos-row'); tds[vi].classList.add('oos-cell'); tds[vi].setAttribute('title',(high?'규격 상한 초과':'규격 하한 미달')); }
     else if(usl!=null&&lsl!=null&&Number.isFinite(usl)&&Number.isFinite(lsl)){
      const band=usl-lsl, margin=Math.min(usl-v,v-lsl);
      if(band>0 && margin/band<0.05){ tr.classList.add('near-row'); tds[vi].classList.add('near-cell'); tds[vi].setAttribute('title','규격 내이지만 여유 5% 미만'); }
     }
    }
   }catch(e){/* 표 구조가 다르면 조용히 건너뛴다 */}
  }
 }

 // ── 결론 배너: 보고서 상단에 한 줄 판정을 올린다
 function verdictBanner(out){
  const h=out.querySelector('h2,h3'); if(!h) return;
  const oos=out.querySelectorAll('.oos-row').length, near=out.querySelectorAll('.near-row').length;
  const old=out.querySelector('.verdict'); if(old) old.remove();
  const el=document.createElement('div');
  el.className='verdict '+(oos?'v-bad':near?'v-warn':'v-ok');
  el.innerHTML = oos
   ? '<b>규격 이탈 '+oos+'건</b><span>품질 담당자 검토 대상입니다. 아래 표에서 붉게 표시된 항목을 확인하세요.</span>'
   : near
   ? '<b>규격 내 · 주의 '+near+'건</b><span>이탈은 아니지만 규격 여유가 5% 미만인 항목이 있습니다.</span>'
   : '<b>규격 내 · 정상</b><span>검사 항목 전체가 규격 안에 있습니다.</span>';
  h.after(el);
 }

 // ── 단계 진행 표시
 function stepBar(){
  const anchor=$('#report'); if(!anchor||$('#stepBar')) return;
  const bar=document.createElement('div'); bar.id='stepBar';
  bar.innerHTML=['1 · Batch 보고서','2 · LOT 통계 분석','3 · RCA / 검증','4 · 영향 범위 / CAPA']
   .map((t,i)=>'<span data-step="'+(i+1)+'">'+t+'</span>').join('');
  anchor.closest('section').prepend(bar);
 }
 function setStep(n){ $$('#stepBar span').forEach(s=>s.classList.toggle('on',Number(s.dataset.step)<=n)); }
 window.CMPSetStep=setStep;

 // ── 좌측 패널 접기 (한 번 쓰고 마는 기능이 화면을 계속 차지하지 않도록)
 function collapsibleSidebar(){
  const col=document.querySelector('.grid>div:first-child'); if(!col||col.dataset.collapsible) return;
  col.dataset.collapsible='1';
  const btn=document.createElement('button'); btn.id='sideToggle'; btn.type='button';
  btn.textContent='데이터 · 조회 범위 접기';
  btn.onclick=()=>{ const hid=col.classList.toggle('side-collapsed');
   btn.textContent=hid?'데이터 · 조회 범위 펼치기':'데이터 · 조회 범위 접기';
   document.querySelector('.grid').classList.toggle('grid-wide',hid); };
  col.prepend(btn);
 }

 // ── 보고서가 다시 그려질 때마다 위 처리를 적용
 function enhance(){
  const out=$('#out'); if(!out) return;
  alignNumbers(out); markOOS(out); verdictBanner(out);
  if(out.textContent.trim()) setStep(1);
 }
 const out=$('#out');
 if(out) new MutationObserver(()=>{ clearTimeout(enhance._t); enhance._t=setTimeout(enhance,60); }).observe(out,{childList:true,subtree:true});
 const stats=$('#statsPanel');
 if(stats) new MutationObserver(()=>{ clearTimeout(enhance._s); enhance._s=setTimeout(()=>{alignNumbers(stats);markOOS(stats);},80); }).observe(stats,{childList:true,subtree:true});

 document.addEventListener('DOMContentLoaded',()=>{stepBar();collapsibleSidebar();});
 stepBar(); collapsibleSidebar(); enhance();
 $$('#statisticsOpen').forEach(b=>b.addEventListener('click',()=>setStep(2)));
})();
