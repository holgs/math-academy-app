'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Wand2, 
  BookOpen, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import KatexContent from '@/components/KatexContent';

interface KnowledgePoint {
  id: string;
  title: string;
  layer: number;
}

interface DraftSlide {
  type?: string;
  title?: string;
  content?: string;
}

function slidePreviewHtml(content: string) {
  if (!content.trim()) return '<em>Nessun contenuto</em>';
  if (content.includes('<')) return content;
  return `<p>${content.replace(/\n/g, '<br />')}</p>`;
}

export default function NewLessonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [selectedKP, setSelectedKP] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [provider, setProvider] = useState<'openai' | 'google' | 'glm'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [slides, setSlides] = useState<DraftSlide[]>([]);
  const [inClassTimerMinutes, setInClassTimerMinutes] = useState(15);
  const [passThresholdPercent, setPassThresholdPercent] = useState(70);

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

  // Fetch knowledge points on mount
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'TEACHER') {
      fetchKnowledgePoints();
    }
  }, [status, session]);

  const fetchKnowledgePoints = async () => {
    try {
      const res = await fetch('/api/knowledge-graph');
      if (res.ok) {
        const data = await res.json();
        setKnowledgePoints(data.nodes || []);
      }
    } catch (error) {
      console.error('Failed to fetch KPs:', error);
    }
  };

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
          content: String(slide?.content || ''),
        };
      });

      const res = await fetch('/api/teacher/lessons', {
        method: 'POST',
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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Crea Nuova Lezione</h1>
            <p className="text-gray-500 mb-8">Seleziona l'argomento e genera il contenuto</p>

            <div className="space-y-6">
              {/* Knowledge Point Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Argomento
                </label>
                <select
                  value={selectedKP}
                  onChange={(e) => setSelectedKP(e.target.value)}
                  className="neu-input w-full px-4 py-3"
                >
                  <option value="">Seleziona un argomento...</option>
                  {knowledgePoints.map((kp) => (
                    <option key={kp.id} value={kp.id}>
                      Livello {kp.layer + 1}: {kp.title}
                    </option>
                  ))}
                </select>
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
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedKP}
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
                    Genera Lezione
                  </>
                )}
              </button>
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
                <span className="text-green-600 font-semibold">Lezione generata!</span>
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
                          <span className="flex-1 text-sm text-gray-700">{slide.title}</span>
                          <span className="text-xs text-gray-400 capitalize">{slide.type}</span>
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
                              content={slidePreviewHtml(String(slide.content || ''))}
                              isHtml
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
                    Salva Lezione
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
