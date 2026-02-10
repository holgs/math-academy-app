import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
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

async function requireTeacherOrAdmin() {
  const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
  if (!session?.user?.id) {
    return null;
  }
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

// GET /api/teacher/lessons/[id] - Get a specific lesson
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        knowledgePoint: {
          select: { title: true },
        },
        slides: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check ownership
    if (lesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/teacher/lessons/[id] - Update lesson (metrics and optional full content)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: { id: true, teacherId: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (lesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      title,
      description,
      knowledgePointId,
      slides,
      inClassTimerMinutes,
      passThresholdPercent,
      lastSuccessPercent,
    } = await request.json();

    const data: {
      title?: string;
      description?: string;
      knowledgePointId?: string;
      inClassTimerMinutes?: number;
      passThresholdPercent?: number;
      lastSuccessPercent?: number | null;
      slides?: {
        deleteMany: Record<string, never>;
        create: Array<{
          type: 'content' | 'example' | 'exercise' | 'summary';
          title: string;
          content: string;
          order: number;
        }>;
      };
    } = {};

    if (title !== undefined) {
      const value = String(title).trim();
      if (!value) {
        return NextResponse.json({ error: 'Titolo non valido' }, { status: 400 });
      }
      data.title = value.slice(0, 200);
    }

    if (description !== undefined) {
      data.description = String(description || '');
    }

    if (knowledgePointId !== undefined) {
      const kpId = String(knowledgePointId || '').trim();
      if (!kpId) {
        return NextResponse.json({ error: 'knowledgePointId non valido' }, { status: 400 });
      }
      const kp = await prisma.knowledgePoint.findUnique({
        where: { id: kpId },
        select: { id: true },
      });
      if (!kp) {
        return NextResponse.json({ error: 'Knowledge point not found' }, { status: 404 });
      }
      data.knowledgePointId = kpId;
    }

    if (slides !== undefined) {
      if (!Array.isArray(slides) || slides.length === 0) {
        return NextResponse.json({ error: 'Slides non valide' }, { status: 400 });
      }
      const preparedSlides = slides.map((slide: any, index: number) => ({
        type: normalizeSlideType(slide?.type),
        title: String(slide?.title || `Slide ${index + 1}`).slice(0, 200),
        content: sanitizeHtml(String(slide?.content || '')),
        order: index,
      }));
      data.slides = {
        deleteMany: {},
        create: preparedSlides,
      };
    }

    if (inClassTimerMinutes !== undefined) {
      const parsed = Number(inClassTimerMinutes);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 180) {
        return NextResponse.json({ error: 'Timer non valido' }, { status: 400 });
      }
      data.inClassTimerMinutes = parsed;
    }

    if (passThresholdPercent !== undefined) {
      const parsed = Number(passThresholdPercent);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        return NextResponse.json({ error: 'Soglia di passaggio non valida' }, { status: 400 });
      }
      data.passThresholdPercent = Math.round(parsed);
    }

    if (lastSuccessPercent !== undefined) {
      if (lastSuccessPercent === null || lastSuccessPercent === '') {
        data.lastSuccessPercent = null;
      } else {
        const parsed = Number(lastSuccessPercent);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
          return NextResponse.json({ error: 'Percentuale successo non valida' }, { status: 400 });
        }
        data.lastSuccessPercent = parsed;
      }
    }

    const updated = await prisma.lesson.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        knowledgePointId: true,
        inClassTimerMinutes: true,
        passThresholdPercent: true,
        lastSuccessPercent: true,
        slides: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            type: true,
            title: true,
            content: true,
            order: true,
          },
        },
      },
    });

    return NextResponse.json({ lesson: updated });
  } catch (error) {
    console.error('Error updating lesson metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teacher/lessons/[id] - Delete a lesson
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check ownership
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { teacherId: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (lesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.lesson.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
