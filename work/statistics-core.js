(function(root){'use strict';
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const sd=a=>a.length>1?Math.sqrt(a.reduce((s,v)=>s+(v-mean(a))**2,0)/(a.length-1)):null;
function capability(rows,{lsl=null,usl=null,k=3,within='none'}={}){
 if(![3,6].includes(k))throw Error('시그마 배수는 3 또는 6입니다.');
 if([lsl,usl].some(x=>x!==null&&!Number.isFinite(x)))throw Error('규격은 유한한 숫자여야 합니다.');
 if(lsl!==null&&usl!==null&&lsl>=usl)throw Error('LSL은 USL보다 작아야 합니다.');
 const values=rows.map(r=>r.y);if(values.length<2||values.some(v=>!Number.isFinite(v)))throw Error('유효한 측정값이 2개 이상 필요합니다.');
 const mu=mean(values),overall=sd(values);let sw=null,mr=[];
 if(within==='mr'){if(new Set(rows.map(r=>r.equipment)).size!==1)throw Error('이동범위법은 설비 1개를 선택하세요.');if(rows.some((r,i)=>i&&r.time<=rows[i-1].time))throw Error('이동범위법은 중복 없는 시간순 기록이 필요합니다.');mr=values.slice(1).map((v,i)=>Math.abs(v-values[i]));sw=mean(mr)/1.128;}
 const idx=(s,d)=>({upper:s>0&&usl!==null?(usl-mu)/(d*s):null,lower:s>0&&lsl!==null?(mu-lsl)/(d*s):null,both:s>0&&lsl!==null&&usl!==null?Math.min(usl-mu,mu-lsl)/(d*s):null,spread:s>0&&lsl!==null&&usl!==null?(usl-lsl)/(2*d*s):null});
 const w=idx(sw,3),o=idx(overall,3),custom=idx(overall,k);
 return{n:values.length,mean:mu,overall,within:sw,mr,lsl,usl,k,Cp:w.spread,Cpk:w.both,Cpu:w.upper,Cpl:w.lower,Pp:o.spread,Ppk:o.both,Ppu:o.upper,Ppl:o.lower,customUpper:custom.upper,customLower:custom.lower,lowerBand:mu-k*overall,upperBand:mu+k*overall,outside:rows.filter(r=>(lsl!==null&&r.y<lsl)||(usl!==null&&r.y>usl)),signals:overall>0?rows.filter(r=>Math.abs(r.y-mu)>k*overall):[],imrSignals:sw>0?rows.filter(r=>Math.abs(r.y-mu)>3*sw):[]};
}
function regression(rows){const a=rows.filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y));if(a.length<3)throw Error('회귀에는 X·Y가 짝지어진 Batch 3개 이상이 필요합니다.');const xs=a.map(r=>r.x),ys=a.map(r=>r.y),mx=mean(xs),my=mean(ys),xx=xs.reduce((s,x)=>s+(x-mx)**2,0),yy=ys.reduce((s,y)=>s+(y-my)**2,0),xy=a.reduce((s,r)=>s+(r.x-mx)*(r.y-my),0);if(xx===0||yy===0)throw Error('X 또는 Y가 일정하여 상관·R²를 계산할 수 없습니다.');const slope=xy/xx,intercept=my-slope*mx,residuals=a.map(r=>({...r,residual:r.y-(intercept+slope*r.x)})),sse=residuals.reduce((s,r)=>s+r.residual**2,0);return{n:a.length,slope,intercept,r:xy/Math.sqrt(xx*yy),r2:Math.max(0,Math.min(1,1-sse/yy)),rmse:Math.sqrt(sse/(a.length-2)),residuals};}
function ranks(a){const sorted=a.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v),out=[];for(let i=0;i<sorted.length;){let j=i+1;while(j<sorted.length&&sorted[j].v===sorted[i].v)j++;for(let t=i;t<j;t++)out[sorted[t].i]=(i+j+1)/2;i=j;}return out;}
function spearman(rows){const a=rows.filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)),x=ranks(a.map(r=>r.x)),y=ranks(a.map(r=>r.y));return regression(a.map((r,i)=>({x:x[i],y:y[i]}))).r;}
function contribution(rows){const groups=new Map();for(const r of rows){if(!r.group)throw Error('분산성분의 그룹 값 누락');if(!groups.has(r.group))groups.set(r.group,[]);groups.get(r.group).push(r.y);}const a=[...groups.values()],N=rows.length,g=a.length;if(g<2||a.some(v=>v.length<2))throw Error('분산성분에는 그룹 2개 이상, 각 그룹 관측값 2개 이상이 필요합니다.');const grand=mean(rows.map(r=>r.y)),ssb=a.reduce((s,v)=>s+v.length*(mean(v)-grand)**2,0),sse=a.reduce((s,v)=>s+v.reduce((z,y)=>z+(y-mean(v))**2,0),0),msb=ssb/(g-1),mse=sse/(N-g),n0=(N-a.reduce((s,v)=>s+v.length**2,0)/N)/(g-1),raw=(msb-mse)/n0,between=Math.max(0,raw),total=between+mse;return{groups:g,n:N,between,residual:mse,rawBetween:raw,percent:total>0?100*between/total:null};}
root.CMPStats={mean,sd,capability,regression,spearman,contribution};if(typeof module!=='undefined')module.exports=root.CMPStats;
})(globalThis);
