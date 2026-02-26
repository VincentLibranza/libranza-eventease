import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { action, email, password, name } = await request.json();
    const users = await kv.get('users') || [];

    // --- SIGNUP LOGIC ---
    if (action === 'signup') {
      const exists = users.find(u => u.email === email);
      if (exists) return NextResponse.json({ error: 'User already exists' }, { status: 400 });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { id: Date.now().toString(), email, password: hashedPassword, name };
      
      const updatedUsers = [...users, newUser];
      await kv.set('users', updatedUsers);
      
      return NextResponse.json({ success: true, user: { name: newUser.name, email: newUser.email } });
    }

    // --- LOGIN LOGIC ---
    if (action === 'login') {
      const user = users.find(u => u.email === email);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

      return NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}