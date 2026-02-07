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

    const targets = await prisma.homeworkAssignmentTarget.findMany({
      where: {
        studentId: session.user.id,
      },
      include: {
        assignment: {
          include: {
            knowledgePoint: {
              select: { id: true, title: true },
            },
            classroom: {
              select: { id: true, name: true },
            },
            _count: {
              select: { items: true },
            },
          },
        },
      },
      orderBy: {
        assignment: {
          dueDate: 'asc',
        },
      },
      take: 100,
    });

    const now = new Date();

    return NextResponse.json({
      assignments: targets.map((target) => {
        const dueDate = target.assignment.dueDate;
        const status = target.status === 'ASSIGNED' && dueDate < now
          ? 'OVERDUE'
          : target.status;

        return {
          id: target.assignment.id,
          targetId: target.id,
          title: target.assignment.title,
          description: target.assignment.description,
          dueDate,
          status,
          progressPct: target.progressPct,
          attemptCount: target.attemptCount,
          spacedLearningEnabled: target.assignment.spacedLearningEnabled,
          knowledgePoint: target.assignment.knowledgePoint,
          classroom: target.assignment.classroom,
          exercisesCount: target.assignment._count.items,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
