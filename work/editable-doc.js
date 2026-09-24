(function(){
// Add a save control to standalone, editable documents downloaded from the app.
window.editableDocument=function(html){const script='const save=document.createElement("button");save.textContent="수정본 HTML 저장";save.id="editableSave";document.body.prepend(save);save.onclick=()=>{const clone=document.documentElement.cloneNode(true);clone.querySelector("#editableSave")?.remove();const url=URL.createObjectURL(new Blob(["<!doctype html>"+clone.outerHTML],{type:"text/html;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="Engineer_Review_Edited.html";a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};';return html.replace('</body>','<script>'+script+'<'+ '/script></body>');};
})();
