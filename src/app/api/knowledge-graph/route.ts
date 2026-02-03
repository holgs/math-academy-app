import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all knowledge points
    const knowledgePoints = await prisma.knowledgePoint.findMany({
      select: {
        id: true,
        title: true,
        layer: true,
        prerequisites: true,
      },
    });

    // Get user progress
    const userProgress = await prisma.userProgress.findMany({
      where: { userId: session.user.id },
      select: {
        knowledgePointId: true,
        status: true,
      },
    });

    // Create progress map
    const progressMap = new Map(
      userProgress.map(p => [p.knowledgePointId, p.status])
    );

    // Build nodes with status
    const nodes = knowledgePoints.map(kp => ({
      id: kp.id,
      title: kp.title,
      layer: kp.layer,
      status: progressMap.get(kp.id) || 'LOCKED',
    }));

    // Build links from prerequisites
    const links: { source: string; target: string }[] = [];
    knowledgePoints.forEach(kp => {
      kp.prerequisites.forEach(prereqId => {
        links.push({
          source: prereqId,
          target: kp.id,
        });
      });
    });

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error('Knowledge graph error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}