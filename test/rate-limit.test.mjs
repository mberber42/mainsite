import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixedWindowAllow, pruneExpiredThrottleEntries } from '../src/server/rate-limit.mjs';

test('throttle cleanup evicts expired records and rate windows reset', () => {
  const attempts = new Map([
    ['expired', { count: 4, until: 99 }],
    ['active', { count: 1, until: 101 }],
  ]);

  assert.equal(pruneExpiredThrottleEntries(attempts, 100), 1);
  assert.deepEqual([...attempts.keys()], ['active']);
  assert.equal(fixedWindowAllow(attempts, 'active', 10, 2, { now: 100 }), true);
  assert.equal(fixedWindowAllow(attempts, 'active', 10, 2, { now: 100 }), false);
  assert.equal(fixedWindowAllow(attempts, 'active', 10, 2, { now: 101 }), true);
});

test('throttle map rejects new keys at finite capacity without evicting active limits', () => {
  const attempts = new Map();
  assert.equal(fixedWindowAllow(attempts, 'first', 100, 1, { now: 1, maxEntries: 2 }), true);
  assert.equal(fixedWindowAllow(attempts, 'second', 100, 1, { now: 2, maxEntries: 2 }), true);
  assert.equal(fixedWindowAllow(attempts, 'third', 100, 1, { now: 3, maxEntries: 2 }), false);
  assert.deepEqual([...attempts.keys()], ['first', 'second']);
  assert.equal(fixedWindowAllow(attempts, 'third', 100, 1, { now: 101, maxEntries: 2 }), true);
  assert.deepEqual([...attempts.keys()], ['second', 'third']);
});
