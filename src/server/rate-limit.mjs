const DEFAULT_MAX_THROTTLE_KEYS = 10_000;

export function pruneExpiredThrottleEntries(map, now = Date.now()) {
  let removed = 0;
  for (const [key, entry] of map) {
    if (!entry || entry.until <= now) {
      map.delete(key);
      removed += 1;
    }
  }
  return removed;
}

export function fixedWindowAllow(
  map,
  key,
  windowMs,
  maxAttempts,
  { now = Date.now(), maxEntries = DEFAULT_MAX_THROTTLE_KEYS } = {},
) {
  pruneExpiredThrottleEntries(map, now);
  const entry = map.get(key);
  if (entry) {
    entry.count += 1;
    return entry.count <= maxAttempts;
  }

  if (map.size >= maxEntries) return false;
  map.set(key, { count: 1, until: now + windowMs });
  return true;
}
