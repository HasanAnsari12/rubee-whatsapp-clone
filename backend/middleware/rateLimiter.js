// ==========================================================
// backend/middleware/rateLimiter.js
// In-memory rate limiter for sensitive authentication endpoints
// ==========================================================

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 15, // max requests per windowMs
  message = "Too many attempts from this IP, please try again after 15 minutes",
} = {}) => {
  const hits = new Map();

  // Periodically clean up expired entries to prevent memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 60000));

  // Ensure interval does not prevent Node process from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const rateLimiter = (req, res, next) => {
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      "unknown";

    const now = Date.now();
    let record = hits.get(clientIp);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({ message });
    }

    next();
  };

  rateLimiter.reset = () => hits.clear();
  rateLimiter.hits = hits;

  return rateLimiter;
};

// Default auth rate limiter (15 attempts per 15 minutes)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many authentication attempts. Please try again after 15 minutes.",
});

// AI requests rate limiter (30 requests per 5 minutes)
const aiLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: "Too many AI requests. Please wait a moment before sending more messages.",
});

module.exports = {
  createRateLimiter,
  authLimiter,
  aiLimiter,
};

