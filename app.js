'use strict';
function health(stamp, now=Date.now()) {
 const age=now-Date.parse(stamp);
 return !stamp || !Number.isFinite(age) || age < -30000 ? 'UNKNOWN' : age > 900000 ? 'STALE' : 'RECENT_RUNTIME_ONLY';
}
function freshness(stamp, now=Date.now()) {
 const age=now-Date.parse(stamp);
 return !stamp || !Number.isFinite(age) || age < -30000 ? 'UNKNOWN' : age > 900000 ? 'STALE' : 'RECENT_CHECKPOINT';
}
function retain(previous, next) { return next || previous; }
function workerState(observation, now=Date.now()) {
 if(!observation || observation.basis!=='HERMES_NATIVE_DELEGATE_LIST' || observation.stale_after_seconds!==300)return 'UNKNOWN';
 const at=Date.parse(observation.observed_at), expires=Date.parse(observation.expires_at);
 if(!Number.isFinite(at) || !Number.isFinite(expires) || expires-at!==300000 || now<at || now>=expires)return 'UNKNOWN';
 return ['ACTIVE_DELEGATE_OBSERVED','RUNNING','NO_ACTIVE_DELEGATE_OBSERVED','UNKNOWN'].includes(observation.observed_state)?observation.observed_state:'UNKNOWN';
}
function leadObservation(value) {
 const fields=['observed_state','observed_at','expires_at','stale_after_seconds','basis'];
 const utc=v=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(v) &&
  v.slice(0,4)!=='0000' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,19)===v.slice(0,19);
 if(!value || Object.keys(value).length!==fields.length || !fields.every(k=>Object.hasOwn(value,k)) ||
    value.observed_state!=='ACTIVE_TURN_OBSERVED' || value.basis!=='HERMES_NATIVE_LEAD_TURN' ||
    value.stale_after_seconds!==300 || !utc(value.observed_at) || !utc(value.expires_at) ||
    Date.parse(value.expires_at)-Date.parse(value.observed_at)!==300000)return null;
 return value;
}
function leadState(value, now=Date.now()) {
 const observation=leadObservation(value);
 return observation && now>=Date.parse(observation.observed_at) && now<Date.parse(observation.expires_at)?'ACTIVE_TURN_OBSERVED':'UNKNOWN';
}
function continuityView(value,now=Date.now()) {
 const unavailable=()=>({state:'UNAVAILABLE',findings:[],evaluated_at:null,observation_status:'UNAVAILABLE'});
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const utc=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(v)&&v.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19);
 const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
 const lanes={'drop1-human-loop':'Drop 1','drop1-ui-readability':'Drop 1 readability','truenas-backup-audit':'NAS maintenance','n8n-research':'Automation research','continuity-watchdog':'Continuity Watch','fantasy-roam-world':'FantasyRoam','fantasy-roam-assets':'Fantasy assets','fab-free-ue58-research':'Asset research','nas-vm-provisioning':'NAS VM plan','hermes-update-ui':'Desktop UI plan','controller-physical-followup':'Controller test','n8n-windows-website':'Windows automation','fantasy-runtime-review':'Runtime review','website-dashboard':'Website V1','website-dashboard-v2':'Website V2','chatgpt-review-integration':'ChatGPT feedback','drop-1-1-fast-playtest':'Drop 1.1'};
 const codes={LEAD_STALE:['LEAD STALE','رصد دور الـLead منتهي؛ نبض الخدمة مو دليل استمرار التنسيق.'],ACTIVE_WITHOUT_WORKER:['ACTIVE WITHOUT WORKER','المسار ACTIVE بدون إثبات حديث لعامل مطابق؛ هذا مو ادعاء بأن العامل مات.'],FOLLOW_UP_NOT_STARTED:['FOLLOW-UP NOT STARTED','انتهاء عامل مثبت بدون متابعة أو إغلاق أو انتظار أو مانع موثّق.'],PROGRESS_STALLED:['PROGRESS STALLED','نقطة الحالة ما تقدمت ضمن المهلة رغم وجود عمل متوقّع؛ مو حكم بأن اللعبة تعطلت.'],OBSERVATION_UNAVAILABLE:['OBSERVATION UNAVAILABLE','مصدر الرصد غير متاح أو غير مثبت؛ ما نفترض وجود عامل أو انتهاءه.']};
 if(!Number.isFinite(now)||!exact(value,['schema_version','evaluated_at','stale_after_seconds','check_interval_seconds','status','findings','observation_status'])||value.schema_version!==1||value.stale_after_seconds!==900||value.check_interval_seconds!==300||!utc(value.evaluated_at)||Date.parse(value.evaluated_at)>now||!['ATTENTION','CLEAR','OBSERVATION_UNAVAILABLE'].includes(value.status)||!['FRESH','UNAVAILABLE'].includes(value.observation_status)||!Array.isArray(value.findings)||value.findings.length>128)return unavailable();
 if((value.status==='CLEAR'&&(value.findings.length||value.observation_status!=='FRESH'))||(value.status==='ATTENTION'&&!value.findings.length))return unavailable();
 const seen=new Set();
 for(const f of value.findings){
  if(!exact(f,['code','workstream_id','severity','first_observed_at','evidence'])||!Object.hasOwn(codes,f.code)||!(f.workstream_id===null||Object.hasOwn(lanes,f.workstream_id))||!['warning','critical'].includes(f.severity)||!utc(f.first_observed_at)||Date.parse(f.first_observed_at)>Date.parse(value.evaluated_at)||typeof f.evidence!=='string'||! /^[A-Z][A-Z0-9_]{0,79}$/.test(f.evidence))return unavailable();
  if((f.code==='LEAD_STALE'&&f.workstream_id!==null)||(!['LEAD_STALE','OBSERVATION_UNAVAILABLE'].includes(f.code)&&f.workstream_id===null))return unavailable();
  const identity=f.code+':'+(f.workstream_id||'');if(seen.has(identity))return unavailable();seen.add(identity);
 }
 return {state:now-Date.parse(value.evaluated_at)>=value.stale_after_seconds*1000?'STALE':value.status,evaluated_at:value.evaluated_at,observation_status:value.observation_status,findings:value.findings.map(f=>({code:f.code,label:codes[f.code][0],detail:codes[f.code][1],lane:f.workstream_id===null?'تنسيق الـLead':lanes[f.workstream_id],severity:f.severity,first_observed_at:f.first_observed_at}))};
}
if(typeof module !== 'undefined') module.exports={health, freshness, retain, workerState, leadObservation, leadState, continuityView};
