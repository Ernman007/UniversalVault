const crypto = require("crypto");
const { getRedisClient } = require("../config/redisFactory");
const logger = require("../utils/logger");

// ─── In-memory fallback cache ────────────────────────────────────────────────
const memoryStore = new Map();

const memoryGet = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const memorySet = (key, value, ttlSeconds = 60) => {
  memoryStore.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
};

const memoryDel = (key) => {
  memoryStore.delete(key);
};

const memoryDelByPrefix = (prefix) => {
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) memoryStore.delete(key);
  }
};

// ─── Redis availability detection ────────────────────────────────────────────
let redisAvailable = null; // null = not yet checked, true/false = determined
const REDIS_CHECK_TIMEOUT_MS = 3000;

const checkRedis = async () => {
  if (redisAvailable !== null) return redisAvailable;
  try {
    const client = await getRedisClient();
    if (!client) {
      redisAvailable = false;
      logger.info("Redis not configured — using in-memory cache");
      return false;
    }
    await Promise.race([
      client.ping(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Redis check timeout")),
          REDIS_CHECK_TIMEOUT_MS,
        ),
      ),
    ]);
    redisAvailable = true;
    logger.info("Redis is available — using Redis cache backend");
    return true;
  } catch (error) {
    redisAvailable = false;
    logger.warn("Redis unavailable — falling back to in-memory cache", {
      error: error.message,
    });
    return false;
  }
};

// Periodically re-check Redis availability (every 60s) so we can recover
// if Redis comes back online after starting without it.
const RECHECK_INTERVAL_MS = 60_000;
setInterval(() => {
  if (!redisAvailable) {
    redisAvailable = null; // reset so next call re-checks
  }
}, RECHECK_INTERVAL_MS);

// ─── Serialization helpers ───────────────────────────────────────────────────
const serialize = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    logger.error("Failed to serialize cache payload", { error: error.message });
    return null;
  }
};

const deserialize = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    logger.error("Failed to deserialize cache payload", {
      error: error.message,
    });
    return null;
  }
};

// ─── Key builders ────────────────────────────────────────────────────────────
const normalizeSegment = (segment) => {
  if (segment === null || segment === undefined) return "null";
  if (
    typeof segment === "string" ||
    typeof segment === "number" ||
    typeof segment === "boolean"
  )
    return String(segment);
  return serialize(segment) || "unserializable";
};

const hashSegments = (segments) => {
  if (!segments.length) return "root";
  const raw = segments.map((segment) => normalizeSegment(segment)).join("::");
  return crypto.createHash("sha1").update(raw).digest("hex");
};

const buildPrefix = (namespace, segment) =>
  `${namespace}:${normalizeSegment(segment ?? "global")}`;

const buildCacheKey = (namespace, segments = []) => {
  const normalized = Array.isArray(segments) ? segments : [segments];
  const [first, ...rest] = normalized;
  const prefix = buildPrefix(namespace, first);
  if (!rest.length) return prefix;
  return `${prefix}:${hashSegments(rest)}`;
};

// ─── Cache operations (Redis with in-memory fallback) ────────────────────────
const getCache = async (key) => {
  try {
    const available = await checkRedis();
    if (available) {
      const client = await getRedisClient();
      const value = await client.get(key);
      if (!value) {
        logger.debug(`Cache miss for key ${key}`);
        return null;
      }
      logger.debug(`Cache hit for key ${key}`);
      return deserialize(value);
    }
    logger.debug(`Cache miss (memory) for key ${key}`);
    return memoryGet(key);
  } catch (error) {
    logger.error("Cache get failed", { error: error.message, key });
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = 60) => {
  const payload = serialize(value);
  if (!payload) return;
  try {
    const available = await checkRedis();
    if (available) {
      const client = await getRedisClient();
      await client.set(key, payload, { EX: ttlSeconds });
      logger.debug(`Cache set for key ${key} (ttl=${ttlSeconds}s)`);
    } else {
      memorySet(key, value, ttlSeconds);
    }
  } catch (error) {
    logger.error("Cache set failed", { error: error.message, key });
  }
};

const fetchOrSet = async (namespace, segments, resolver, ttlSeconds = 60) => {
  const key = buildCacheKey(namespace, segments);
  const cached = await getCache(key);
  if (cached !== null) return { key, data: cached, hit: true };
  const data = await resolver();
  await setCache(key, data, ttlSeconds);
  return { key, data, hit: false };
};

const invalidateKeys = async (keys = []) => {
  if (!keys.length) return;
  try {
    const available = await checkRedis();
    if (available) {
      const client = await getRedisClient();
      for (const key of keys) await client.del(key);
      logger.debug(`Cache invalidated for keys: ${keys.join(", ")}`);
    } else {
      for (const key of keys) memoryDel(key);
    }
  } catch (error) {
    logger.error("Failed to invalidate cache keys", {
      error: error.message,
      keys,
    });
  }
};

const invalidateByPrefix = async (prefix) => {
  try {
    const available = await checkRedis();
    if (available) {
      const client = await getRedisClient();
      const keys = [];
      for await (const key of client.scanIterator({
        MATCH: `${prefix}*`,
        COUNT: 100,
      })) {
        if (key && typeof key === "string" && key.trim()) keys.push(key);
      }
      if (keys.length) {
        for (const key of keys) await client.del(key);
        logger.debug(
          `Cache invalidated for prefix ${prefix} (keys cleared: ${keys.length})`,
        );
      }
    } else {
      memoryDelByPrefix(prefix);
    }
  } catch (error) {
    logger.error("Failed to invalidate cache prefix", {
      error: error.message,
      prefix,
    });
  }
};

module.exports = {
  buildCacheKey,
  buildPrefix,
  fetchOrSet,
  invalidateByPrefix,
  invalidateKeys,
  getCache,
  setCache,
};
