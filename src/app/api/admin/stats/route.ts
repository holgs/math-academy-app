import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [totalUsers, totalStudents, totalXp, masteredPoints] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.aggregate({ _sum: { xp: true } }),
    prisma.userProgress.count({ where: { status: 'MASTERED' } }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalStudents,
    totalXp: totalXp._sum.xp || 0,
    masteredPoints,
  });
}
