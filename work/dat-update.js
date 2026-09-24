(function(){
 const button=document.querySelector('#updateDat'),input=document.querySelector('#datFile'),status=document.querySelector('#updateStatus');
 button.onclick=()=>input.click();
 input.onchange=async()=>{const file=input.files[0];if(!file)return;button.disabled=true;try{
  if(!/\.dat$/i.test(file.name)||file.size>15*1024*1024)throw Error('15MB 이하의 CMP 업데이트 .dat 파일을 선택하세요.');
  const pack=JSON.parse(await file.text());
  if(pack.format!=='CMP-OFFLINE-UPDATE-1'||pack.version!=='1.0'||!['CMP_Batch_Investigator.html','CMP_Batch_Investigator_v2.html'].includes(pack.filename)||typeof pack.html!=='string')throw Error('지원하지 않는 업데이트 파일입니다.');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pack.html)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==pack.sha256)throw Error('파일 검증 실패: 업데이트 파일이 손상되었습니다.');
  if(!pack.html.includes('name="cmp-app" content="CMP-Batch-Investigator"'))throw Error('CMP 프로그램 식별 정보가 없습니다.');
  status.textContent='검증 완료 · '+pack.updatedAt+' · 기존 '+pack.filename+'을 선택하면 덮어씁니다. CSV 파일은 변경하지 않습니다.';
  if(window.showSaveFilePicker){
   const handle=await window.showSaveFilePicker({suggestedName:pack.filename,types:[{description:'CMP 프로그램',accept:{'text/html':['.html']}}]});
   if(handle.name!==pack.filename)throw Error('기존 '+pack.filename+' 파일을 선택하세요.');
   const writer=await handle.createWritable();await writer.write(pack.html);await writer.close();
   const saved=await handle.getFile();if(await saved.text()!==pack.html)throw Error('저장 검증 실패');
   status.textContent='업데이트 저장 및 검증 완료. 열린 프로그램을 새로고침하고 CSV를 다시 불러오세요.';
  }else{
   const url=URL.createObjectURL(new Blob([pack.html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=pack.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
   status.textContent='브라우저가 직접 덮어쓰기를 지원하지 않아 HTML을 다운로드했습니다. 통합 저장 폴더의 같은 이름 파일로 교체한 후 새로고침하세요. 아직 설치 완료 상태는 아닙니다.';
  }
 }catch(e){status.textContent=e.name==='AbortError'?'업데이트를 취소했습니다. 기존 파일은 유지됩니다.':e.message;}finally{button.disabled=false;input.value='';}};
})();
