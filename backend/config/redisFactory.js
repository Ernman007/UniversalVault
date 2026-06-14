/**
 * Redis client factory module
 * Provides singleton Redis client with connection management and error handling
 */
const { createClient } = require("redis");
const logger = require("../utils/logger");

// Client instance and connection promise for singleton pattern
let clientInstance;
let connectPromise;

/**
 * Builds and configures a Redis client instance
 * Returns null if no Redis configuration is provided to avoid connection spam
 */
const buildRedisClient = () => {
  const url = process.env.REDIS_URL;
  if (!url && !process.env.REDIS_HOST) {
    return null; // No config = no Redis
  }

  if (url) {
    return createClient({ url });
  }

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;

  return createClient({
    socket: { host, port },
    ...(password ? { password } : {}),
  });
};

/**
 * Registers event listeners on the Redis client for connection lifecycle events
 * Logs connection status changes and errors for monitoring and debugging
 * @param {RedisClient} client - The Redis client instance to register listeners on
 */
const registerListeners = (client) => {
  client.on("connect", () => logger.info("Redis connection established"));
  client.on("ready", () => logger.debug("Redis client ready"));
  client.on("end", () => logger.warn("Redis connection closed"));
  client.on("reconnecting", () => logger.warn("Redis client reconnecting"));
  client.on("error", (error) =>
    logger.error("Redis client error", { error: error.message }),
  );
};

const getRedisClient = async () => {
  // If explicitly disabled (null instance), return null immediately
  if (clientInstance === null) return null;

  if (clientInstance?.isOpen) {
    return clientInstance;
  }

  if (!connectPromise) {
    clientInstance = buildRedisClient();

    // No config found → disable Redis entirely
    if (!clientInstance) {
      connectPromise = null;
      return null;
    }

    registerListeners(clientInstance);
    connectPromise = clientInstance.connect().catch((error) => {
      logger.warn("Redis connection failed — caching disabled", {
        error: error.message,
      });
      connectPromise = null;
      clientInstance = null; // Mark as unavailable
      return null;
    });
  }

  return await connectPromise;
};

/**
 * Disconnects the Redis client and cleans up resources
 * Resets the singleton instance and connection promise for proper cleanup
 * @returns {Promise<void>} Promise resolving when disconnect is complete
 */
const disconnectRedis = async () => {
  if (clientInstance?.isOpen) {
    await clientInstance.quit();
    clientInstance = undefined;
    connectPromise = null;
  }
};

module.exports = {
  getRedisClient,
  disconnectRedis,
};
