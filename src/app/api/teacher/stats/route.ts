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

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalStudents,
      activeLessons,
      progressData,
      lessonsThisWeek,
      totalClasses,
      activeAssignments,
      assignmentTargets,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: 'STUDENT' },
      }),
      prisma.lesson.count({
        where: { teacherId: session.user.id },
      }),
      prisma.userProgress.aggregate({
        _avg: { masteryLevel: true },
      }),
      prisma.lesson.count({
        where: {
          teacherId: session.user.id,
          createdAt: { gte: weekAgo },
        },
      }),
      prisma.classroom.count({
        where: { teacherId: session.user.id },
      }),
      prisma.homeworkAssignment.count({
        where: {
          teacherId: session.user.id,
          dueDate: { gte: new Date() },
        },
      }),
      prisma.homeworkAssignmentTarget.findMany({
        where: {
          assignment: {
            teacherId: session.user.id,
          },
        },
        select: { progressPct: true },
      }),
    ]);

    const avgAssignmentProgress = assignmentTargets.length > 0
      ? assignmentTargets.reduce((sum, target) => sum + target.progressPct, 0) / assignmentTargets.length
      : 0;

    return NextResponse.json({
      stats: {
        totalStudents,
        activeLessons,
        avgMastery: Math.round(progressData._avg?.masteryLevel || 0),
        lessonsThisWeek,
        totalClasses,
        activeAssignments,
        avgAssignmentProgress: Math.round(avgAssignmentProgress),
      },
    });
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
