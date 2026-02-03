import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
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

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        xp: 0,
        coins: 0,
        level: 1,
        streak: 0,
      },
    });

    // Initialize progress for all available knowledge points (layer 0, no prerequisites)
    const availableKPs = await prisma.knowledgePoint.findMany({
      where: {
        layer: 0,
        prerequisites: { isEmpty: true },
      },
    });

    for (const kp of availableKPs) {
      await prisma.userProgress.create({
        data: {
          userId: user.id,
          knowledgePointId: kp.id,
          status: 'AVAILABLE',
        },
      });
    }

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