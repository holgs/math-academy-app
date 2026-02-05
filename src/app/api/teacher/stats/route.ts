import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/teacher/stats - Get teacher dashboard stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Count total students
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT' },
    });

    // Count active lessons
    const activeLessons = await prisma.lesson.count({
      where: { teacherId: session.user.id },
    });

    // Calculate average mastery across all students
    const progressData = await prisma.userProgress.aggregate({
      _avg: { masteryLevel: true },
    });

    // Count lessons created this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const lessonsThisWeek = await prisma.lesson.count({
      where: {
        teacherId: session.user.id,
        createdAt: { gte: weekAgo },
      },
    });

    return NextResponse.json({
      stats: {
        totalStudents,
        activeLessons,
        avgMastery: Math.round(progressData._avg?.masteryLevel || 0),
        lessonsThisWeek,
      },
    });
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
