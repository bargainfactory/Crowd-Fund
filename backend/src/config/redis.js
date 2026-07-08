const { createClient } = require('redis');

let redisClient;

const connectRedis = async () => {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
  });

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('Redis connected'));
  redisClient.on('reconnecting', () => console.log('Redis reconnecting...'));

  await redisClient.connect();
  return redisClient;
};

const getRedisClient = () => {
  if (!redisClient) throw new Error('Redis not initialized. Call connectRedis() first.');
  return redisClient;
};

// Cache helpers
const cache = {
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  async set(key, value, ttlSeconds = 3600) {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error('Redis set error:', err);
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.error('Redis del error:', err);
    }
  },

  async delPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) await redisClient.del(keys);
    } catch (err) {
      console.error('Redis delPattern error:', err);
    }
  }
};

module.exports = { connectRedis, getRedisClient, cache };
