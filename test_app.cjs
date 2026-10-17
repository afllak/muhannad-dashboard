const test = require('node:test');
const assert = require('node:assert/strict');
const {health, freshness, retain} = require('./app.js');
test('unknown is not online; old heartbeat becomes stale', () => {
 assert.equal(health(null, 100000), 'UNKNOWN');
 assert.equal(health('1970-01-01T00:00:01Z', 1000000), 'STALE');
 assert.equal(health('invalid', 100000), 'UNKNOWN');
 assert.equal(health('1970-01-01T00:01:39Z', 100000), 'RECENT_RUNTIME_ONLY');
});
test('checkpoint age is not a worker heartbeat', () => {
 assert.equal(freshness('1970-01-01T00:00:01Z', 1000000), 'STALE');
 assert.equal(freshness(null), 'UNKNOWN');
});
test('raw cache and five-minute publish interval do not create false offline', () => {
 assert.equal(health('1970-01-01T00:00:00Z', 600000), 'RECENT_RUNTIME_ONLY');
 assert.equal(health('1970-01-01T00:00:00Z', 901000), 'STALE');
});
test('offline fetch retains last known lanes', () => {
 const previous = {lanes:[{id:'last-known'}]};
 assert.equal(retain(previous, null), previous);
});
