import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calculateXpReward } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { exerciseId, answer, timeSpent } = await req.json();

    // Get exercise
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { knowledgePoint: true },
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Check if correct
    const isCorrect = answer.trim().toLowerCase() === exercise.answer.trim().toLowerCase();

    // Count previous attempts
    const previousAttempts = await prisma.exerciseAttempt.count({
      where: {
        userId: session.user.id,
        exerciseId,
      },
    });

    const attemptNumber = previousAttempts + 1;

    // Calculate rewards
    const timeBonus = timeSpent < 60; // Bonus if answered in under 60 seconds
    const { xp, coins } = isCorrect
      ? calculateXpReward(exercise.difficulty, attemptNumber, timeBonus)
      : { xp: 0, coins: 0 };

    // Create attempt record
    await prisma.exerciseAttempt.create({
      data: {
        userId: session.user.id,
        exerciseId,
        answer,
        isCorrect,
        xpEarned: xp,
        coinsEarned: coins,
        timeSpent,
      },
    });

    // Update user stats if correct
    if (isCorrect) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          xp: { increment: xp },
          coins: { increment: coins },
        },
      });

      // Update progress
      const progress = await prisma.userProgress.findUnique({
        where: {
          userId_knowledgePointId: {
            userId: session.user.id,
            knowledgePointId: exercise.knowledgePointId,
          },
        },
      });

      if (progress) {
        // Calculate new mastery level
        const attempts = await prisma.exerciseAttempt.findMany({
          where: {
            userId: session.user.id,
            exercise: { knowledgePointId: exercise.knowledgePointId },
            isCorrect: true,
          },
        });

        const uniqueExercises = new Set(attempts.map(a => a.exerciseId)).size;
        const totalExercises = await prisma.exercise.count({
          where: { knowledgePointId: exercise.knowledgePointId },
        });

        const masteryLevel = totalExercises > 0 
          ? Math.min(100, (uniqueExercises / totalExercises) * 100)
          : 0;

        const newStatus = masteryLevel >= 80 ? 'MASTERED' : 'IN_PROGRESS';

        await prisma.userProgress.update({
          where: { id: progress.id },
          data: {
            status: newStatus,
            masteryLevel,
            lastPracticed: new Date(),
          },
        });

        // Unlock next nodes if mastered
        if (newStatus === 'MASTERED') {
          await unlockNextNodes(session.user.id, exercise.knowledgePointId);
        }
      }
    }

    return NextResponse.json({
      isCorrect,
      correctAnswer: exercise.answer,
      hint: !isCorrect ? exercise.hint : null,
      xpEarned: xp,
      coinsEarned: coins,
      attemptNumber,
    });
  } catch (error) {
    console.error('Exercise submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function unlockNextNodes(userId: string, masteredKpId: string) {
  // Find all nodes that have this one as prerequisite
  const nextNodes = await prisma.knowledgePoint.findMany({
    where: {
      prerequisites: { has: masteredKpId },
    },
  });

  for (const node of nextNodes) {
    // Check if all prerequisites are mastered
    const prereqProgress = await prisma.userProgress.findMany({
      where: {
        userId,
        knowledgePointId: { in: node.prerequisites },
      },
    });

    const allMastered = node.prerequisites.every(prereqId =>
      prereqProgress.some(p => p.knowledgePointId === prereqId && p.status === 'MASTERED')
    );

    if (allMastered) {
      // Check if progress already exists
      const existing = await prisma.userProgress.findUnique({
        where: {
          userId_knowledgePointId: {
            userId,
            knowledgePointId: node.id,
          },
        },
      });

      if (!existing) {
        await prisma.userProgress.create({
          data: {
            userId,
            knowledgePointId: node.id,
            status: 'AVAILABLE',
          },
        });
      } else if (existing.status === 'LOCKED') {
        await prisma.userProgress.update({
          where: { id: existing.id },
          data: { status: 'AVAILABLE' },
        });
      }
    }
  }
}