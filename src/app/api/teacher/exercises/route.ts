import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';
import { sanitizeHtml } from '@/lib/sanitize-html';

function isValidDifficulty(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 4;
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

export async function GET(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const knowledgePointId = searchParams.get('knowledgePointId');

    const where = knowledgePointId ? { knowledgePointId } : undefined;

    const exercises = await prisma.exercise.findMany({
      where,
      include: {
        knowledgePoint: {
          select: { id: true, title: true, layer: true },
        },
      },
      orderBy: [{ knowledgePointId: 'asc' }, { difficulty: 'asc' }, { createdAt: 'desc' }],
      take: 300,
    });

    return NextResponse.json({ exercises });
  } catch (error) {
    console.error('Error fetching teacher exercises:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = rateLimit(`teacher-exercises-create:${session.user.id}:${ip}`, 40, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { knowledgePointId, question, answer, hint, difficulty } = await req.json();
    if (!knowledgePointId || !question || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedDifficulty = Number(difficulty ?? 2);
    if (!isValidDifficulty(parsedDifficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    }

    const kp = await prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
      select: { id: true },
    });
    if (!kp) {
      return NextResponse.json({ error: 'Knowledge point not found' }, { status: 404 });
    }

    const exercise = await prisma.exercise.create({
      data: {
        knowledgePointId,
        question: sanitizeHtml(String(question)),
        answer: String(answer).trim(),
        hint: hint ? sanitizeHtml(String(hint)) : null,
        difficulty: parsedDifficulty,
      },
      include: {
        knowledgePoint: {
          select: { id: true, title: true, layer: true },
        },
      },
    });

    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    console.error('Error creating exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, question, answer, hint, difficulty, knowledgePointId } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing exercise id' }, { status: 400 });
    }

    const data: {
      question?: string;
      answer?: string;
      hint?: string | null;
      difficulty?: number;
      knowledgePointId?: string;
    } = {};

    if (typeof question === 'string') {
      data.question = sanitizeHtml(question);
    }
    if (typeof answer === 'string') {
      data.answer = answer.trim();
    }
    if (typeof hint === 'string') {
      data.hint = sanitizeHtml(hint);
    }
    if (hint === null) {
      data.hint = null;
    }
    if (difficulty !== undefined) {
      const parsedDifficulty = Number(difficulty);
      if (!isValidDifficulty(parsedDifficulty)) {
        return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
      }
      data.difficulty = parsedDifficulty;
    }
    if (typeof knowledgePointId === 'string') {
      data.knowledgePointId = knowledgePointId;
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data,
      include: {
        knowledgePoint: {
          select: { id: true, title: true, layer: true },
        },
      },
    });

    return NextResponse.json({ exercise });
  } catch (error) {
    console.error('Error updating exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing exercise id' }, { status: 400 });
    }

    await prisma.exercise.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
