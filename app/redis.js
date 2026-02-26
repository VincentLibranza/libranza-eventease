import { createClient } from 'redis';

let redisClient;

export async function getRedisClient() {
  // If we already have a client and it's connected, use it
  if (redisClient?.isOpen) {
    return redisClient;
  }

  // Use KV_URL (Vercel's default) or REDIS_URL
  const url = process.env.KV_URL || process.env.REDIS_URL;

  if (!url) {
    throw new Error("Redis URL is missing. Check your Vercel Environment Variables.");
  }

  redisClient = createClient({ url });

  redisClient.on('error', (err) => console.error('Redis Error:', err));

  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis Connection Failed:', err);
    throw err;
  }

  return redisClient;
}