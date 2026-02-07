import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireStudent() {
  const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
  if (!session?.user?.id) return null;
  if (session.user.role !== 'STUDENT') return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireStudent();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        nickname: true,
        image: true,
        avatarUrl: true,
        email: true,
      },
    });

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireStudent();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nickname, avatarUrl } = await req.json();

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        nickname: typeof nickname === 'string' ? nickname.trim().slice(0, 40) : undefined,
        avatarUrl: typeof avatarUrl === 'string' ? avatarUrl.trim().slice(0, 500) : undefined,
      },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('Error updating student profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
