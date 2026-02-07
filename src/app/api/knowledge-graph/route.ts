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
    const mode = searchParams.get('mode');
    const parentId = searchParams.get('parentId');

    // Get all knowledge points
    const knowledgePoints = await prisma.knowledgePoint.findMany({
      select: {
        id: true,
        title: true,
        description: true,
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

    if (mode === 'progressive') {
      const points = knowledgePoints.filter((kp) => {
        if (!parentId) {
          return kp.prerequisites.length === 0;
        }
        return kp.prerequisites.includes(parentId);
      });

      const childrenSet = new Set<string>();
      for (const kp of knowledgePoints) {
        for (const prereq of kp.prerequisites) {
          childrenSet.add(prereq);
        }
      }

      return NextResponse.json({
        points: points
          .map((kp) => ({
            id: kp.id,
            title: kp.title,
            description: kp.description,
            layer: kp.layer,
            prerequisites: kp.prerequisites,
            status: progressMap.get(kp.id) || 'LOCKED',
            hasChildren: childrenSet.has(kp.id),
          }))
          .sort((a, b) => a.layer - b.layer || a.title.localeCompare(b.title)),
      });
    }

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
