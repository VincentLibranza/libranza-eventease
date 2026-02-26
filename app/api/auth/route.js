import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request) {
  const { action, email, password, name } = await request.json();
  const users = await redis.get('users') || [];

  if (action === 'signup') {
    if (users.find(u => u.email === email)) {
        return NextResponse.json({ error: "Account already exists" }, { status: 400 });
    }
    // Create new unique user
    const newUser = { id: Date.now().toString(), email, password, name };
    await redis.set('users', [...users, newUser]);
    return NextResponse.json({ user: newUser });
  } else {
    // Login
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    return NextResponse.json({ user });
  }
}