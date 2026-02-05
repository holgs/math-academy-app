import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/exercises/daily - Get daily exercises for spaced repetition
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Get new exercises from available/IN_PROGRESS knowledge points
    const availableKPs = await prisma.userProgress.findMany({
      where: {
        userId,
        status: { in: ['AVAILABLE', 'IN_PROGRESS'] },
      },
      select: { knowledgePointId: true },
      take: 3,
    });

    // 2. Get review exercises from MASTERED points (spaced repetition)
    const reviewKPs = await prisma.userProgress.findMany({
      where: {
        userId,
        status: 'MASTERED',
        lastPracticed: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Not practiced in last 24h
        },
      },
      select: { knowledgePointId: true },
      orderBy: { lastPracticed: 'asc' },
      take: 2,
    });

    // 3. Get exercises from these knowledge points
    const kpIds = [...availableKPs.map(k => k.knowledgePointId), ...reviewKPs.map(k => k.knowledgePointId)];

    const exercises = await prisma.exercise.findMany({
      where: {
        knowledgePointId: { in: kpIds },
      },
      include: {
        knowledgePoint: {
          select: { title: true },
        },
      },
      take: 10,
    });

    // 4. Get user's previous attempts to filter out completed ones
    const attempts = await prisma.exerciseAttempt.findMany({
      where: {
        userId,
        exerciseId: { in: exercises.map(e => e.id) },
      },
      select: {
        exerciseId: true,
        isCorrect: true,
      },
    });

    const attemptedMap = new Map(attempts.map(a => [a.exerciseId, a.isCorrect]));

    // 5. Mark exercises and prioritize
    const exercisesWithStatus = exercises.map(ex => ({
      ...ex,
      completed: attemptedMap.get(ex.id) || false,
      isReview: reviewKPs.some(k => k.knowledgePointId === ex.knowledgePointId),
    }));

    // Sort: new first, then reviews, then completed
    exercisesWithStatus.sort((a, b) => {
      if (a.completed === b.completed) {
        return a.isReview === b.isReview ? 0 : a.isReview ? 1 : -1;
      }
      return a.completed ? 1 : -1;
    });

    return NextResponse.json({
      exercises: exercisesWithStatus.slice(0, 5),
      stats: {
        newCount: availableKPs.length,
        reviewCount: reviewKPs.length,
      },
    });
  } catch (error) {
    console.error('Daily exercises fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
