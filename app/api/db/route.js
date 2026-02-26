import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ events: [], participants: [] });

    // Using the named export 'redis'
    const events = await redis.get(`events:${userId}`) || [];
    const participants = await redis.get(`participants:${userId}`) || [];

    return NextResponse.json({ events, participants });
  } catch (error) {
    console.error("DB GET Error:", error);
    return NextResponse.json({ events: [], participants: [] });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, events, participants } = body;

    if (!userId) return NextResponse.json({ error: "No UserID" }, { status: 400 });

    if (events) await redis.set(`events:${userId}`, events);
    if (participants) await redis.set(`participants:${userId}`, participants);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB POST Error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}