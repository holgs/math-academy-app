import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, name, role, password } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        role,
        password: hashedPassword,
      },
      create: {
        email,
        name,
        role,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ message: 'User created/updated successfully', user: { email: user.email, role: user.role } });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
