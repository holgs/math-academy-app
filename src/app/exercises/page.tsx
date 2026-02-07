'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Trophy,
  Target,
  Clock,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Exercise {
  id: string;
  question: string;
  difficulty: number;
  hint: string | null;
  completed: boolean;
}

interface ExerciseResult {
  isCorrect: boolean;
  correctAnswer: string;
  hint: string | null;
  xpEarned: number;
  coinsEarned: number;
  attemptNumber: number;
}

interface AssignmentMeta {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  progressPct: number;
}

export default function ExercisePage() {
  const searchParams = useSearchParams();
  const kpId = searchParams?.get('kp') || null;
  const assignmentId = searchParams?.get('assignment') || null;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [assignmentMeta, setAssignmentMeta] = useState<AssignmentMeta | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [startTime, setStartTime] = useState(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [pageError, setPageError] = useState('');
  const [completedFlow, setCompletedFlow] = useState(false);

  useEffect(() => {
    if (kpId || assignmentId) {
      fetchExercises();
    } else {
      setPageLoading(false);
    }
  }, [kpId, assignmentId]);

  const fetchExercises = async () => {
    setPageLoading(true);
    setPageError('');

    try {
      const url = assignmentId
        ? `/api/exercises?assignmentId=${encodeURIComponent(assignmentId)}`
        : `/api/exercises?kp=${encodeURIComponent(kpId || '')}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore caricamento esercizi');
      }

      setExercises(data.exercises || []);
      setAssignmentMeta(data.assignment || null);
      setStartTime(Date.now());
    } catch (error: any) {
      setPageError(error.message || 'Errore di rete');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim() || submitting || exercises.length === 0) return;

    setSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const res = await fetch('/api/exercises/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exercises[currentIndex].id,
          answer,
          timeSpent,
          assignmentId: assignmentId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore invio risposta');
      }

      setResult(data);

      if (data.isCorrect) {
        const updated = [...exercises];
        updated[currentIndex].completed = true;
        setExercises(updated);
      }
    } catch (error: any) {
      setPageError(error.message || 'Errore submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setAnswer('');
      setResult(null);
      setShowHint(false);
      setStartTime(Date.now());
      return;
    }

    setCompletedFlow(true);
  };

  const handleRetry = () => {
    setAnswer('');
    setResult(null);
    setShowHint(false);
    setStartTime(Date.now());
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neu-convex p-8">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!kpId && !assignmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="neu-flat p-8 text-center max-w-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nessun compito selezionato</h2>
          <p className="text-gray-600 mb-4">Apri un argomento dalla mappa o un compito assegnato dalla dashboard.</p>
          <Link href="/dashboard" className="neu-button px-4 py-2 inline-block">Torna alla dashboard</Link>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="neu-flat p-8 text-center max-w-lg">
          <h2 className="text-xl font-bold text-red-700 mb-2">Errore</h2>
          <p className="text-gray-600 mb-4">{pageError}</p>
          <button onClick={fetchExercises} className="neu-button px-4 py-2">Riprova</button>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="neu-flat p-8 text-center max-w-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nessun esercizio disponibile</h2>
          <p className="text-gray-600 mb-4">Il docente non ha ancora assegnato esercizi per questa attività.</p>
          <Link href="/dashboard" className="neu-button px-4 py-2 inline-block">Torna alla dashboard</Link>
        </div>
      </div>
    );
  }

  if (completedFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="neu-flat p-8 text-center max-w-lg">
          <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Compito completato</h2>
          <p className="text-gray-600 mb-4">Hai terminato tutti gli esercizi assegnati.</p>
          <Link href="/dashboard" className="neu-button px-4 py-2 inline-block">Vai alla dashboard</Link>
        </div>
      </div>
    );
  }

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {assignmentMeta && (
          <div className="neu-flat p-4 mb-4 text-sm text-gray-700">
            <div className="font-semibold text-gray-800 mb-1">Compito: {assignmentMeta.title}</div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Scadenza: {new Date(assignmentMeta.dueDate).toLocaleString('it-IT')} - Stato: {assignmentMeta.status}
            </div>
          </div>
        )}

        <div className="neu-flat p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Esercizio {currentIndex + 1} di {exercises.length}
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((star) => (
                <Trophy
                  key={star}
                  className={`w-4 h-4 ${star <= currentExercise.difficulty ? 'text-accent-warning' : 'text-gray-300'}`}
                />
              ))}
            </div>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div className="h-full bg-accent-success" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
        </div>

        <motion.div
          key={currentExercise.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="neu-flat p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="neu-circle-pressed w-12 h-12 flex items-center justify-center">
              <Target className="w-6 h-6 text-accent-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Esercizio</h2>
              <p className="text-sm text-gray-500">Difficolta: {'*'.repeat(currentExercise.difficulty)}</p>
            </div>
          </div>

          <div className="neu-pressed p-6 mb-6">
            <p className="text-lg text-gray-800 leading-relaxed">{currentExercise.question}</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!!result}
                className="neu-input w-full px-6 py-4 text-lg text-center text-gray-800 disabled:opacity-50"
                placeholder="La tua risposta..."
                onKeyDown={(e) => e.key === 'Enter' && !result && handleSubmit()}
              />
            </div>

            <AnimatePresence>
              {showHint && currentExercise.hint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="neu-convex p-4 bg-accent-warning/10"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-accent-warning flex-shrink-0 mt-0.5" />
                    <p className="text-gray-700">{currentExercise.hint}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`neu-flat p-6 ${result.isCorrect ? 'bg-accent-success/10' : 'bg-accent-error/10'}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {result.isCorrect ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-accent-success" />
                        <span className="text-xl font-bold text-accent-success">Corretto!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-8 h-8 text-accent-error" />
                        <span className="text-xl font-bold text-accent-error">Sbagliato</span>
                      </>
                    )}
                  </div>

                  {!result.isCorrect && (
                    <p className="text-gray-700 mb-4">
                      Risposta corretta: <strong className="text-accent-success">{result.correctAnswer}</strong>
                    </p>
                  )}

                  {result.isCorrect && (
                    <div className="flex gap-4 mb-4">
                      <div className="neu-convex px-4 py-2">
                        <span className="text-accent-success font-bold">+{result.xpEarned} XP</span>
                      </div>
                      {result.coinsEarned > 0 && (
                        <div className="neu-convex px-4 py-2">
                          <span className="text-yellow-600 font-bold">+{result.coinsEarned} monete</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-sm text-gray-500">Tentativo {result.attemptNumber}</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-4">
              {!result ? (
                <>
                  <motion.button
                    onClick={() => setShowHint(!showHint)}
                    className="neu-button flex-1 py-4 flex items-center justify-center gap-2 text-gray-700"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Lightbulb className="w-5 h-5" />
                    {showHint ? 'Nascondi hint' : 'Mostra hint'}
                  </motion.button>

                  <motion.button
                    onClick={handleSubmit}
                    disabled={!answer.trim() || submitting}
                    className="neu-button flex-1 py-4 flex items-center justify-center gap-2 bg-accent-success text-white font-semibold disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Verifica
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </>
              ) : result.isCorrect ? (
                <motion.button
                  onClick={handleNext}
                  className="neu-button w-full py-4 flex items-center justify-center gap-2 bg-accent-success text-white font-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {currentIndex < exercises.length - 1 ? (
                    <>
                      Prossimo esercizio
                      <ArrowRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Completa compito
                      <Trophy className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleRetry}
                  className="neu-button w-full py-4 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RotateCcw className="w-5 h-5" />
                  Riprova
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
