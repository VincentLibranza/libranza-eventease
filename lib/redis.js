import { Redis } from '@upstash/redis'

// Create the client
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Export it explicitly as 'redis' to match your imports
export const redis = redisClient;

// Optional: Also export a function version if you prefer, but the 'redis' export is what's needed for your current code
export function getRedisClient() {
  return redisClient;
}