import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // If no userId provided, return empty arrays
  if (!userId) return NextResponse.json({ events: [], participants: [] });

  // Get data specifically for this user
  const events = await redis.get(`events:${userId}`) || [];
  const participants = await redis.get(`participants:${userId}`) || [];

  return NextResponse.json({ events, participants });
}

export async function POST(request) {
  const { userId, events, participants } = await request.json();

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Save to user-specific keys
  if (events) await redis.set(`events:${userId}`, events);
  if (participants) await redis.set(`participants:${userId}`, participants);

  return NextResponse.json({ success: true });
}