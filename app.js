'use strict';
// Fixed approved public projection; no caller-supplied URL, private bridge or credentials.
const SOURCE_URL='https://raw.githubusercontent.com/afllak/muhannad-dashboard/hermes/live-state/state.json';
const CACHE_KEY='muhannad-v2-public-schema1';

const LABELS={ACTIVE:['قيد العمل','success'],TESTING:['قيد الاختبار','info'],WAITING_FOR_MUHANNAD:['بانتظارك','waiting'],BLOCKED:['متوقّف','blocked'],READY_FOR_PLAYTEST:['جاهز للاختبار','success'],IDLE:['مؤجّل','neutral'],DONE:['مغلق','neutral'],UNKNOWN:['غير معروف','neutral']};
const byId=id=>document.getElementById(id);
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
function badge(text,tone){return element('span','badge '+tone,text);}
function status(l){if(l.outcome==='PARKED')return badge('مؤجّل','neutral');if(l.outcome==='FUNCTIONALLY_ACCEPTED'&&l.status==='DONE')return badge('مقبول وظيفياً · منتهي','neutral');const [text,tone]=LABELS[l.status]||LABELS.UNKNOWN;return badge(text,tone);}
function shortMilestone(l){if(!l)return '';const sentences=l.milestone.split(/(?<=[.!؟])\s+/);return sentences[0];}
function readableDate(stamp){return new Date(stamp).toLocaleString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})+' UTC';}
let current=null;
function renderContinuity(s){
 const view=DashboardModel.continuityView(s.continuity_watch,Date.now()),banner=byId('continuity-banner'),items=byId('continuity-findings');
 byId('continuity-summary').textContent='فحص مقرر كل خمس دقائق · آخر تقييم: '+(view.evaluated_at||'غير متاح')+' · مو نبض Lead أو عامل.';
 banner.hidden=view.state==='CLEAR';
 banner.textContent=view.state==='CLEAR'?'ماكو خلل استمرارية مرصود ضمن آخر فحص؛ مو إثبات ONLINE.':view.state==='STALE'?'CONTINUITY WATCH STALE — تقييم المراقبة قديم؛ التنبيهات السابقة محفوظة وغير محسومة.':view.state==='ATTENTION'?'تنبيه استمرارية — '+view.findings.map(f=>f.label).join(' · '):'CONTINUITY OBSERVATION UNAVAILABLE — المراقبة غير متاحة أو ما عدنا رصد مثبت؛ مو حالة سليمة.';
 document.title=banner.hidden?'Muhannad Control Center · V2':'⚠ Continuity Watch — Muhannad V2';
 items.replaceChildren();
 view.findings.forEach(f=>{const row=element('div','blocker-row');row.append(badge(f.label,'blocked'));const body=element('div');body.append(element('strong','',f.lane),element('p','',f.detail),element('small','section-note','أول رصد: '+f.first_observed_at));row.append(body);items.append(row);});
 if(view.observation_status==='UNAVAILABLE')items.append(element('p','project-gate','رصد العمّال غير مثبت؛ غياب الرصد مو دليل أن العامل انتهى.'));
 if(view.state==='CLEAR')items.append(element('p','section-note','المسارات المتوقفة بسبب مانع موثّق مو مشكلة استمرارية بحد ذاتها.'));
}
function renderTemporal(s){
 if(!s)return;
 renderContinuity(s);
 byId('checked').textContent=readableDate(s.last_checked);byId('checked').dateTime=s.last_checked;
 byId('freshness').textContent=Date.parse(s.last_checked)>Date.now()?'آخر حالة معروفة · وقت غير مثبت':Date.now()-Date.parse(s.last_checked)>=900000?'آخر حالة معروفة · لقطة قديمة':'آخر حالة معروفة';
 for(const id of ['home-windows','pi']){const n=s.nodes.find(n=>n.id===id),host=byId(id==='pi'?'pi':'windows');host.replaceChildren();host.append(element('h3','',id==='pi'?'RASPBERRY PI — HERMES':'HOME WINDOWS — MUHANNAD LEAD'));host.firstChild.dir='ltr';host.append(badge(n?.connection==='NOT_CONNECTED'?'غير مربوط':'الاتصال غير مثبت','neutral'));host.append(element('p','',id==='pi'?'جهاز مستقل؛ حالة الاتصال حسب المصدر المنشور.':'اتصال الـHermes غير مثبت؛ نبض التشغيل مو دليل وكيل متصل.'));if(n?.runtime_heartbeat_at){const freshness=DashboardModel.runtimeState(n,s.runtime_stale_after_seconds||900);const p=element('p',freshness==='STALE'?'runtime-stale':'runtime-note');p.append(document.createTextNode((freshness==='STALE'?'نبض تشغيل قديم':freshness==='RECENT'?'نبض تشغيل مسجّل':'نبض تشغيل غير مثبت')+' فقط: '),element('bdi','runtime-time',readableDate(n.runtime_heartbeat_at)));p.lastChild.dir='ltr';host.append(p);}}
 const windows=byId('windows'),lead=DashboardModel.leadObservation(s.nodes.find(n=>n.id==='home-windows')?.lead_observation);
 windows.append(element('p','runtime-note','Lead: '+DashboardModel.leadState(lead)+
  (lead?' — ملاحظة دور لخمس دقائق، مو اتصال دائم':' — لا ملاحظة دور سارية مثبتة')));
 if(lead){const p=element('p','runtime-note');p.append(element('bdi','runtime-time','Observed: '+lead.observed_at+' · Expires: '+lead.expires_at));p.firstChild.dir='ltr';windows.append(p);}
}
function render(s){
 const counts=DashboardModel.counts(s),open=DashboardModel.openLanes(s),find=id=>s.lanes.find(l=>l.id===id);
 byId('active-count').textContent=counts.active;byId('blocked-count').textContent=counts.blocked;byId('needs-count').textContent=counts.needs;
 renderTemporal(s);
 byId('needs-items').replaceChildren();
 const waits=open.filter(l=>l.status==='WAITING_FOR_MUHANNAD');
 if(!waits.length)byId('needs-items').append(element('p','','ما مطلوب منك شي حالياً'));
 waits.forEach(l=>{const p=element('p','needs-request');p.append(element('bdi','',l.title.split(' · ')[0]),document.createTextNode(' — '+(l.blocker||l.title_ar||l.milestone)));byId('needs-items').append(p);});
 if(waits.length){byId('needs-items').append(element('p','needs-context','حسب آخر سجل منشور؛ راجع التفاصيل قبل أي خطوة.'));for(const l of waits){const a=element('a','needs-cta');a.href='#project-'+l.id;const text=element('span','cta-label');text.append(element('strong','','راجع المطلوب · '+(l.title_ar||l.title)),element('small','','آخر حالة معروفة · تفاصيل فقط'));const chevron=element('span','cta-chevron','‹');chevron.setAttribute('aria-hidden','true');a.append(text,chevron);byId('needs-items').append(a);}}

 const grid=byId('project-grid');grid.replaceChildren();
 // Group only actual public lanes; no concept projects or invented telemetry.
 const groups=[{ids:['drop1-ui-readability','drop1-human-loop'],name:'Drop 1',caption:'القوائم وتجربة اللعب'},{ids:['fantasy-roam-world','fantasy-runtime-review'],name:'FantasyRoam',caption:'العالم وبناء المحرّر'},{ids:['n8n-windows-website'],name:'n8n / Automation',caption:'الأتمتة والموقع'},{ids:['truenas-backup-audit'],name:'NAS',caption:'الصيانة والنسخ الاحتياطي'}];
 const grouped=new Set(groups.flatMap(g=>g.ids));
 for(const l of open)if(!grouped.has(l.id))groups.push({ids:[l.id],name:l.title,caption:l.title_ar||''});
 let projectCount=0;
 for(const g of groups){const lanes=g.ids.map(find).filter(Boolean);if(!lanes.length)continue;projectCount++;const l=lanes.find(l=>l.status!=='DONE')||lanes[0],card=element('article','project-card');card.id='project-'+l.id;for(const lane of lanes)if(lane.id!==l.id){const anchor=element('span');anchor.id='project-'+lane.id;card.append(anchor);}const top=element('div','project-top');top.append(element('h3','',g.name),status(l));top.firstChild.dir='ltr';card.append(top,element('p','project-caption',g.caption),element('p','milestone',shortMilestone(l)));
 // Public producer fields are authoritative; never replace a gate with frontend opinion.
 if(l.blocker)card.append(element('p','project-gate',l.blocker));
 const d=element('details'),summary=element('summary','','تفاصيل تقنية');d.append(summary);for(const lane of lanes){d.append(element('p','',lane.milestone));if(lane.branch){const p=element('p');p.append(element('bdi','',lane.branch));d.append(p);}if(lane.outcome==='SCOPED_VERIFIED')d.append(element('p','','الاختبار السابق محدّد؛ مو قبول عام للإصدار.'));}d.append(element('small','technical-tag','نقطة مراجَعة · '+readableDate(s.last_checked)));card.append(d);grid.append(card);}
 byId('project-note').textContent=projectCount+' مشاريع · آخر حالة معروفة';
 const blockers=byId('blockers');blockers.replaceChildren();
 const rank={BLOCKED:0,WAITING_FOR_MUHANNAD:1};
 const gates=open.filter(l=>l.blocker).sort((a,b)=>(rank[a.status]??2)-(rank[b.status]??2));
 gates.forEach(l=>{const row=element('div','blocker-row');row.append(status(l));const p=element('p','',l.blocker);p.append(document.createTextNode(' · '),element('bdi','',l.title.split(' · ')[0]));row.append(p);blockers.append(row);});if(!gates.length)blockers.append(element('p','','ماكو عائق منشور حالياً.'));
 const build=byId('latest-build');build.replaceChildren();
 // Schema 1 currently supplies prose milestones, not a structured build artifact/result.
 build.append(element('p','','ماكو نتيجة بناء منظّمة منشورة بالمصدر الحالي.'),element('small','section-note','ملاحظات البناء السابقة محفوظة بتفاصيل المشروع؛ مو إثبات لنتيجة بناء أو جاهزية لعب حالية.'));
 const recent=byId('recent');recent.replaceChildren();
 for(const id of ['fantasy-roam-world','drop1-human-loop','n8n-windows-website','drop1-ui-readability']){const l=find(id);if(!l||l.milestone_basis!=='REVIEWED_CHECKPOINT')continue;const li=element('li'),body=element('div');body.append(element('strong','',l.title_ar),element('p','',shortMilestone(l)));li.append(body);recent.append(li);}
 const closed=s.lanes.filter(l=>l.status==='DONE'||l.outcome==='SUPERSEDED');byId('archive-count').textContent='('+closed.length+')';const archive=byId('archive-list');archive.replaceChildren();closed.forEach(l=>{const row=element('article');row.append(element('h3','',l.title),element('p','',l.milestone));if(l.outcome==='SUPERSEDED')row.append(badge('خطة مغلقة · مو منفّذة','neutral'));archive.append(row);});
}
function accept(next){if(!DashboardModel.valid(next))throw Error('Invalid public schema');if(!current||Date.parse(next.last_checked)>=Date.parse(current.last_checked)){if(JSON.stringify(next)!==JSON.stringify(current)){current=next;render(next);}else renderTemporal(current);}return current;}
async function load(url){const r=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Unavailable');return r.json();}
async function refresh(){try{const fetched=await load(SOURCE_URL);if(current&&Date.parse(fetched.last_checked)<Date.parse(current.last_checked))throw Error('Older public checkpoint');const next=accept(fetched);try{localStorage.setItem(CACHE_KEY,JSON.stringify(next));}catch{}byId('source-notice').className='source-notice';byId('source-notice').textContent='المصدر: الحالة العامة المنقّحة · التصنيفات محفوظة من مراجعة، مو نشاط مباشر.';}catch{if(current)renderTemporal(current);byId('source-notice').className='source-notice offline';byId('source-notice').textContent=current?'تعذّر تأكيد التحديث. نعرض آخر لقطة محفوظة بتوقيتها، مو حالة مباشرة.':'تعذّر تحميل الحالة. ماكو بيانات حتى نعرضها.';}}
async function start(){try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY));if(DashboardModel.valid(cached))accept(cached);}catch{}try{const bundled=await load('snapshot.json');accept(bundled);byId('source-notice').textContent='آخر سجل محفوظ · '+readableDate(current.last_checked);}catch{}setInterval(()=>renderTemporal(current),15000);await refresh();setInterval(refresh,60000);}
start();
