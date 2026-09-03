/**
 * Minimal in-memory rate limiter for auth endpoints.
 *
 * Deliberately dependency-free and per-process: it blunts credential stuffing
 * against a single instance. Running more than one instance means swapping this
 * for a shared store (Redis) or express-rate-limit.
 */
const buckets = new Map();

const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 10, message } = {}) => {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: message || "Too many requests. Please try again later.",
        retryAfter
      });
    }

    return next();
  };
};

// Keep the map from growing without bound on a long-running process.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  buckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  });
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

module.exports = { createRateLimiter };
