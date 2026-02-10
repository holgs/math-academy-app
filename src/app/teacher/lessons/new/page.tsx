'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Wand2, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  FileJson,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import KatexContent from '@/components/KatexContent';
import TeacherTopicSelector from '@/components/TeacherTopicSelector';

interface DraftSlide {
  type?: string;
  title?: string;
  content?: string;
  learningObjective?: string;
  explanation?: string[];
  workedExample?: { problem?: string; steps?: string[]; result?: string };
  classExercise?: { prompt?: string; timerMinutes?: number; hints?: string[] };
  solutionSteps?: string[];
  commonMistakes?: string[];
  quickCheck?: string;
}

function slidePreviewHtml(content: string) {
  if (!content.trim()) return '<em>Nessun contenuto</em>';
  const normalized = normalizeLessonTextContent(content);
  if (normalized.includes('<')) return normalized;
  return `<p>${normalized.replace(/\n/g, '<br />')}</p>`;
}

function normalizeLessonTextContent(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n\\n/g, '\n\n')
    .replace(/\\n(?=[A-Z0-9\-*•\s])/g, '\n');
}

function escapeLiteralNewlinesInsideStrings(raw: string) {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      out += ch;
      inString = !inString;
      continue;
    }

    if (inString && (ch === '\n' || ch === '\r')) {
      out += '\\n';
      if (ch === '\r' && raw[i + 1] === '\n') {
        i += 1;
      }
      continue;
    }

    out += ch;
  }

  return out;
}

function repairInvalidEscapesInsideStrings(raw: string) {
  let out = '';
  let inString = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (ch === '"') {
      let bsCount = 0;
      for (let j = i - 1; j >= 0 && raw[j] === '\\'; j -= 1) {
        bsCount += 1;
      }
      if (bsCount % 2 === 0) {
        inString = !inString;
      }
      out += ch;
      continue;
    }

    if (!inString || ch !== '\\') {
      out += ch;
      continue;
    }

    const next = raw[i + 1];
    if (!next) {
      out += '\\\\';
      continue;
    }

    if (next === 'u') {
      const hex = raw.slice(i + 2, i + 6);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        out += '\\u';
        i += 1;
        continue;
      }
      out += '\\\\';
      continue;
    }

    const jsonSimpleEscapes = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
    if (jsonSimpleEscapes.has(next)) {
      // For KaTeX commands like \frac, \neq, \text, prefer literal backslash.
      const after = raw[i + 2];
      const isLikelyLatexCommand =
        ['b', 'f', 'n', 'r', 't'].includes(next) && !!after && /[A-Za-z]/.test(after);
      if (isLikelyLatexCommand) {
        out += '\\\\';
        continue;
      }
      out += `\\${next}`;
      i += 1;
      continue;
    }

    // Unknown escape (e.g. \{, \}, \l, \m): make it a literal backslash.
    out += '\\\\';
  }

  return out;
}

export default function NewLessonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingLessonId = searchParams?.get('edit') || '';
  const isEditMode = !!editingLessonId;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [selectedKP, setSelectedKP] = useState('');
  const [selectedKPPath, setSelectedKPPath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [provider, setProvider] = useState<'openai' | 'google' | 'glm'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [slides, setSlides] = useState<DraftSlide[]>([]);
  const [inClassTimerMinutes, setInClassTimerMinutes] = useState(15);
  const [passThresholdPercent, setPassThresholdPercent] = useState(70);
  const [showSchema, setShowSchema] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const [editorSource, setEditorSource] = useState<'ai' | 'import' | 'edit'>('ai');

  const lessonJsonSchema = `{
  "lessonTitle": "string",
  "lessonDescription": "string",
  "slides": [
    {
      "type": "content|example|exercise|summary",
      "title": "string",
      "learningObjective": "string",
      "explanation": ["string", "string", "string"],
      "workedExample": { "problem": "string", "steps": ["..."], "result": "string" },
      "classExercise": { "prompt": "string", "timerMinutes": 10, "hints": ["..."] },
      "solutionSteps": ["string", "string", "string"],
      "commonMistakes": ["string", "string"],
      "quickCheck": "string"
    }
  ]
}`;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (status === 'authenticated' && session?.user?.role === 'STUDENT') {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'TEACHER' || !editingLessonId) return;
    loadLessonForEditing(editingLessonId);
  }, [status, session, editingLessonId]);

  async function loadLessonForEditing(lessonId: string) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento lezione');
      const lesson = data.lesson;
      setTitle(String(lesson.title || ''));
      setDescription(String(lesson.description || ''));
      setSelectedKP(String(lesson.knowledgePointId || ''));
      setSelectedKPPath(String(lesson.knowledgePoint?.title || lesson.knowledgePointId || ''));
      setInClassTimerMinutes(Number(lesson.inClassTimerMinutes || 15));
      setPassThresholdPercent(Number(lesson.passThresholdPercent || 70));
      setSlides(
        Array.isArray(lesson.slides)
          ? lesson.slides.map((slide: any) => ({
              type: String(slide.type || 'content'),
              title: String(slide.title || ''),
              content: normalizeLessonTextContent(String(slide.content || '')),
            }))
          : []
      );
      setEditorSource('edit');
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Errore caricamento lezione');
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = async () => {
    if (!selectedKP) {
      setError('Seleziona un argomento');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/teacher/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgePointId: selectedKP,
          useAI,
          provider,
          apiKey: apiKey.trim() || undefined,
          model: model.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTitle(data.title);
        setDescription(data.description);
        setSlides(data.slides);
        setEditorSource('ai');
        setStep(2);
      } else {
        const err = await res.json();
        setError(err.error || 'Errore nella generazione');
      }
    } catch (error) {
      setError('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  function buildPromptForTopic() {
    if (!selectedKP) {
      setError('Seleziona un argomento prima di generare il prompt');
      return;
    }

    const prompt = `AGISCI come instructional designer esperto di didattica della matematica per scuola secondaria superiore italiana.

OBIETTIVO
Genera ESCLUSIVAMENTE un JSON valido per importare una lezione.
Nessun testo fuori dal JSON.
Nessun markdown.
Nessun commento.

CONTESTO LEZIONE
- Argomento selezionato: ${selectedKPPath || selectedKP}
- knowledgePointId obbligatorio: ${selectedKP}
- Timer esercizi in classe (min): ${inClassTimerMinutes}
- Soglia passaggio (%): ${passThresholdPercent}
- Numero slide target: 8

OUTPUT OBBLIGATORIO (FORMATO IMPORT)
{
  "title": "string",
  "description": "string",
  "knowledgePointId": "${selectedKP}",
  "inClassTimerMinutes": ${inClassTimerMinutes},
  "passThresholdPercent": ${passThresholdPercent},
  "slides": [
    {
      "type": "content|example|exercise|summary",
      "title": "string",
      "content": "string"
    }
  ]
}

VINCOLI FORMALI
- Campi obbligatori: title, description, knowledgePointId, slides.
- NON aggiungere campi extra oltre quelli nello schema.
- type ammessi SOLO: content, example, exercise, summary.
- Almeno 6 slide, massimo 14.
- Ogni slide: title non vuoto, content non vuoto.
- Non usare placeholder (es. TODO, da completare, ...).
- knowledgePointId deve essere ESATTAMENTE "${selectedKP}".
- Restituisci un JSON parseabile: usa solo doppi apici per le stringhe.
- Nel campo content usa \\n per andare a capo (newline) con SINGOLO backslash.
- Non usare \\\\n (doppio backslash + n), altrimenti la piattaforma mostra "\\n" come testo.
- Non inserire ritorni a capo reali dentro la stringa JSON.
- Non usare virgolette tipografiche o caratteri speciali che rompono il JSON.

FORMULE MATEMATICHE (KATEX OBBLIGATORIO)
- Inserisci formule nel campo content usando sintassi LaTeX compatibile con KaTeX.
- Formule inline: usa delimitatori $...$ (esempio: "La regola e $a+b=b+a$").
- Formule in blocco: usa delimitatori $$...$$ (esempio: "$$(-8)+3=-5$$").
- NON escapare i delimitatori del dollaro: usa $...$ e $$...$$, non \\$...\\$.
- Evita comandi LaTeX non supportati da KaTeX; usa comandi standard (fractions, powers, roots, parentheses).
- Non usare HTML per le formule (<math>, <span>, ecc.).
- Le formule devono essere semanticamente corrette e coerenti con il testo didattico.
- In ogni lezione includi almeno:
  - 3 formule inline distribuite nelle slide di contenuto/esempio
  - 2 formule block nelle slide example/exercise

VINCOLI DIDATTICI
- Progressione: richiamo prerequisiti -> concetto -> esempi -> esercizi -> sintesi.
- Almeno 2 slide con type="example" con svolgimento guidato passo passo.
- Almeno 2 slide con type="exercise" con difficolta crescente.
- Ultima slide con type="summary" e contiene:
  - 5 punti chiave
  - 3 errori comuni
  - 3 quick check

STILE
- Italiano chiaro, didattico, frasi brevi.
- Coerenza terminologica lungo tutta la lezione.

VALIDAZIONE (OBBLIGATORIA)
Prima di produrre l'output finale, verifica internamente:
1) Il JSON e valido (solo doppi apici, nessuna virgola finale, parentesi bilanciate).
2) knowledgePointId e identico a "${selectedKP}".
3) slides: min 6, max 14, e l'ultima e type="summary".
4) Almeno 2 example e almeno 2 exercise.
5) Le formule KaTeX usano solo delimitatori $...$ o $$...$$ e non rompono il JSON.
6) Nessun testo fuori dal JSON.

ORA PRODUCI SOLO IL JSON FINALE, SENZA SPIEGAZIONI.`;

    setGeneratedPrompt(prompt);
  }

  async function copyPrompt() {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1500);
    } catch {
      setError('Impossibile copiare automaticamente il prompt');
    }
  }

  function slideContentFromExternal(slide: DraftSlide, index: number) {
    if (slide.content && String(slide.content).trim()) {
      return normalizeLessonTextContent(String(slide.content));
    }

    const sections: string[] = [];
    if (slide.learningObjective) sections.push(`Obiettivo: ${slide.learningObjective}`);
    if (Array.isArray(slide.explanation) && slide.explanation.length > 0) {
      sections.push(`Spiegazione:\n- ${slide.explanation.join('\n- ')}`);
    }
    if (slide.workedExample) {
      const ex = slide.workedExample;
      const exParts = [
        ex.problem ? `Problema: ${ex.problem}` : '',
        Array.isArray(ex.steps) && ex.steps.length > 0 ? `Passi:\n- ${ex.steps.join('\n- ')}` : '',
        ex.result ? `Risultato: ${ex.result}` : '',
      ].filter(Boolean);
      if (exParts.length > 0) sections.push(`Esempio svolto:\n${exParts.join('\n')}`);
    }
    if (slide.classExercise) {
      const ce = slide.classExercise;
      const ceParts = [
        ce.prompt ? `Consegna: ${ce.prompt}` : '',
        Number.isFinite(ce.timerMinutes) ? `Timer: ${ce.timerMinutes} minuti` : '',
        Array.isArray(ce.hints) && ce.hints.length > 0 ? `Suggerimenti:\n- ${ce.hints.join('\n- ')}` : '',
      ].filter(Boolean);
      if (ceParts.length > 0) sections.push(`Esercizio in classe:\n${ceParts.join('\n')}`);
    }
    if (Array.isArray(slide.solutionSteps) && slide.solutionSteps.length > 0) {
      sections.push(`Passi soluzione:\n- ${slide.solutionSteps.join('\n- ')}`);
    }
    if (Array.isArray(slide.commonMistakes) && slide.commonMistakes.length > 0) {
      sections.push(`Errori comuni:\n- ${slide.commonMistakes.join('\n- ')}`);
    }
    if (slide.quickCheck) sections.push(`Quick check: ${slide.quickCheck}`);

    if (sections.length === 0) {
      return `Contenuto slide ${index + 1}`;
    }
    return normalizeLessonTextContent(sections.join('\n\n'));
  }

  function normalizeImportedPayload(raw: any) {
    const source = Array.isArray(raw) ? raw[0] : raw;
    if (!source || typeof source !== 'object') {
      throw new Error('JSON non valido: atteso oggetto lezione');
    }

    const rawSlides = Array.isArray(source.slides) ? source.slides : [];
    if (rawSlides.length === 0) {
      throw new Error('JSON non valido: slides assenti o vuote');
    }

    const normalizedSlides = rawSlides.map((slide: DraftSlide, index: number) => {
      const type = String(slide?.type || 'content').toLowerCase();
      const validType = type === 'content' || type === 'example' || type === 'exercise' || type === 'summary'
        ? type
        : 'content';
      return {
        type: validType,
        title: String(slide?.title || `Slide ${index + 1}`),
        content: slideContentFromExternal(slide, index),
      };
    });

    const mapped = {
      title: String(source.title || source.lessonTitle || ''),
      description: String(source.description || source.lessonDescription || ''),
      knowledgePointId: String(source.knowledgePointId || selectedKP || ''),
      inClassTimerMinutes: Number(source.inClassTimerMinutes ?? inClassTimerMinutes),
      passThresholdPercent: Number(source.passThresholdPercent ?? passThresholdPercent),
      slides: normalizedSlides,
    };

    if (!mapped.title.trim()) throw new Error('JSON non valido: title mancante');
    if (!mapped.knowledgePointId.trim()) throw new Error('JSON non valido: knowledgePointId mancante');
    return mapped;
  }

  async function handleImportJson() {
    setError('');
    if (!importJsonText.trim()) {
      setError('Inserisci un JSON da importare');
      return;
    }

    setImportLoading(true);
    try {
      let parsed: any;
      try {
        const normalized = importJsonText
          .replace(/\uFEFF/g, '')
          .replace(/\u00A0/g, ' ')
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'");

        const withoutFences = normalized
          .replace(/^\s*```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/i, '');

        const start = withoutFences.indexOf('{');
        const end = withoutFences.lastIndexOf('}');
        const candidate =
          start >= 0 && end > start
            ? withoutFences.slice(start, end + 1)
            : withoutFences;

        try {
          parsed = JSON.parse(candidate);
        } catch (strictErr: any) {
          const repaired = repairInvalidEscapesInsideStrings(
            escapeLiteralNewlinesInsideStrings(candidate)
          );
          try {
            parsed = JSON.parse(repaired);
          } catch (repairErr: any) {
            const reason = repairErr?.message || strictErr?.message || 'formato non valido';
            throw new Error(`JSON non parseabile (${reason})`);
          }
        }
      } catch (err: any) {
        throw new Error(err?.message || 'JSON non parseabile (controlla virgolette e formato)');
      }

      const payload = normalizeImportedPayload(parsed);
      setTitle(payload.title);
      setDescription(payload.description);
      setSelectedKP(payload.knowledgePointId);
      setSelectedKPPath(payload.knowledgePointId);
      setInClassTimerMinutes(payload.inClassTimerMinutes);
      setPassThresholdPercent(payload.passThresholdPercent);
      setSlides(payload.slides);
      setEditorSource('import');
      setStep(2);
    } catch (err: any) {
      const message =
        err?.message === 'Load failed'
          ? 'Import fallito: richiesta non completata. Verifica login docente e connessione locale.'
          : err?.message || 'Errore import JSON';
      setError(message);
    } finally {
      setImportLoading(false);
    }
  }

  async function handleJsonFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportJsonText(text);
    } catch {
      setError('Impossibile leggere il file JSON');
    } finally {
      e.target.value = '';
    }
  }

  const handleSave = async () => {
    setLoading(true);
    
    try {
      const normalizedSlides = (slides || []).map((slide, index) => {
        const normalizedType = String(slide?.type || 'content').toLowerCase();
        const validType =
          normalizedType === 'content' ||
          normalizedType === 'example' ||
          normalizedType === 'exercise' ||
          normalizedType === 'summary'
            ? normalizedType
            : 'content';

        return {
          type: validType,
          title: String(slide?.title || `Slide ${index + 1}`),
          content: normalizeLessonTextContent(String(slide?.content || '')),
        };
      });

      const method = isEditMode ? 'PATCH' : 'POST';
      const url = isEditMode ? `/api/teacher/lessons/${editingLessonId}` : '/api/teacher/lessons';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          knowledgePointId: selectedKP,
          slides: normalizedSlides,
          inClassTimerMinutes,
          passThresholdPercent,
        }),
      });

      if (res.ok) {
        router.push('/teacher/lessons');
      } else {
        const err = await res.json();
        if (err?.code === 'P2021') {
          setError(
            'Salvataggio fallito: database non aggiornato (tabella lezione mancante). Esegui `npm run db:migrate` e riprova.'
          );
        } else {
          setError(err.error || 'Errore nel salvataggio');
        }
        setLoading(false);
      }
    } catch (error) {
      setError('Errore di rete');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E0E5EC]">
      {/* Header */}
      <header className="neu-flat m-4 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/teacher/lessons" className="neu-button p-2 flex items-center gap-2 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
            Indietro
          </Link>
          
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-purple-600' : 'bg-gray-300'}`} />
            <div className="w-8 h-0.5 bg-gray-300" />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`} />
          </div>
          
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="neu-flat p-4 mb-6 bg-red-50 border-red-200"
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        {step === 1 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="neu-flat p-8"
          >
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{isEditMode ? 'Modifica Lezione' : 'Crea Nuova Lezione'}</h1>
            <p className="text-gray-500 mb-8">{isEditMode ? 'Rivedi l’argomento e aggiorna il contenuto' : "Seleziona l'argomento e genera il contenuto"}</p>

            <div className="space-y-6">
              {/* Knowledge Point Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Argomento
                </label>
                <TeacherTopicSelector
                  selectedId={selectedKP}
                  onSelect={(selection) => {
                    setSelectedKP(selection.id);
                    setSelectedKPPath(selection.pathLabel);
                  }}
                  onClear={() => {
                    setSelectedKP('');
                    setSelectedKPPath('');
                  }}
                  title="Argomenti principali, sotto-categorie e sotto-sotto-categorie"
                  disabled={isEditMode}
                />
                {selectedKPPath && (
                  <p className="text-xs text-gray-500 mt-2">Selezionato: {selectedKPPath}</p>
                )}
              </div>

              {/* AI Toggle */}
              <div className="flex items-center gap-3 p-4 neu-convex rounded-xl">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="w-5 h-5 accent-purple-600"
                />
                <label htmlFor="useAI" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-800">Genera con AI</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    L'AI genererà automaticamente slide, esempi ed esercizi
                  </p>
                </label>
              </div>

              {useAI && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as 'openai' | 'google' | 'glm')}
                      className="neu-input w-full px-4 py-3"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="google">Google</option>
                      <option value="glm">GLM</option>
                    </select>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="neu-input w-full px-4 py-3"
                      placeholder="Model (opzionale)"
                    />
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="neu-input w-full px-4 py-3"
                    placeholder={`API key ${provider.toUpperCase()}`}
                  />
                  <button
                    type="button"
                    className="neu-button px-3 py-2 text-xs"
                    onClick={() => setShowSchema((prev) => !prev)}
                  >
                    {showSchema ? 'Nascondi schema JSON generazione' : 'Mostra schema JSON generazione'}
                  </button>
                  {showSchema && (
                    <textarea
                      className="neu-input w-full px-3 py-2 min-h-56 text-xs font-mono"
                      readOnly
                      value={lessonJsonSchema}
                    />
                  )}
                </div>
              )}

              {/* Generate Button */}
              <div className="grid md:grid-cols-2 gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !selectedKP || isEditMode}
                  className="neu-button w-full py-4 bg-purple-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      {isEditMode ? 'Generazione AI disabilitata in modifica' : 'Genera Lezione AI'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={buildPromptForTopic}
                  disabled={!selectedKP}
                  className="neu-button w-full py-4 bg-indigo-600 text-white font-semibold disabled:opacity-50"
                >
                  Genera Prompt per Altro Sistema
                </button>
              </div>

              {generatedPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-700">Prompt pronto da copiare</p>
                    <button type="button" className="neu-button px-3 py-2 text-xs flex items-center gap-1" onClick={copyPrompt}>
                      <Copy className="w-3 h-3" />
                      {copyOk ? 'Copiato' : 'Copia prompt'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    className="neu-input w-full px-3 py-2 min-h-64 text-xs font-mono"
                    value={generatedPrompt}
                  />
                </div>
              )}

              <div className="neu-convex p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-gray-700 font-semibold">
                  <FileJson className="w-4 h-4 text-indigo-600" />
                  Importa lezione JSON
                </div>
                <p className="text-xs text-gray-500">
                  Supporta sia il formato import (`title/description/slides`) sia il formato esteso (`lessonTitle/lessonDescription`).
                  Se manca `knowledgePointId`, viene usato l'argomento selezionato sopra. L'import apre l'editor per revisione prima del salvataggio.
                </p>
                <div className="flex items-center gap-2">
                  <label className="neu-button px-3 py-2 text-xs inline-flex items-center gap-1 cursor-pointer">
                    <Upload className="w-3 h-3" />
                    Carica file .json
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={handleJsonFileUpload}
                    />
                  </label>
                  <button
                    type="button"
                    className="neu-button px-3 py-2 text-xs bg-indigo-600 text-white disabled:opacity-50"
                    onClick={handleImportJson}
                    disabled={importLoading}
                  >
                    {importLoading ? 'Caricamento in editor...' : 'Importa JSON in editor'}
                  </button>
                </div>
                <textarea
                  className="neu-input w-full px-3 py-2 min-h-56 text-xs font-mono"
                  placeholder='Incolla qui il JSON della lezione...'
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Preview Card */}
            <div className="neu-flat p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-semibold">
                  {editorSource === 'import'
                    ? 'Lezione importata: modifica e verifica prima del salvataggio'
                    : editorSource === 'edit'
                    ? 'Modalita modifica: aggiorna contenuti e salva'
                    : 'Lezione generata!'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Titolo</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="neu-input w-full px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="neu-input w-full px-4 py-2"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Timer esercizi in classe (min)</label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={inClassTimerMinutes}
                      onChange={(e) => setInClassTimerMinutes(Number(e.target.value))}
                      className="neu-input w-full px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Soglia successo passaggio (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={passThresholdPercent}
                      onChange={(e) => setPassThresholdPercent(Number(e.target.value))}
                      className="neu-input w-full px-4 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Slide ({slides.length})
                  </label>
                  <div className="space-y-2">
                    {slides.map((slide, idx) => (
                      <div key={idx} className="neu-convex p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <input
                            value={slide.title || ''}
                            onChange={(e) => {
                              const next = [...slides];
                              next[idx] = { ...next[idx], title: e.target.value };
                              setSlides(next);
                            }}
                            className="neu-input flex-1 px-2 py-1 text-sm"
                            placeholder={`Titolo slide ${idx + 1}`}
                          />
                          <select
                            value={slide.type || 'content'}
                            onChange={(e) => {
                              const next = [...slides];
                              next[idx] = { ...next[idx], type: e.target.value as DraftSlide['type'] };
                              setSlides(next);
                            }}
                            className="neu-input px-2 py-1 text-xs capitalize"
                          >
                            <option value="content">content</option>
                            <option value="example">example</option>
                            <option value="exercise">exercise</option>
                            <option value="summary">summary</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <textarea
                            value={slide.content || ''}
                            onChange={(e) => {
                              const next = [...slides];
                              next[idx] = { ...next[idx], content: e.target.value };
                              setSlides(next);
                            }}
                            rows={6}
                            className="neu-input w-full px-3 py-2 text-sm"
                            placeholder="Contenuto slide"
                          />
                          <div className="neu-pressed p-3 rounded-xl min-h-[120px] overflow-auto">
                            <p className="text-xs text-gray-500 mb-2">Anteprima</p>
                            <KatexContent
                              className="prose prose-sm max-w-none text-gray-700"
                              content={normalizeLessonTextContent(String(slide.content || ''))}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="neu-button flex-1 py-3"
              >
                Indietro
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="neu-button flex-1 py-3 bg-purple-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {isEditMode ? 'Aggiorna Lezione' : 'Salva Lezione'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
