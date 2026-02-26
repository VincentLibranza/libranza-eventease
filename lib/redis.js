import { createClient } from 'redis';

const url = process.env.KV_URL || process.env.REDIS_URL;

const globalForRedis = global;

export const getRedisClient = async () => {
  if (!url) {
    throw new Error("REDIS_URL or KV_URL is missing in environment variables.");
  }

  if (globalForRedis.redisClient?.isOpen) {
    return globalForRedis.redisClient;
  }

  const client = createClient({ url });

  client.on('error', (err) => console.error('Redis Client Error', err));

  if (!client.isOpen) {
    await client.connect();
  }

  if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redisClient = client;
  }
  
  return client;
};