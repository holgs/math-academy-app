import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeHtml } from '@/lib/sanitize-html';

type ImportedExercise = {
  question: string;
  answer: string;
  hint?: string;
  difficulty?: number;
};

type ImportedKnowledgeContent = {
  theory?: string[];
  tips?: string[];
  examples?: Array<{ title?: string; content?: string }>;
  exercises?: ImportedExercise[];
};

function parsePayload(payload: unknown): ImportedKnowledgeContent {
  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload JSON non valido');
  }
  return payload as ImportedKnowledgeContent;
}

function toDifficulty(value: unknown) {
  const d = Number(value ?? 2);
  if (!Number.isInteger(d) || d < 1 || d > 4) return 2;
  return d;
}

function cleanString(value: unknown) {
  return String(value || '').trim();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { knowledgePointId, payload } = await req.json();
    if (!knowledgePointId) {
      return NextResponse.json({ error: 'knowledgePointId obbligatorio' }, { status: 400 });
    }

    const kp = await prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
      select: { id: true },
    });
    if (!kp) {
      return NextResponse.json({ error: 'Knowledge point non trovato' }, { status: 404 });
    }

    const parsed = parsePayload(payload);

    const theory = Array.isArray(parsed.theory)
      ? parsed.theory.map((item) => sanitizeHtml(cleanString(item))).filter(Boolean)
      : [];
    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.map((item) => sanitizeHtml(cleanString(item))).filter(Boolean)
      : [];
    const examples = Array.isArray(parsed.examples)
      ? parsed.examples
          .map((item) => ({
            title: sanitizeHtml(cleanString(item?.title || 'Esempio')),
            content: sanitizeHtml(cleanString(item?.content || '')),
          }))
          .filter((item) => item.content)
      : [];

    const exercises = Array.isArray(parsed.exercises)
      ? parsed.exercises
          .map((item) => ({
            question: sanitizeHtml(cleanString(item?.question)),
            answer: cleanString(item?.answer),
            hint: sanitizeHtml(cleanString(item?.hint || '')),
            difficulty: toDifficulty(item?.difficulty),
          }))
          .filter((item) => item.question && item.answer)
      : [];

    if (exercises.length > 0) {
      await prisma.exercise.createMany({
        data: exercises.map((exercise) => ({
          knowledgePointId,
          question: exercise.question,
          answer: exercise.answer,
          hint: exercise.hint || null,
          difficulty: exercise.difficulty,
        })),
      });
    }

    await prisma.knowledgePoint.update({
      where: { id: knowledgePointId },
      data: {
        theoryContent: theory.length > 0 ? theory : undefined,
        tipsContent: tips.length > 0 ? tips : undefined,
        examplesContent: examples.length > 0 ? examples : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      imported: {
        theory: theory.length,
        tips: tips.length,
        examples: examples.length,
        exercises: exercises.length,
      },
    });
  } catch (error: any) {
    console.error('Error importing exercises JSON:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
