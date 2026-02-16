import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { getConfig } from '@/config/index.js';

let currentCacheSize = Math.max(0, getConfig().cacheSize);
function createCache(size: number) {
  return new LRUCache<string, string>({
    max: size > 0 ? size : 1,
  });
}

// Initialize cache with a safe fallback size if disabled.
// Actual enabling/disabling is handled in the read/write functions.
let cache = createCache(currentCacheSize);

function syncCacheSize() {
  const nextSize = Math.max(0, getConfig().cacheSize);
  if (nextSize === currentCacheSize) {
    return;
  }

  currentCacheSize = nextSize;
  cache = createCache(currentCacheSize);
}

/**
 * Generates a collision-resistant cache key from arguments.
 * Uses a null character separator to distinguish boundaries.
 */
function getCacheKey(args: any[]): string {
  const hash = crypto.createHash('sha1');
  for (const arg of args) {
    hash.update(String(arg));
    // Use a null character as a separator to prevent collisions
    // e.g. ["ab", "c"] vs ["a", "bc"]
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function readCache(args: any[]): string | null {
  syncCacheSize();
  if (currentCacheSize <= 0) {
    return null;
  }

  const key = getCacheKey(args);
  return cache.get(key) || null;
}

export function writeCache(result: string, args: any[]): void {
  syncCacheSize();
  if (currentCacheSize <= 0) {
    return;
  }

  const key = getCacheKey(args);
  cache.set(key, result);
}
