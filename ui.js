'use strict';
const labels={ACTIVE:'قيد العمل · ACTIVE',TESTING:'اختبار · TESTING',WAITING_FOR_MUHANNAD:'بانتظار مهند',BLOCKED:'متوقّف · BLOCKED',READY_FOR_PLAYTEST:'جاهز للاختبار',IDLE:'خامل · IDLE',DONE:'مغلق · DONE',UNKNOWN:'غير معروف · UNKNOWN'};
let last=null;
const el=(tag, cls, text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const valid=s=>s && s.schema_version===1 && Array.isArray(s.lanes) && Array.isArray(s.nodes) && s.lanes.every(l=>Object.hasOwn(labels,l.status));
function render(s){
 document.getElementById('checked').textContent=s.last_checked || 'UNKNOWN';
 document.getElementById('freshness').textContent=freshness(s.last_checked)==='STALE'?'لقطة قديمة · STALE':'آخر حالة محفوظة · CHECKPOINT';
 const nodes=document.getElementById('nodes');nodes.replaceChildren();
 s.nodes.forEach(n=>{
  const card=el('article','node');card.append(el('div','overline',n.id==='pi'?'REMOTE / 02':'HOME / 01'),el('h3','latin',n.title));
  card.append(el('span','badge unknown',n.connection==='NOT_CONNECTED'?'غير متصل · NOT CONNECTED':'الاتصال غير معروف · UNKNOWN'));
  card.append(el('p','small',n.id==='pi'?'لم يتم ربط الـPi أو الاتصال به.':'لا دليل نبض مباشر للـLead أو العمال. حالة المسار ليست إثبات اتصال.'));
  card.append(el('div','telemetry','Agent heartbeat: '+(n.agent_heartbeat_at || 'UNKNOWN')));
  card.append(el('div','telemetry','Runtime: '+health(n.runtime_heartbeat_at)));nodes.append(card);
 });
 const active=document.getElementById('lanes'),history=document.getElementById('history');active.replaceChildren();history.replaceChildren();
 s.lanes.forEach(l=>{
  const row=el('article','lane'),heading=el('div','lane-head'),name=el('div','lane-name');
  name.append(el('h3','latin',l.title),el('p','arabic',l.title_ar));
  heading.append(name,el('span','badge '+l.status.toLowerCase(),labels[l.status]));row.append(heading,el('p','milestone',l.milestone));
  const meta=el('div','lane-meta');meta.append(el('span','','لقطة مراجَعة · مو تحديث مباشر'),el('span','',l.branch?'Branch: '+l.branch:'Branch: UNKNOWN'));row.append(meta);
  if(l.blocker)row.append(el('p','blocker','Gate / '+l.blocker));
  if(l.outcome==='SUPERSEDED')row.append(el('p','blocker','SUPERSEDED — not implemented / not deployed'));
  if(l.outcome==='FINDINGS_RETAINED')row.append(el('p','blocker','Review completed ≠ implementation PASS'));
  (l.status==='DONE'?history:active).append(row);
 });
}
async function refresh(){
 try{
  const r=await fetch('state.json',{cache:'no-store'});if(!r.ok)throw Error('Unavailable');
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
setInterval(()=>{if(last)document.getElementById('freshness').textContent=freshness(last.last_checked)==='STALE'?'لقطة قديمة · STALE':'آخر حالة محفوظة · CHECKPOINT';},15000);
