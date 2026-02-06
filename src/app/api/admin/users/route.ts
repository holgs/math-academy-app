import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';

const VALID_ROLES = new Set(['STUDENT', 'TEACHER', 'ADMIN']);

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const where = role && VALID_ROLES.has(role) ? { role: role as 'STUDENT' | 'TEACHER' | 'ADMIN' } : undefined;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      xp: true,
      level: true,
      coins: true,
      streak: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          lessons: true,
          attempts: true,
          progress: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getRequestIp(req);
  const limit = rateLimit(`admin-users-create:${session.user.id}:${ip}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { email, name, role, password } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase().trim(),
        name,
        role,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getRequestIp(req);
  const limit = rateLimit(`admin-users-update:${session.user.id}:${ip}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { id, email, name, role, password } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }
    if (role && !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const data: Record<string, string> = {};
    if (typeof name === 'string') {
      data.name = name.trim();
    }
    if (typeof email === 'string') {
      data.email = email.toLowerCase().trim();
    }
    if (typeof role === 'string') {
      data.role = role;
    }
    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password too short' }, { status: 400 });
      }
      data.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete current admin' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
