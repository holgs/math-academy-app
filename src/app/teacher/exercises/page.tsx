'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, ChevronRight, Pencil, Plus, Save, Trash2, Wand2, X } from 'lucide-react';

type KnowledgePoint = {
  id: string;
  title: string;
  description: string;
  layer: number;
  prerequisites: string[];
  hasChildren: boolean;
};

type Pillar = {
  id: string;
  name: string;
  description: string;
};

type Exercise = {
  id: string;
  question: string;
  answer: string;
  hint: string | null;
  difficulty: number;
  knowledgePointId: string;
};

export default function TeacherExercisesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [path, setPath] = useState<KnowledgePoint[]>([]);
  const [currentPoints, setCurrentPoints] = useState<KnowledgePoint[]>([]);
  const [selectedKpId, setSelectedKpId] = useState('');
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    question: '',
    answer: '',
    hint: '',
    difficulty: 2,
  });

  const [provider, setProvider] = useState<'openai' | 'google' | 'glm'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [selectedPillarId, setSelectedPillarId] = useState('');
  const [form, setForm] = useState({
    question: '',
    answer: '',
    hint: '',
    difficulty: 2,
  });

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
      return;
    }
    if (status === 'authenticated') {
      Promise.all([fetchLevel(), fetchPillars()]).finally(() => setLoading(false));
    }
  }, [status, session, router]);

  useEffect(() => {
    const saved = localStorage.getItem(`teacher_llm_${provider}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { apiKey?: string; model?: string };
        setApiKey(parsed.apiKey || '');
        setModel(parsed.model || '');
      } catch {
        setApiKey('');
        setModel('');
      }
    } else {
      setApiKey('');
      setModel('');
    }
  }, [provider]);

  useEffect(() => {
    localStorage.setItem(
      `teacher_llm_${provider}`,
      JSON.stringify({
        apiKey,
        model,
      })
    );
  }, [provider, apiKey, model]);

  useEffect(() => {
    if (selectedKpId) {
      fetchExercises(selectedKpId);
    } else {
      setExercises([]);
    }
  }, [selectedKpId]);

  async function fetchLevel(parentId?: string) {
    setError('');
    try {
      const url = parentId
        ? `/api/teacher/knowledge-points?parentId=${encodeURIComponent(parentId)}`
        : '/api/teacher/knowledge-points';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento argomenti');
      setCurrentPoints(data.points || []);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function fetchPillars() {
    try {
      const res = await fetch('/api/teacher/pillars');
      const data = await res.json();
      if (res.ok) {
        setPillars(data.pillars || []);
      }
    } catch {
      // no-op
    }
  }

  async function fetchExercises(kpId: string) {
    setError('');
    try {
      const res = await fetch(`/api/teacher/exercises?knowledgePointId=${encodeURIComponent(kpId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento esercizi');
      setExercises(data.exercises || []);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  function enterPoint(point: KnowledgePoint) {
    const nextPath = [...path, point];
    setPath(nextPath);
    setSelectedKpId(point.id);
    if (point.hasChildren) {
      fetchLevel(point.id);
    }
  }

  function goToPathIndex(index: number) {
    const nextPath = path.slice(0, index + 1);
    setPath(nextPath);
    const selected = nextPath[nextPath.length - 1];
    setSelectedKpId(selected?.id || '');
    fetchLevel(selected?.id);
  }

  async function generateExercise() {
    if (!selectedKpId) {
      setError('Seleziona prima un argomento');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/teacher/exercises/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgePointId: selectedKpId,
          provider,
          difficulty: form.difficulty,
          pillarId: selectedPillarId || undefined,
          useAI,
          apiKey: apiKey.trim() || undefined,
          model: model.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore generazione');
      setForm({
        question: data.exercise.question || '',
        answer: data.exercise.answer || '',
        hint: data.exercise.hint || '',
        difficulty: data.exercise.difficulty || form.difficulty,
      });
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setGenerating(false);
    }
  }

  async function saveExercise(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/teacher/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgePointId: selectedKpId,
          question: form.question,
          answer: form.answer,
          hint: form.hint,
          difficulty: form.difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio esercizio');
      setForm({ question: '', answer: '', hint: '', difficulty: 2 });
      await fetchExercises(selectedKpId);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function deleteExercise(id: string) {
    if (!confirm('Eliminare questo esercizio?')) return;
    setError('');
    try {
      const res = await fetch(`/api/teacher/exercises?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore eliminazione');
      await fetchExercises(selectedKpId);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  function startEdit(exercise: Exercise) {
    setEditingId(exercise.id);
    setEditForm({
      question: exercise.question,
      answer: exercise.answer,
      hint: exercise.hint || '',
      difficulty: exercise.difficulty,
    });
  }

  async function saveEdit(exerciseId: string) {
    setError('');
    setSavingEditId(exerciseId);
    try {
      const res = await fetch('/api/teacher/exercises', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: exerciseId,
          question: editForm.question,
          answer: editForm.answer,
          hint: editForm.hint,
          difficulty: editForm.difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore aggiornamento esercizio');
      setEditingId(null);
      await fetchExercises(selectedKpId);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setSavingEditId(null);
    }
  }

  const selectedPathLabel = useMemo(() => path.map((p) => p.title).join(' > '), [path]);

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC]">Caricamento...</div>;
  }

  return (
    <div className="min-h-screen bg-[#E0E5EC] p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="neu-flat p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Esercizi Docente</h1>
            <p className="text-sm text-gray-500">Menu progressivo argomenti + AI + 12 pilastri + CRUD</p>
          </div>
          <Link href="/teacher" className="neu-button px-4 py-2">Dashboard docente</Link>
        </div>

        {error && <div className="neu-flat p-3 text-sm text-red-600 bg-red-50">{error}</div>}

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="neu-flat p-4">
            <h2 className="font-bold text-gray-800 mb-2">Selezione argomento progressiva</h2>
            <div className="flex flex-wrap gap-2 text-sm mb-3">
              <button
                className="neu-button px-2 py-1"
                onClick={() => {
                  setPath([]);
                  setSelectedKpId('');
                  fetchLevel();
                }}
              >
                Radice
              </button>
              {path.map((p, idx) => (
                <button
                  key={p.id}
                  className="neu-button px-2 py-1 flex items-center gap-1"
                  onClick={() => goToPathIndex(idx)}
                >
                  {p.title}
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
            {selectedPathLabel && (
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                Selezionato: {selectedPathLabel}
              </p>
            )}
            <div className="space-y-2 max-h-72 overflow-auto">
              {currentPoints.length === 0 && (
                <div className="text-sm text-gray-500">Nessun sotto-argomento disponibile.</div>
              )}
              {currentPoints.map((point) => (
                <button
                  key={point.id}
                  className="neu-button w-full p-3 text-left flex items-center justify-between"
                  onClick={() => enterPoint(point)}
                >
                  <div>
                    <div className="font-medium text-gray-800">{point.title}</div>
                    <div className="text-xs text-gray-500">Layer {point.layer + 1}</div>
                  </div>
                  <div className="text-xs text-purple-600 text-right">
                    {selectedKpId === point.id ? 'Argomento attivo' : point.hasChildren ? 'Apri sotto-argomenti' : 'Seleziona'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={saveExercise} className="neu-flat p-4 space-y-3">
            <h2 className="font-bold text-gray-800">Crea esercizio</h2>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="neu-input px-3 py-2"
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'openai' | 'google' | 'glm')}
              >
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="glm">GLM</option>
              </select>
              <select
                className="neu-input px-3 py-2"
                value={form.difficulty}
                onChange={(e) => setForm(prev => ({ ...prev, difficulty: Number(e.target.value) }))}
              >
                <option value={1}>Difficoltà 1</option>
                <option value={2}>Difficoltà 2</option>
                <option value={3}>Difficoltà 3</option>
                <option value={4}>Difficoltà 4</option>
              </select>
            </div>

            <input
              className="neu-input px-3 py-2 w-full"
              type="password"
              placeholder={`API key ${provider.toUpperCase()}`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <input
              className="neu-input px-3 py-2 w-full"
              placeholder="Model (opzionale)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />

            <label className="text-sm text-gray-600 flex items-center gap-2">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
              />
              Usa AI per proposta esercizio
            </label>

            <select
              className="neu-input px-3 py-2 w-full"
              value={selectedPillarId}
              onChange={(e) => setSelectedPillarId(e.target.value)}
            >
              <option value="">Nessun pilastro forzato</option>
              {pillars.map((pillar) => (
                <option key={pillar.id} value={pillar.id}>
                  {pillar.name} - {pillar.description}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={generateExercise}
              disabled={generating || !selectedKpId}
              className="neu-button w-full px-3 py-2 bg-purple-600 text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? <Bot className="w-4 h-4 animate-pulse" /> : <Wand2 className="w-4 h-4" />}
              Genera proposta
            </button>

            <textarea
              className="neu-input px-3 py-2 w-full min-h-24"
              placeholder="Domanda"
              value={form.question}
              onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))}
              required
            />
            <input
              className="neu-input px-3 py-2 w-full"
              placeholder="Risposta corretta"
              value={form.answer}
              onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))}
              required
            />
            <textarea
              className="neu-input px-3 py-2 w-full min-h-20"
              placeholder="Hint / metodo"
              value={form.hint}
              onChange={(e) => setForm(prev => ({ ...prev, hint: e.target.value }))}
            />

            <button
              type="submit"
              className="neu-button w-full px-3 py-2 bg-green-600 text-white flex items-center justify-center gap-2"
              disabled={!selectedKpId}
            >
              <Save className="w-4 h-4" />
              Salva esercizio
            </button>
          </form>
        </div>

        <div className="neu-flat p-4">
          <h2 className="font-bold text-gray-800 mb-3">
            Esercizi sull'argomento selezionato ({exercises.length})
          </h2>
          <div className="space-y-2">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="neu-button p-3 flex items-start justify-between gap-3">
                {editingId === exercise.id ? (
                  <>
                    <div className="flex-1 space-y-2">
                      <textarea
                        className="neu-input px-2 py-1 w-full min-h-20"
                        value={editForm.question}
                        onChange={(e) => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                      />
                      <input
                        className="neu-input px-2 py-1 w-full"
                        value={editForm.answer}
                        onChange={(e) => setEditForm(prev => ({ ...prev, answer: e.target.value }))}
                      />
                      <textarea
                        className="neu-input px-2 py-1 w-full min-h-16"
                        value={editForm.hint}
                        onChange={(e) => setEditForm(prev => ({ ...prev, hint: e.target.value }))}
                      />
                      <select
                        className="neu-input px-2 py-1"
                        value={editForm.difficulty}
                        onChange={(e) => setEditForm(prev => ({ ...prev, difficulty: Number(e.target.value) }))}
                      >
                        <option value={1}>Difficoltà 1</option>
                        <option value={2}>Difficoltà 2</option>
                        <option value={3}>Difficoltà 3</option>
                        <option value={4}>Difficoltà 4</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        className="neu-button px-2 py-1 text-green-700 flex items-center gap-1"
                        onClick={() => saveEdit(exercise.id)}
                        disabled={savingEditId === exercise.id}
                      >
                        <Save className="w-4 h-4" />
                        Salva
                      </button>
                      <button
                        className="neu-button px-2 py-1 flex items-center gap-1"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4" />
                        Annulla
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-gray-800">{exercise.question}</p>
                      <p className="text-xs text-gray-600">Risposta: {exercise.answer}</p>
                      {exercise.hint && <p className="text-xs text-gray-500">Hint: {exercise.hint}</p>}
                      <p className="text-xs text-purple-600">Difficoltà {exercise.difficulty}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        className="neu-button px-2 py-1 text-blue-600 flex items-center gap-1"
                        onClick={() => startEdit(exercise)}
                      >
                        <Pencil className="w-4 h-4" />
                        Modifica
                      </button>
                      <button
                        className="neu-button px-2 py-1 text-red-600 flex items-center gap-1"
                        onClick={() => deleteExercise(exercise.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Elimina
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {exercises.length === 0 && (
              <p className="text-sm text-gray-500">Nessun esercizio per questo argomento.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
