import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    if (!session?.user?.id) {
      return unauthorized();
    }
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const mode = searchParams.get('mode');

    if (mode === 'flat') {
      const points = await prisma.knowledgePoint.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          layer: true,
          prerequisites: true,
        },
        orderBy: [{ layer: 'asc' }, { title: 'asc' }],
      });

      return NextResponse.json({
        points: points.map((point) => ({
          ...point,
          depth: point.layer,
        })),
      });
    }

    const where = parentId
      ? { prerequisites: { has: parentId } }
      : { prerequisites: { isEmpty: true } };

    const points = await prisma.knowledgePoint.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        layer: true,
        prerequisites: true,
      },
      orderBy: [{ layer: 'asc' }, { title: 'asc' }],
    });

    const ids = points.map(p => p.id);
    const children = ids.length
      ? await prisma.knowledgePoint.findMany({
          where: {
            prerequisites: {
              hasSome: ids,
            },
          },
          select: {
            id: true,
            prerequisites: true,
          },
        })
      : [];

    const childSet = new Set<string>();
    for (const kp of children) {
      for (const prereqId of kp.prerequisites) {
        childSet.add(prereqId);
      }
    }

    return NextResponse.json({
      points: points.map(point => ({
        ...point,
        hasChildren: childSet.has(point.id),
      })),
    });
  } catch (error) {
    console.error('Error fetching progressive knowledge points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
