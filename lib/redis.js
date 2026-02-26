import { createClient } from 'redis';

const url = process.env.KV_URL || process.env.REDIS_URL;
let redisClient;

export const getRedisClient = async () => {
  if (redisClient?.isOpen) return redisClient;

  if (!url) throw new Error("Database URL is missing in .env.local");

  redisClient = createClient({ url });
  
  redisClient.on('error', (err) => console.error('Redis Error:', err));

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  
  return redisClient;
};