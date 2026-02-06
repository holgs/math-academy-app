import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { llmService } from '@/lib/llm-service';
import { sanitizeHtml } from '@/lib/sanitize-html';

const VALID_SLIDE_TYPES = new Set(['content', 'example', 'exercise', 'summary']);

function normalizeSlideType(type: unknown): 'content' | 'example' | 'exercise' | 'summary' {
  if (typeof type !== 'string') {
    return 'content';
  }
  const normalized = type.toLowerCase().trim();
  if (VALID_SLIDE_TYPES.has(normalized)) {
    return normalized as 'content' | 'example' | 'exercise' | 'summary';
  }
  return 'content';
}

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

    const kp = await prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
      select: { id: true },
    });
    if (!kp) {
      return NextResponse.json({ error: 'Knowledge point not found' }, { status: 404 });
    }

    const preparedSlides = Array.isArray(slides)
      ? slides.map((slide: any, index: number) => ({
          type: normalizeSlideType(slide?.type),
          title: String(slide?.title || `Slide ${index + 1}`).slice(0, 200),
          content: sanitizeHtml(String(slide?.content || '')),
          order: index,
        }))
      : [];

    const lesson = await prisma.lesson.create({
      data: {
        title: String(title).slice(0, 200),
        description: String(description || ''),
        knowledgePointId,
        teacherId: session.user.id,
        slides: {
          create: preparedSlides,
        },
      },
      include: {
        slides: true,
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}
