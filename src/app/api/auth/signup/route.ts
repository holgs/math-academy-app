import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { initializeStudentProgress } from '@/lib/student-onboarding';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';

// Admin hardcoded
const ADMIN_EMAIL = 'holger.ferrero@gmail.com';

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req);
    const limit = rateLimit(`signup:${ip}`, 10, 15 * 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Retry later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine role: admin hardcoded
    const role = email.toLowerCase() === ADMIN_EMAIL ? 'ADMIN' : 'STUDENT';

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        xp: 0,
        coins: 0,
        level: 1,
        streak: 0,
      },
    });

    await initializeStudentProgress(user.id);

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
