import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { llmService, TWELVE_PILLARS, type LLMProvider } from '@/lib/llm-service';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';

function fallbackExercise(title: string, difficulty: number, pillarName?: string) {
  return {
    question: `Risolvi un esercizio su "${title}" di difficoltà ${difficulty}.`,
    answer: '42',
    hint: pillarName
      ? `Applica il pilastro "${pillarName}" per scomporre il problema prima dei calcoli.`
      : 'Scomponi il problema in passaggi brevi prima di calcolare.',
    difficulty,
    type: 'open',
    explanation: `Parti dalla definizione di ${title}, identifica i dati e procedi in modo ordinato.`,
  };
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

    const ip = getRequestIp(req);
    const limit = rateLimit(`exercise-generate:${session.user.id}:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const {
      knowledgePointId,
      provider = 'openai',
      difficulty = 2,
      pillarId,
      useAI = true,
      apiKey,
      model,
    }: {
      knowledgePointId: string;
      provider?: LLMProvider;
      difficulty?: 1 | 2 | 3 | 4;
      pillarId?: string;
      useAI?: boolean;
      apiKey?: string;
      model?: string;
    } = await req.json();

    if (!knowledgePointId) {
      return NextResponse.json({ error: 'Knowledge point ID required' }, { status: 400 });
    }

    if (useAI && typeof apiKey === 'string' && apiKey.trim()) {
      llmService.setConfig({
        provider,
        apiKey: apiKey.trim(),
        model: typeof model === 'string' && model.trim() ? model.trim() : undefined,
      });
    }

    const kp = await prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
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

    const selectedPillar = pillarId ? TWELVE_PILLARS.find(p => p.id === pillarId) : undefined;

    if (useAI && llmService.isConfigured(provider)) {
      const generated = await llmService.generateExercise(
        {
          ...kp,
          commonMistakes: [],
          realWorldApplications: [],
          tips: [],
        },
        provider,
        difficulty,
        pillarId
      );

      return NextResponse.json({
        exercise: generated,
        provider,
        pillar: selectedPillar || null,
      });
    }

    return NextResponse.json({
      exercise: fallbackExercise(kp.title, difficulty, selectedPillar?.name),
      provider: null,
      pillar: selectedPillar || null,
      fallback: true,
    });
  } catch (error) {
    console.error('Error generating exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
