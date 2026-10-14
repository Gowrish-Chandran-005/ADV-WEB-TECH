import type { RequestHandler } from 'express';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface WindowState {
  count: number;
  expiresAt: number;
}

export function createRateLimit(
  { windowMs, maxRequests }: RateLimitOptions,
  now: () => number = Date.now,
): RequestHandler {
  const windows = new Map<string, WindowState>();
  let lastCleanup = 0;

  return (request, response, next) => {
    const currentTime = now();
    const key = request.ip || request.socket.remoteAddress || 'unknown';

    if (currentTime - lastCleanup >= windowMs) {
      for (const [address, window] of windows) {
        if (window.expiresAt <= currentTime) {
          windows.delete(address);
        }
      }
      lastCleanup = currentTime;
    }

    let window = windows.get(key);
    if (!window || window.expiresAt <= currentTime) {
      if (windows.size >= 10_000) {
        const oldestKey = windows.keys().next().value;
        if (oldestKey !== undefined) {
          windows.delete(oldestKey);
        }
      }
      window = { count: 0, expiresAt: currentTime + windowMs };
      windows.set(key, window);
    }

    window.count += 1;
    if (window.count > maxRequests) {
      response.setHeader('Retry-After', Math.max(1, Math.ceil((window.expiresAt - currentTime) / 1000)));
      response.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please try again later.',
        },
      });
      return;
    }

    next();
  };
}
