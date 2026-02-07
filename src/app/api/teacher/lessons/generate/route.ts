import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { llmService } from '@/lib/llm-service';
import { NextResponse } from 'next/server';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';

// POST /api/teacher/lessons/generate - Generate lesson content with AI
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

    // Get knowledge point details
    const kp = await prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
    });

    if (!kp) {
      return NextResponse.json({ error: 'Knowledge point not found' }, { status: 404 });
    }

    // Generate lesson content
    let slides;
    
    if (useAI) {
      // Check if LLM is configured
      const hasLLM = llmService.isConfigured('openai') || 
                     llmService.isConfigured('google') || 
                     llmService.isConfigured('glm');
      
      if (hasLLM) {
        // Use requested provider if configured, otherwise fallback to first available
        const preferredProvider = provider === 'openai' || provider === 'google' || provider === 'glm'
          ? provider
          : null;
        const selectedProvider = preferredProvider && llmService.isConfigured(preferredProvider)
          ? preferredProvider
          : llmService.isConfigured('openai')
            ? 'openai'
            : llmService.isConfigured('google')
              ? 'google'
              : 'glm';

        slides = await generateWithAI(kp, selectedProvider);
      } else {
        // Fallback to template-based generation
        slides = generateTemplateSlides(kp);
      }
    } else {
      // Template-based generation
      slides = generateTemplateSlides(kp);
    }

    return NextResponse.json({
      title: `Lezione: ${kp.title}`,
      description: kp.description,
      slides,
    });
  } catch (error) {
    console.error('Error generating lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateWithAI(kp: any, provider: 'openai' | 'google' | 'glm') {
  const prompt = `Genera una lezione di matematica per la LIM (Lavagna Interattiva Multimediale) sul seguente argomento:

ARGOMENTO: ${kp.title}
DESCRIZIONE: ${kp.description}

Crea 6-8 slide con approccio \"atomizzato\":
1. Micro-obiettivo della lezione (massimo 2 frasi)
2. Definizione teorica essenziale
3. Esempio guidato atomizzato (passi numerati)
4. Esercizio di esempio risolto
5. Esercizio da fare in classe sul quaderno (senza soluzione immediata)
6. Soluzione dell'esercizio precedente (slide separata)
7. Errori comuni da evitare
8. Riepilogo e criterio di passaggio fase

Per ogni slide fornisci:
- type: "content" | "example" | "exercise" | "summary"
- title: titolo della slide
- content: contenuto HTML semplice (usa <b>, <i>, <br>, liste)
- per la slide \"esercizio in classe\" includi un blocco con testo: \"Tempo suggerito: 10 minuti\"

Restituisci SOLO un array JSON in questo formato:
[
  {
    "type": "content",
    "title": "...",
    "content": "..."
  },
  ...
]`;

  try {
    let content: string;
    
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmService.getConfig('openai')?.apiKey}`,
        },
        body: JSON.stringify({
          model: llmService.getConfig('openai')?.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sei un assistente didattico esperto in matematica. Generi contenuti per lezioni frontali alla LIM.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        }),
      });
      
      const data = await response.json();
      content = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'google') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${llmService.getConfig('google')?.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      
      const data = await response.json();
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      // GLM
      const response = await fetch('https://api.z.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmService.getConfig('glm')?.apiKey}`,
        },
        body: JSON.stringify({
          model: llmService.getConfig('glm')?.model || 'glm-4.7',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      
      const data = await response.json();
      content = data.choices?.[0]?.message?.content || '';
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI generation failed, falling back to template:', error);
  }
  
  return generateTemplateSlides(kp);
}

function generateTemplateSlides(kp: any) {
  return [
    {
      type: 'content',
      title: `${kp.title} - Obiettivo atomico`,
      content: `<h2>Benvenuti alla lezione su ${kp.title}</h2>
<p>${kp.description}</p>
<br>
<p><b>Obiettivi:</b></p>
<ul>
  <li>Comprendere il concetto fondamentale</li>
  <li>Applicare la procedura passo dopo passo</li>
  <li>Risolvere esercizi di varia difficoltà</li>
</ul>`,
    },
    {
      type: 'content',
      title: 'Definizione',
      content: `<p><b>${kp.title}</b> è un concetto fondamentale della matematica.</p>
<br>
<p>In questa lezione esploreremo:</p>
<ul>
  <li>Il significato e l'importanza</li>
  <li>Le regole fondamentali</li>
  <li>Le applicazioni pratiche</li>
</ul>`,
    },
    {
      type: 'example',
      title: 'Esempio Guidato',
      content: `<p><b>Problema:</b> Vediamo un esempio pratico.</p>
<br>
<p><b>Soluzione passo dopo passo:</b></p>
<ol>
  <li>Analizziamo i dati del problema</li>
  <li>Identifichiamo la strategia da applicare</li>
  <li>Eseguiamo i calcoli</li>
  <li>Verifichiamo il risultato</li>
</ol>`,
    },
    {
      type: 'exercise',
      title: 'Esercizio in Classe',
      content: `<p><b>Prova tu!</b></p>
<br>
<p>Risolvi il seguente problema:</p>
<br>
<p><b>Tempo suggerito: 10 minuti</b></p>
<br>
<div style="background: #f0f5fd; padding: 20px; border-radius: 10px;">
  <p>[Spazio per l'esercizio]</p>
</div>
<br>
<p><i>Scrivi sul quaderno e confronta con il compagno.</i></p>`,
    },
    {
      type: 'example',
      title: 'Soluzione dell\'Esercizio in Classe',
      content: `<p><b>Correzione guidata:</b></p>
<ol>
  <li>Rileggi i dati del problema</li>
  <li>Scegli la regola corretta</li>
  <li>Calcola in ordine e verifica</li>
</ol>
<p><i>Il docente confronta i passaggi con la classe.</i></p>`,
    },
    {
      type: 'content',
      title: 'Errori Comuni',
      content: `<p><b>Attenzione a questi errori frequenti:</b></p>
<br>
<ul>
  <li>❌ Confondere i segni (+ e -)</li>
  <li>❌ Dimenticare di verificare il risultato</li>
  <li>❌ Saltare passaggi intermedi</li>
  <li>❌ Non leggere attentamente il testo</li>
</ul>
<br>
<p><b>✓ Suggerimento:</b> Prendete sempre appunti! 📝</p>`,
    },
    {
      type: 'summary',
      title: 'Riepilogo',
      content: `<p><b>Cosa abbiamo imparato oggi:</b></p>
<br>
<ul>
  <li>✓ Il concetto di ${kp.title}</li>
  <li>✓ Come applicarlo nei problemi</li>
  <li>✓ Gli errori da evitare</li>
</ul>
<br>
<p><b>Per casa:</b> Esercizi sull'app Math Academy! 📱</p>
<br>
<p><i>Domande? Chiedete pure! 💬</i></p>`,
    },
  ];
}
