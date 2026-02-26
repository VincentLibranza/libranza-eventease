import { getRedisClient } from '@/lib/redis';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const redis = await getRedisClient();
    const { action, email, password, name } = await request.json();
    
    const rawUsers = await redis.get('users');
    const users = rawUsers ? JSON.parse(rawUsers) : [];

    if (action === 'signup') {
      if (users.find(u => u.email === email)) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { id: Date.now().toString(), email, password: hashedPassword, name };
      await redis.set('users', JSON.stringify([...users, newUser]));
      return NextResponse.json({ success: true, user: { name: newUser.name, email: newUser.email } });
    }

    if (action === 'login') {
      const user = users.find(u => u.email === email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      return NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Auth error' }, { status: 500 });
  }
}