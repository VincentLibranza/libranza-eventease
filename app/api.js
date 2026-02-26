import { getRedisClient } from '@/lib/redis';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const redis = await getRedisClient();
    const { action, email, password, name } = await request.json();
    
    // Safety check for inputs
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const rawUsers = await redis.get('users');
    const users = rawUsers ? JSON.parse(rawUsers) : [];

    if (action === 'signup') {
      if (users.find(u => u.email === email)) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      // Hash password (make sure you ran: npm install bcryptjs)
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { id: Date.now().toString(), email, password: hashedPassword, name: name || email };
      
      const updatedUsers = [...users, newUser];
      await redis.set('users', JSON.stringify(updatedUsers));
      
      return NextResponse.json({ success: true, user: { name: newUser.name, email: newUser.email } });
    }

    if (action === 'login') {
      const user = users.find(u => u.email === email);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
      }

      return NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
    }

  } catch (error) {
    console.error("Auth API Error:", error);
    // This sends the actual error message to your frontend instead of "Connection failed"
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}