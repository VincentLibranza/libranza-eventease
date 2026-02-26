import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ events: [], participants: [] });

  // Load ONLY this user's data from Redis
  const events = await redis.get(`events:${userId}`) || [];
  const participants = await redis.get(`participants:${userId}`) || [];

  return NextResponse.json({ events, participants });
}

export async function POST(request) {
  const body = await request.json();
  const { userId, events, participants } = body;

  if (!userId) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

  // Save data into user-specific slots in Redis
  if (events) await redis.set(`events:${userId}`, events);
  if (participants) await redis.set(`participants:${userId}`, participants);

  return NextResponse.json({ success: true });
}