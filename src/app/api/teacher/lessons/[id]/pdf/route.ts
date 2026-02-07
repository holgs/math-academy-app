import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSimplePdfFromLines } from '@/lib/simple-pdf';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        knowledgePoint: {
          select: { title: true, description: true },
        },
        slides: {
          orderBy: { order: 'asc' },
          select: { title: true, type: true, content: true, order: true },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (lesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attempts = await prisma.exerciseAttempt.findMany({
      where: {
        exercise: {
          knowledgePointId: lesson.knowledgePointId,
        },
      },
      select: {
        isCorrect: true,
      },
    });

    const successPct = attempts.length > 0
      ? Math.round((attempts.filter((a) => a.isCorrect).length / attempts.length) * 100)
      : null;

    const lines: string[] = [];
    lines.push('MATH ACADEMY - LEZIONE LIM');
    lines.push('');
    lines.push(`Titolo: ${lesson.title}`);
    lines.push(`Argomento: ${lesson.knowledgePoint.title}`);
    lines.push(`Descrizione: ${lesson.description}`);
    lines.push(`Timer in classe (min): ${lesson.inClassTimerMinutes}`);
    lines.push(`Soglia passaggio fase (%): ${lesson.passThresholdPercent}`);
    lines.push(`Successo rilevato (%): ${lesson.lastSuccessPercent ?? successPct ?? 'n/d'}`);
    lines.push('');
    lines.push('TEORIA ED ESERCIZI DELLA LEZIONE');
    lines.push('');

    for (const slide of lesson.slides) {
      lines.push(`Slide ${slide.order + 1} - [${slide.type}] ${slide.title}`);
      const cleaned = slide.content
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const wrapped = cleaned.match(/.{1,95}(\s|$)/g) || [cleaned];
      for (const row of wrapped.slice(0, 8)) {
        lines.push(`  ${row.trim()}`);
      }
      lines.push('');
    }

    lines.push('SOLUZIONI / NOTE DOCENTE');
    lines.push('- Usare i passaggi step-by-step sulle slide example/exercise');
    lines.push('- Verificare la soglia di passaggio prima della fase successiva');
    lines.push('');
    lines.push(`Generato il: ${new Date().toLocaleString('it-IT')}`);

    const pdf = createSimplePdfFromLines(lines);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lesson-${lesson.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating lesson pdf:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
