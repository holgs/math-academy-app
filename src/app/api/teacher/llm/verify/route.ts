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
    const verified = await llmService.verifyConnection(provider);

    const elapsedMs = Date.now() - startedAt;
    const effectiveConfig = llmService.getConfig(provider);

    return NextResponse.json({
      ok: true,
      provider,
      elapsedMs,
      model: effectiveConfig?.model || null,
      probe: verified.probe || null,
    });
  } catch (error: any) {
    console.error('LLM verify error:', error);
    const message = String(error?.message || 'Verifica LLM fallita');
    const normalized = message.toLowerCase();
    const mappedError = normalized.includes('code 1113') || normalized.includes('credito esaurito')
      ? 'Connessione GLM riuscita, ma credito insufficiente (code 1113). Ricarica il piano oppure usa OpenAI/Google.'
      : normalized.includes('code 1211') || normalized.includes('modello non disponibile')
        ? 'Modello GLM non disponibile per questa API key (code 1211). Prova un modello supportato dal tuo account.'
        : message;

    return NextResponse.json(
      {
        ok: false,
        error: mappedError,
      },
      { status: 500 }
    );
  }
}
