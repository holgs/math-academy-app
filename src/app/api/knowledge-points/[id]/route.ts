import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get knowledge point
    const kp = await prisma.knowledgePoint.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        layer: true,
        prerequisites: true,
        theoryContent: true,
        tipsContent: true,
        examplesContent: true,
      },
    });

    if (!kp) {
      return NextResponse.json({ error: 'Knowledge point not found' }, { status: 404 });
    }

    // Get user progress
    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_knowledgePointId: {
          userId: session.user.id,
          knowledgePointId: id,
        },
      },
    });

    const examples = await prisma.exercise.findMany({
      where: { knowledgePointId: id },
      select: {
        id: true,
        question: true,
        answer: true,
        hint: true,
        difficulty: true,
      },
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'desc' }],
      take: 12,
    });

    return NextResponse.json({
      ...kp,
      status: progress?.status || 'LOCKED',
      masteryLevel: progress?.masteryLevel || 0,
      importedTheory: Array.isArray(kp.theoryContent) ? kp.theoryContent : [],
      importedTips: Array.isArray(kp.tipsContent) ? kp.tipsContent : [],
      importedExamples: Array.isArray(kp.examplesContent) ? kp.examplesContent : [],
      examples,
    });
  } catch (error) {
    console.error('Error fetching knowledge point:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
