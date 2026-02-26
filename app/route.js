import { getRedisClient } from '@/lib/redis';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const redis = await getRedisClient();
    const { action, email, password, name } = await request.json();
    
    // Get users list
    const rawData = await redis.get('users');
    const users = rawData ? JSON.parse(rawData) : [];

    if (action === 'signup') {
      if (users.find(u => u.email === email)) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { id: Date.now().toString(), email, password: hashedPassword, name: name || email };
      
      await redis.set('users', JSON.stringify([...users, newUser]));
      return NextResponse.json({ success: true, user: { name: newUser.name, email: newUser.email } });
    }

    if (action === 'login') {
      const user = users.find(u => u.email === email);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

      return NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
    }
  } catch (error) {
    console.error("Auth Error:", error);
    // This will help you see the EXACT error in your browser instead of "Connection failed"
    return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 });
  }
}