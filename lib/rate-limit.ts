import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

interface Limiter {
  limit(identifier: string): Promise<{ success: boolean }>;
}

/**
 * Sliding-window rate limiter for every guest-writable Server Action
 * (CLAUDE.md "Security defaults"). When Upstash isn't configured yet, this
 * fails open — allows the request, but logs loudly — rather than 500ing the
 * action on a missing env var. That's a real gap to close before launch
 * (BUILD_PHASES.md Phase 3), not a permanent design choice.
 */
export function createRateLimiter(
  prefix: string,
  limit: number,
  window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`,
): Limiter {
  if (!redis) {
    let warned = false;
    return {
      async limit() {
        if (!warned) {
          console.warn(
            `[rate-limit:${prefix}] UPSTASH_REDIS_REST_URL/TOKEN not set — requests are allowed unchecked.`,
          );
          warned = true;
        }
        return { success: true };
      },
    };
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `youlink:${prefix}`,
  });
}

// 5 attempts per 5 minutes per identity/IP — generous enough for a human
// mistyping an email, tight enough to blunt an email/OAuth spam bot.
export const authRateLimiter = createRateLimiter("auth", 5, "5 m");
