import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { llmService } from '@/lib/llm-service';
import { NextResponse } from 'next/server';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';

type SlideType = 'content' | 'example' | 'exercise' | 'summary';
type Provider = 'openai' | 'google' | 'glm';

type NormalizedSlide = {
  type: SlideType;
  title: string;
  content: string;
};

type LessonContext = {
  id: string;
  title: string;
  description: string;
  layer: number;
  theoryContent: unknown;
  tipsContent: unknown;
};

type ExerciseSeed = {
  question: string;
  answer: string;
  hint: string | null;
  difficulty: number;
};

type StructuredSlide = {
  type: SlideType;
  title: string;
  learningObjective: string;
  explanation: string[];
  workedExample?: {
    problem: string;
    steps: string[];
    result: string;
  };
  classExercise?: {
    prompt: string;
    timerMinutes: number;
    hints?: string[];
  };
  solutionSteps?: string[];
  commonMistakes?: string[];
  quickCheck?: string;
};

type GeneratedLessonPayload = {
  lessonTitle?: string;
  lessonDescription?: string;
  slides: StructuredSlide[];
};

const GLM_ENDPOINTS = [
  {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air'],
  },
  {
    url: 'https://api.z.ai/api/paas/v4/chat/completions',
    models: ['glm-4.5-flash', 'glm-4.5', 'glm-4.7'],
  },
  {
    url: 'https://api.z.ai/v1/chat/completions',
    models: ['glm-4.5-flash', 'glm-4.7'],
  },
] as const;

const REQUIRED_SLIDE_ORDER: SlideType[] = ['content', 'content', 'example', 'exercise', 'example', 'summary'];

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
    const limit = rateLimit(`lesson-generate:${session.user.id}:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many generation requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const { knowledgePointId, useAI, provider, apiKey, model } = await req.json();
    if (!knowledgePointId) {
      return NextResponse.json({ error: 'Knowledge point ID required' }, { status: 400 });
    }

    if (useAI && typeof provider === 'string' && typeof apiKey === 'string' && apiKey.trim()) {
      if (provider === 'openai' || provider === 'google' || provider === 'glm') {
        llmService.setConfig({
          provider,
          apiKey: apiKey.trim(),
          model: typeof model === 'string' && model.trim() ? model.trim() : undefined,
        });
      }
    }

    const kp = await prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
      select: {
        id: true,
        title: true,
        description: true,
        layer: true,
        theoryContent: true,
        tipsContent: true,
      },
    });
    if (!kp) {
      return NextResponse.json({ error: 'Knowledge point not found' }, { status: 404 });
    }

    const exercises = await prisma.exercise.findMany({
      where: { knowledgePointId },
      select: { question: true, answer: true, hint: true, difficulty: true },
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'desc' }],
      take: 12,
    });

    let title = `Lezione: ${kp.title}`;
    let description = kp.description;
    let slides: NormalizedSlide[] = [];

    if (useAI) {
      const hasLLM =
        llmService.isConfigured('openai') ||
        llmService.isConfigured('google') ||
        llmService.isConfigured('glm');

      if (hasLLM) {
        const preferredProvider = provider === 'openai' || provider === 'google' || provider === 'glm'
          ? provider
          : null;
        const selectedProvider: Provider = preferredProvider && llmService.isConfigured(preferredProvider)
          ? preferredProvider
          : llmService.isConfigured('openai')
            ? 'openai'
            : llmService.isConfigured('google')
              ? 'google'
              : 'glm';

        const generated = await generateWithAI(kp, exercises, selectedProvider);
        if (generated) {
          title = generated.lessonTitle?.trim() || title;
          description = generated.lessonDescription?.trim() || description;
          slides = normalizeGeneratedSlides(generated, kp, exercises);
        }
      }
    }

    if (!slides.length) {
      slides = generateDeterministicSlides(kp, exercises);
    }

    return NextResponse.json({
      title,
      description,
      slides,
    });
  } catch (error) {
    console.error('Error generating lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildLessonPrompt(kp: LessonContext, exercises: ExerciseSeed[]) {
  const theoryBlocks = asStringList(kp.theoryContent).slice(0, 4);
  const tips = asStringList(kp.tipsContent).slice(0, 4);
  const exPool = exercises.slice(0, 4).map((ex, idx) => ({
    n: idx + 1,
    question: ex.question,
    answer: ex.answer,
    hint: ex.hint || '',
    difficulty: ex.difficulty,
  }));

  return `Sei un docente di matematica che prepara una lezione LIM ad alto contenuto didattico.

OBIETTIVO: creare una lezione operativa, NON generica, con esempi numerici svolti e consegna concreta.

Contesto:
- Argomento: ${kp.title}
- Descrizione: ${kp.description}
- Livello: ${kp.layer + 1}
- Teoria disponibile: ${theoryBlocks.length ? theoryBlocks.join(' | ') : 'nessuna'}
- Suggerimenti disponibili: ${tips.length ? tips.join(' | ') : 'nessuno'}
- Esercizi già presenti nel topic: ${JSON.stringify(exPool)}

REGOLE OBBLIGATORIE:
1) Devi produrre esattamente 6 slide nell'ordine:
   content, content, example, exercise, example, summary
2) Ogni slide deve avere contenuto concreto; vietato usare placeholder, frasi vuote o meta-commenti.
3) Usa formule in KaTeX con delimitatori $...$ o $$...$$ quando utile.
4) La slide "exercise" deve includere una consegna completa e timer 10 minuti.
5) La slide "example" successiva deve contenere la soluzione passo-passo della consegna.
6) Campo "explanation" con almeno 3 punti per ogni slide.

OUTPUT: restituisci SOLO JSON valido con questo schema:
{
  "lessonTitle": "string",
  "lessonDescription": "string",
  "slides": [
    {
      "type": "content|example|exercise|summary",
      "title": "string",
      "learningObjective": "string",
      "explanation": ["string", "string", "string"],
      "workedExample": {
        "problem": "string",
        "steps": ["string", "string", "string"],
        "result": "string"
      },
      "classExercise": {
        "prompt": "string",
        "timerMinutes": 10,
        "hints": ["string", "string"]
      },
      "solutionSteps": ["string", "string", "string"],
      "commonMistakes": ["string", "string"],
      "quickCheck": "string"
    }
  ]
}

Nota:
- Compila solo i campi pertinenti al tipo slide.
- Non aggiungere testo fuori dal JSON.`;
}

async function generateWithAI(
  kp: LessonContext,
  exercises: ExerciseSeed[],
  provider: Provider
): Promise<GeneratedLessonPayload | null> {
  const prompt = buildLessonPrompt(kp, exercises);

  try {
    let content = '';

    if (provider === 'openai') {
      const config = llmService.getConfig('openai');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config?.apiKey}`,
        },
        body: JSON.stringify({
          model: config?.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Generi solo JSON valido, senza testo extra.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 2600,
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAI ${response.status}: ${errorSnippet(body)}`);
      }
      const data = await response.json();
      content = extractChatContent(data);
    } else if (provider === 'google') {
      const config = llmService.getConfig('google');
      const model = config?.model || 'gemini-2.0-flash-exp';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${config?.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 2600 },
          }),
        }
      );
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google ${response.status}: ${errorSnippet(body)}`);
      }
      const data = await response.json();
      content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const config = llmService.getConfig('glm');
      if (!config?.apiKey) {
        throw new Error('GLM non configurato');
      }
      content = await callGlmForLesson(prompt, config.apiKey, config.model);
    }

    const payload = extractLessonPayload(content);
    if (!payload || !Array.isArray(payload.slides) || payload.slides.length === 0) {
      throw new Error('Payload lezione non valido');
    }
    return payload;
  } catch (error) {
    console.error('AI generation failed, using deterministic fallback:', error);
    return null;
  }
}

async function callGlmForLesson(prompt: string, apiKey: string, model?: string) {
  const errors: string[] = [];
  let sawInsufficientBalance = false;

  for (const endpoint of GLM_ENDPOINTS) {
    const candidates = new Set<string>();
    if (model && model.trim()) {
      candidates.add(model.trim());
    }
    endpoint.models.forEach((m) => candidates.add(m));

    for (const candidateModel of Array.from(candidates)) {
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: candidateModel,
            messages: [
              { role: 'system', content: 'Generi solo JSON valido, senza testo extra.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            max_tokens: 2600,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          if (response.status === 429 || body.includes('"code":"1113"')) {
            sawInsufficientBalance = true;
          }
          errors.push(`${endpoint.url} [${candidateModel}] -> ${response.status} (${errorSnippet(body)})`);
          continue;
        }

        const data = await response.json();
        const content = extractChatContent(data);
        if (content) {
          return content;
        }
        errors.push(`${endpoint.url} [${candidateModel}] -> empty response`);
      } catch (error: any) {
        errors.push(`${endpoint.url} [${candidateModel}] -> ${error?.message || 'network error'}`);
      }
    }
  }

  if (sawInsufficientBalance) {
    throw new Error('GLM account without available credits/resources (code 1113)');
  }
  throw new Error(`GLM API error: ${errors.join(' | ')}`);
}

function normalizeGeneratedSlides(
  payload: GeneratedLessonPayload,
  kp: LessonContext,
  exercises: ExerciseSeed[]
): NormalizedSlide[] {
  const deterministic = generateDeterministicSlides(kp, exercises);
  const byTypeFallback = new Map<SlideType, NormalizedSlide>();
  deterministic.forEach((slide) => {
    if (!byTypeFallback.has(slide.type)) {
      byTypeFallback.set(slide.type, slide);
    }
  });

  const slides = payload.slides.slice(0, 8).map((slide, index) => {
    const type = normalizeSlideType(slide.type);
    const fallback = byTypeFallback.get(type) || deterministic[Math.min(index, deterministic.length - 1)];
    const title = safeText(slide.title) || fallback.title;
    const content = structuredSlideToHtml(slide, fallback.content);
    return { type, title, content };
  });

  // enforce minimum lesson structure
  while (slides.length < REQUIRED_SLIDE_ORDER.length) {
    slides.push(deterministic[slides.length]);
  }
  for (let i = 0; i < REQUIRED_SLIDE_ORDER.length; i += 1) {
    if (!slides[i]) {
      slides[i] = deterministic[i];
      continue;
    }
    if (slides[i].type !== REQUIRED_SLIDE_ORDER[i]) {
      const fallback = deterministic[i];
      slides[i] = {
        type: REQUIRED_SLIDE_ORDER[i],
        title: slides[i].title || fallback.title,
        content: slides[i].content || fallback.content,
      };
    }
  }
  return slides.slice(0, 8);
}

function structuredSlideToHtml(slide: StructuredSlide, fallbackContent: string) {
  const explanation = asCleanList(slide.explanation, 2);
  const mistakes = asCleanList(slide.commonMistakes, 1);
  const solutionSteps = asCleanList(slide.solutionSteps, 2);
  const exampleSteps = asCleanList(slide.workedExample?.steps, 2);
  const exerciseHints = asCleanList(slide.classExercise?.hints, 1);

  const blocks: string[] = [];
  if (safeText(slide.learningObjective)) {
    blocks.push(`<p><b>Obiettivo:</b> ${escapeHtml(safeText(slide.learningObjective))}</p>`);
  }
  if (explanation.length) {
    blocks.push(`<ul>${explanation.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`);
  }
  if (safeText(slide.workedExample?.problem)) {
    blocks.push(`<p><b>Esempio:</b> ${escapeHtml(safeText(slide.workedExample?.problem))}</p>`);
  }
  if (exampleSteps.length) {
    blocks.push(`<ol>${exampleSteps.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol>`);
  }
  if (safeText(slide.workedExample?.result)) {
    blocks.push(`<p><b>Risultato esempio:</b> ${escapeHtml(safeText(slide.workedExample?.result))}</p>`);
  }
  if (safeText(slide.classExercise?.prompt)) {
    blocks.push(`<p><b>Consegna:</b> ${escapeHtml(safeText(slide.classExercise?.prompt))}</p>`);
    const timer = Number(slide.classExercise?.timerMinutes) || 10;
    blocks.push(`<p><b>Tempo suggerito: ${timer} minuti</b></p>`);
  }
  if (exerciseHints.length) {
    blocks.push(`<ul>${exerciseHints.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`);
  }
  if (solutionSteps.length) {
    blocks.push(`<ol>${solutionSteps.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol>`);
  }
  if (mistakes.length) {
    blocks.push(`<p><b>Errori comuni:</b></p><ul>${mistakes.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`);
  }
  if (safeText(slide.quickCheck)) {
    blocks.push(`<p><b>Quick check:</b> ${escapeHtml(safeText(slide.quickCheck))}</p>`);
  }

  const html = blocks.join('\n').trim();
  return html.length >= 140 ? html : fallbackContent;
}

function extractLessonPayload(content: string): GeneratedLessonPayload | null {
  if (!content || typeof content !== 'string') return null;

  const direct = safeJsonParse(content);
  if (isLessonPayload(direct)) return direct;

  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const fromMatch = safeJsonParse(match[0]);
  if (isLessonPayload(fromMatch)) return fromMatch;

  return null;
}

function isLessonPayload(value: unknown): value is GeneratedLessonPayload {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray((value as any).slides);
}

function normalizeSlideType(type: unknown): SlideType {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized === 'content' || normalized === 'example' || normalized === 'exercise' || normalized === 'summary') {
    return normalized;
  }
  return 'content';
}

function generateDeterministicSlides(kp: LessonContext, exercises: ExerciseSeed[]): NormalizedSlide[] {
  const theory = asStringList(kp.theoryContent).slice(0, 3);
  const tips = asStringList(kp.tipsContent).slice(0, 3);
  const ex1 = exercises[0];
  const ex2 = exercises[1] || exercises[0];

  const theoryList = theory.length
    ? theory.map((line) => `<li>${escapeHtml(line)}</li>`).join('')
    : `<li>${escapeHtml(kp.description)}</li><li>Regola operativa centrale dell'argomento.</li><li>Collegamento con prerequisiti del livello ${kp.layer + 1}.</li>`;

  const tipsList = tips.length
    ? tips.map((line) => `<li>${escapeHtml(line)}</li>`).join('')
    : '<li>Scrivi i passaggi in ordine.</li><li>Controlla i segni e le operazioni.</li><li>Verifica il risultato con sostituzione inversa.</li>';

  const ex1Question = ex1?.question || `Proponi un esempio guidato su ${kp.title} con passaggi espliciti.`;
  const ex1Answer = ex1?.answer || 'Risultato determinato con la regola principale.';
  const ex2Question = ex2?.question || `Svolgi un esercizio in classe su ${kp.title}.`;
  const ex2Answer = ex2?.answer || 'Soluzione da completare seguendo i passaggi della lezione.';
  const ex2Hint = ex2?.hint || 'Usa il procedimento mostrato nell\'esempio guidato.';

  return [
    {
      type: 'content',
      title: `${kp.title} - Obiettivo atomico`,
      content: `<p><b>Obiettivo didattico:</b> padroneggiare ${escapeHtml(kp.title)} in modo operativo.</p>
<ul>${theoryList}</ul>
<p>Al termine della lezione lo studente deve saper risolvere esercizi analoghi in autonomia.</p>`,
    },
    {
      type: 'content',
      title: 'Definizione e regole operative',
      content: `<p><b>Definizione essenziale:</b> ${escapeHtml(kp.description)}</p>
<ul>${tipsList}</ul>
<p><b>Check rapido:</b> individua quale regola si applica prima di calcolare.</p>`,
    },
    {
      type: 'example',
      title: 'Esempio guidato atomizzato',
      content: `<p><b>Problema:</b> ${escapeHtml(ex1Question)}</p>
<ol>
  <li>Leggi il testo e identifica i dati.</li>
  <li>Seleziona la regola corretta e scrivila in simboli.</li>
  <li>Esegui i passaggi nell'ordine corretto.</li>
  <li>Verifica il risultato finale.</li>
</ol>
<p><b>Risultato:</b> ${escapeHtml(ex1Answer)}</p>`,
    },
    {
      type: 'exercise',
      title: 'Esercizio in classe (quaderno)',
      content: `<p><b>Consegna:</b> ${escapeHtml(ex2Question)}</p>
<p><b>Tempo suggerito: 10 minuti</b></p>
<ul>
  <li>scrivi tutti i passaggi sul quaderno</li>
  <li>evidenzia la regola utilizzata</li>
  <li>confronta la soluzione con un compagno</li>
</ul>
<p><b>Aiuto:</b> ${escapeHtml(ex2Hint)}</p>`,
    },
    {
      type: 'example',
      title: "Soluzione dell'esercizio in classe",
      content: `<p><b>Correzione guidata:</b></p>
<ol>
  <li>Riformula il problema con i dati in evidenza.</li>
  <li>Applica la regola in forma ordinata.</li>
  <li>Controlla eventuali errori di calcolo.</li>
  <li>Conferma il risultato finale.</li>
</ol>
<p><b>Risposta attesa:</b> ${escapeHtml(ex2Answer)}</p>`,
    },
    {
      type: 'summary',
      title: 'Riepilogo e criterio passaggio',
      content: `<p><b>Riepilogo:</b> abbiamo consolidato ${escapeHtml(kp.title)} con spiegazione, esempio e pratica.</p>
<ul>
  <li>riconoscere quando usare la regola</li>
  <li>eseguire i passaggi senza salti</li>
  <li>verificare il risultato ottenuto</li>
</ul>
<p>Passaggio alla fase successiva quando la percentuale di successo supera la soglia impostata dal docente.</p>`,
    },
  ];
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function asCleanList(value: unknown, minLen = 1): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter((line) => line.length >= minLen);
}

function safeText(value: unknown): string {
  return String(value || '').trim();
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorSnippet(raw: string, max = 160) {
  const compact = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!compact) return 'no-body';
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function extractChatContent(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content;
  }
  if (Array.isArray(content)) {
    const text = content
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
    if (text) return text;
  }
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }
  return '';
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
