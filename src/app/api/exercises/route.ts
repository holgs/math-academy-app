import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const knowledgePointId = searchParams.get('kp');

    if (!knowledgePointId) {
      return NextResponse.json(
        { error: 'Knowledge point ID required' },
        { status: 400 }
      );
    }

    // Check if user has access to this knowledge point
    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_knowledgePointId: {
          userId: session.user.id,
          knowledgePointId,
        },
      },
    });

    // Allow access if AVAILABLE, IN_PROGRESS, or MASTERED
    if (!progress || progress.status === 'LOCKED') {
      return NextResponse.json(
        { error: 'Knowledge point not available' },
        { status: 403 }
      );
    }

    // Get exercises for this knowledge point
    const exercises = await prisma.exercise.findMany({
      where: { knowledgePointId },
      orderBy: { difficulty: 'asc' },
      select: {
        id: true,
        question: true,
        difficulty: true,
        hint: true,
      },
    });

    // Get user's previous attempts
    const attempts = await prisma.exerciseAttempt.findMany({
      where: {
        userId: session.user.id,
        exercise: { knowledgePointId },
      },
      select: {
        exerciseId: true,
        isCorrect: true,
      },
    });

    const attemptedExerciseIds = new Set(
      attempts.filter(a => a.isCorrect).map(a => a.exerciseId)
    );

    // Mark exercises as completed
    const exercisesWithStatus = exercises.map(ex => ({
      ...ex,
      completed: attemptedExerciseIds.has(ex.id),
    }));

    return NextResponse.json({
      exercises: exercisesWithStatus,
      progress: {
        status: progress.status,
        masteryLevel: progress.masteryLevel,
      },
    });
  } catch (error) {
    console.error('Exercises fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
