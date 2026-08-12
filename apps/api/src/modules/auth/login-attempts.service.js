const MAX_FAILURES = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const attempts = new Map();

function attemptKey({ userId, ip = "unknown" }) {
  return `${String(userId)}:${ip}`;
}

export function getLoginLock({ userId, ip, now = Date.now() }) {
  const key = attemptKey({ userId, ip });
  const entry = attempts.get(key);
  if (!entry) return null;

  if (entry.lockedUntil > now) {
    return { retryAfterSeconds: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)) };
  }

  if (entry.windowStartedAt + ATTEMPT_WINDOW_MS <= now) {
    attempts.delete(key);
  }
  return null;
}

export function recordFailedLogin({ userId, ip, now = Date.now() }) {
  const key = attemptKey({ userId, ip });
  const current = attempts.get(key);
  const entry = !current || current.windowStartedAt + ATTEMPT_WINDOW_MS <= now
    ? { failures: 0, windowStartedAt: now, lockedUntil: 0 }
    : current;

  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCK_DURATION_MS;
  }
  attempts.set(key, entry);
  return getLoginLock({ userId, ip, now });
}

export function clearFailedLogins({ userId, ip }) {
  attempts.delete(attemptKey({ userId, ip }));
}

export function resetLoginAttemptsForTests() {
  attempts.clear();
}
