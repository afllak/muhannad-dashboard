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
if(typeof module !== 'undefined') module.exports={health, freshness, retain, workerState};
