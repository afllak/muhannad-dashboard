'use strict';
function health(stamp, now=Date.now()) {
 const age=now-Date.parse(stamp);
 return !stamp || !Number.isFinite(age) || age < -30000 ? 'UNKNOWN' : age > 90000 ? 'STALE' : 'RECENT_RUNTIME_ONLY';
}
function freshness(stamp, now=Date.now()) {
 const age=now-Date.parse(stamp);
 return !stamp || !Number.isFinite(age) || age < -30000 ? 'UNKNOWN' : age > 900000 ? 'STALE' : 'RECENT_CHECKPOINT';
}
function retain(previous, next) { return next || previous; }
if(typeof module !== 'undefined') module.exports={health, freshness, retain};
