import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { llmService, type LLMProvider } from '@/lib/llm-service';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      provider,
      apiKey,
      model,
    }: {
      provider: LLMProvider;
      apiKey: string;
      model?: string;
    } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Provider e API key sono obbligatori' }, { status: 400 });
    }

    llmService.setConfig({
      provider,
      apiKey: apiKey.trim(),
      model: typeof model === 'string' && model.trim() ? model.trim() : undefined,
    });

    const startedAt = Date.now();

    const generated = await llmService.generateExercise(
      {
        id: 'verify.kp',
        title: 'Addizione di numeri interi',
        description: 'Somme e differenze con numeri interi',
        layer: 0,
        prerequisites: [],
        commonMistakes: [],
        realWorldApplications: [],
        tips: [],
      },
      provider,
      1
    );

    const elapsedMs = Date.now() - startedAt;

    return NextResponse.json({
      ok: true,
      provider,
      elapsedMs,
      sample: {
        question: generated.question,
        answer: generated.answer,
        hint: generated.hint,
        difficulty: generated.difficulty,
        pillarReference: generated.pillarReference || null,
      },
    });
  } catch (error: any) {
    console.error('LLM verify error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Verifica LLM fallita',
      },
      { status: 500 }
    );
  }
}
