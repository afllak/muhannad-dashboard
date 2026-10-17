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
if(typeof module !== 'undefined') module.exports={health, freshness, retain, workerState, leadObservation, leadState};
