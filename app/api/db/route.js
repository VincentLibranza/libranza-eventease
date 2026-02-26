import { getRedisClient } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const redis = await getRedisClient();
    const events = await redis.get('events');
    const participants = await redis.get('participants');
    return NextResponse.json({ 
      events: events ? JSON.parse(events) : [], 
      participants: participants ? JSON.parse(participants) : [] 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const redis = await getRedisClient();
    const { events, participants } = await request.json();
    
    // Only update what is provided
    if (events) await redis.set('events', JSON.stringify(events));
    if (participants) await redis.set('participants', JSON.stringify(participants));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}