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

    return NextResponse.json({
      ...kp,
      status: progress?.status || 'LOCKED',
      masteryLevel: progress?.masteryLevel || 0,
    });
  } catch (error) {
    console.error('Error fetching knowledge point:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
