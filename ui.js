'use strict';
const labels={ACTIVE:'قيد العمل · ACTIVE',TESTING:'اختبار · TESTING',WAITING_FOR_MUHANNAD:'بانتظار مهند',BLOCKED:'متوقّف · BLOCKED',READY_FOR_PLAYTEST:'جاهز للاختبار',IDLE:'خامل · IDLE',DONE:'مغلق · DONE',UNKNOWN:'غير معروف · UNKNOWN'};
let last=null;
const el=(tag, cls, text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const valid=s=>s && s.schema_version===1 && Array.isArray(s.lanes) && Array.isArray(s.nodes) && s.lanes.every(l=>Object.hasOwn(labels,l.status));
function render(s){
 document.getElementById('checked').textContent=s.last_checked || 'UNKNOWN';
 document.getElementById('freshness').textContent=freshness(s.last_checked)==='STALE'?'لقطة قديمة · STALE':'آخر حالة محفوظة · CHECKPOINT';
 // Runtime health never substitutes for native Lead/worker observations.
 const lead=leadObservation(s.nodes.find(n=>n.id==='home-windows')?.lead_observation);
 document.getElementById('lead-status').textContent='Lead: '+leadState(lead,Date.now())+
  (lead?' — ملاحظة دور محدودة بخمس دقائق، مو اتصال دائم · Observed: '+lead.observed_at+' · Expires: '+lead.expires_at:' — لا ملاحظة دور سارية مثبتة');
 const observed=s.lanes.map(l=>workerState(l.worker_observation));
 const activeWorkers=observed.filter(state=>state==='ACTIVE_DELEGATE_OBSERVED'||state==='RUNNING').length;
 document.getElementById('worker-status').textContent=activeWorkers?
  'Worker observations: '+activeWorkers+' ACTIVE_DELEGATE_OBSERVED — ملاحظات مسارات محدودة الصلاحية، مو عدد عمال فريد ولا اتصال دائم':
  'Workers: UNKNOWN — ماكو ملاحظة تشغيل سارية؛ التفاصيل المحفوظة بكل مسار';
 const nodes=document.getElementById('nodes');nodes.replaceChildren();
 s.nodes.forEach(n=>{
  const card=el('article','node');card.append(el('div','overline',n.id==='pi'?'REMOTE / 02':'HOME / 01'),el('h3','latin',n.title));
  const runtime=health(n.runtime_heartbeat_at);
  const nodeLabel=n.connection==='NOT_CONNECTED'?'غير متصل · NOT CONNECTED':runtime==='RECENT_RUNTIME_ONLY'?'تشغيل الأتمتة حديث · RUNTIME RECENT':runtime==='STALE'?'نبض التشغيل قديم · STALE':'نبض التشغيل غير معروف · UNKNOWN';
  card.append(el('span','badge unknown',nodeLabel));
  card.append(el('p','small',n.id==='pi'?'لم يتم ربط الـPi أو الاتصال به.':'هذا وصف لتشغيل الأتمتة فقط، مو اتصال مباشر بالـLead. ملاحظات العمال منفصلة وتنتهي بصلاحيتها.'));
  card.append(el('div','telemetry','Agent heartbeat: '+(n.agent_heartbeat_at || 'UNKNOWN')));
  card.append(el('div','telemetry','Runtime: '+runtime));
  if(runtime==='STALE')card.append(el('p','blocker','نبض التشغيل قديم / OFFLINE — تبقى آخر حالة محفوظة. مو دليل أن الحاسبة مطفّية.'));
  nodes.append(card);
 });
 const active=document.getElementById('lanes'),history=document.getElementById('history');active.replaceChildren();history.replaceChildren();
 s.lanes.forEach(l=>{
  const row=el('article','lane'),heading=el('div','lane-head'),name=el('div','lane-name');
  name.append(el('h3','latin',l.title),el('p','arabic',l.title_ar));
  heading.append(name,el('span','badge '+l.status.toLowerCase(),labels[l.status]));row.append(heading,el('p','milestone',l.milestone));
  const meta=el('div','lane-meta');meta.append(el('span','','لقطة مراجَعة · مو تحديث مباشر'),el('span','',l.branch?'Branch: '+l.branch:'Branch: UNKNOWN'));row.append(meta);
  const worker=l.worker_observation;
  row.append(el('div','telemetry','Worker: '+workerState(worker)));
  if(worker && worker.observed_at)row.append(el('div','telemetry','Observed: '+worker.observed_at+' · Expires: '+worker.expires_at));
  if(l.blocker)row.append(el('p','blocker','Gate / '+l.blocker));
  if(l.outcome==='SUPERSEDED')row.append(el('p','blocker','SUPERSEDED — not implemented / not deployed'));
  if(l.outcome==='FINDINGS_RETAINED')row.append(el('p','blocker','Review completed ≠ implementation PASS'));
  (l.status==='DONE'||l.outcome==='SUPERSEDED'?history:active).append(row);
 });
}
async function refresh(){
 try{
  const r=await fetch('https://raw.githubusercontent.com/afllak/muhannad-dashboard/hermes/live-state/state.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('Unavailable');
  const next=await r.json();if(!valid(next))throw Error('Invalid snapshot');last=retain(last,next);
  try{localStorage.setItem('public-checkpoint-v1',JSON.stringify(last));}catch{}
  render(last);document.getElementById('error').hidden=true;
 }catch{
  if(last)render(last);document.getElementById('error').hidden=false;
  document.getElementById('error').textContent=last?'تعذّر التحديث — نعرض آخر حالة محفوظة، وليس اتصالاً مباشراً. Offline / last-known snapshot retained.':'الحالة غير متاحة — UNKNOWN. لا توجد لقطة محفوظة.';
 }
}
try{const saved=JSON.parse(localStorage.getItem('public-checkpoint-v1'));if(valid(saved)){last=saved;render(last);}}catch{}
refresh();setInterval(refresh,60000);
setInterval(()=>{if(last)render(last);},15000);
