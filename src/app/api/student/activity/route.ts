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

    const attempts = await prisma.exerciseAttempt.findMany({
      where: { userId: session.user.id },
      include: {
        exercise: {
          select: {
            question: true,
            knowledgePoint: {
              select: { title: true },
            },
          },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        question: attempt.exercise.question,
        knowledgePointTitle: attempt.exercise.knowledgePoint.title,
        assignment: attempt.assignment,
        answer: attempt.answer,
        isCorrect: attempt.isCorrect,
        xpEarned: attempt.xpEarned,
        coinsEarned: attempt.coinsEarned,
        timeSpent: attempt.timeSpent,
        createdAt: attempt.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching student activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
