import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { llmService } from '@/lib/llm-service';

// GET /api/teacher/lessons - List all lessons for the teacher
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const lessons = await prisma.lesson.findMany({
      where: { teacherId: session.user.id },
      include: {
        knowledgePoint: {
          select: { title: true },
        },
        slides: {
          orderBy: { order: 'asc' },
          select: { id: true, type: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teacher/lessons - Create a new lesson
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, description, knowledgePointId, slides } = await req.json();

    if (!title || !knowledgePointId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description: description || '',
        knowledgePointId,
        teacherId: session.user.id,
        slides: {
          create: slides?.map((slide: any, index: number) => ({
            type: slide.type || 'content',
            title: slide.title || '',
            content: slide.content || '',
            order: index,
          })) || [],
        },
      },
      include: {
        slides: true,
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
