import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/teacher/students - Get all students with progress
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all students with their progress
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        streak: true,
        lastActivity: true,
        progress: {
          select: {
            masteryLevel: true,
            status: true,
          },
        },
      },
      orderBy: { xp: 'desc' },
    });

    // Calculate average mastery for each student
    const studentsWithMastery = students.map(student => {
      const avgMastery = student.progress.length > 0
        ? student.progress.reduce((sum, p) => sum + p.masteryLevel, 0) / student.progress.length
        : 0;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        xp: student.xp,
        level: student.level,
        streak: student.streak,
        lastActivity: student.lastActivity,
        masteryAvg: avgMastery,
      };
    });

    return NextResponse.json({ students: studentsWithMastery });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
