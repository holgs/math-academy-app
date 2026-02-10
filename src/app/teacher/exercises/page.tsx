'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Pencil, Save, ShieldCheck, Trash2, Wand2, X } from 'lucide-react';
import TeacherTopicSelector from '@/components/TeacherTopicSelector';

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

  const [selectedKpId, setSelectedKpId] = useState('');
  const [selectedKpPath, setSelectedKpPath] = useState('');
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
  const [verifyingLlm, setVerifyingLlm] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; elapsedMs?: number; error?: string } | null>(null);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    theory: number;
    tips: number;
    examples: number;
    exercises: number;
  } | null>(null);

  const jsonSchemaExample = `{
  "theory": [
    "Definizione in LaTeX: $a^2+b^2=c^2$",
    "Secondo blocco teorico..."
  ],
  "tips": [
    "Suggerimento 1",
    "Suggerimento 2"
  ],
  "examples": [
    { "title": "Esempio guidato", "content": "Passo 1 ... $$x=\\\\frac{-b\\\\pm\\\\sqrt{b^2-4ac}}{2a}$$" }
  ],
  "exercises": [
    {
      "question": "Risolvi: $x^2-5x+6=0$",
      "answer": "x=2 oppure x=3",
      "hint": "Usa la fattorizzazione",
      "difficulty": 2
    }
  ]
}`;

  const generationPromptTemplate = `Genera un JSON valido con chiavi theory, tips, examples, exercises.
Regole:
1) usa formule in delimitatori KaTeX ($...$ o $$...$$)
2) exercises deve includere question, answer, hint, difficulty (1-4)
3) output solo JSON, nessun testo extra`;

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
      Promise.all([fetchPillars()]).finally(() => setLoading(false));
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

  async function verifyLlmConnection() {
    if (!apiKey.trim()) {
      setError('Inserisci una API key per verificare la connessione LLM');
      return;
    }
    setVerifyingLlm(true);
    setError('');
    setVerifyResult(null);
    try {
      const res = await fetch('/api/teacher/llm/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          model: model.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Verifica LLM fallita');
      }
      setVerifyResult({ ok: true, elapsedMs: data.elapsedMs });
    } catch (err: any) {
      setVerifyResult({ ok: false, error: err.message || 'Errore rete' });
      setError(err.message || 'Errore rete');
    } finally {
      setVerifyingLlm(false);
    }
  }

  async function importJsonBundle() {
    if (!selectedKpId) {
      setError('Seleziona prima un argomento');
      return;
    }
    if (!importJson.trim()) {
      setError('Inserisci JSON da importare');
      return;
    }

    setImporting(true);
    setError('');
    setImportResult(null);
    try {
      const res = await fetch('/api/teacher/exercises/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgePointId: selectedKpId,
          payload: importJson,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore import JSON');
      setImportResult(data.imported || null);
      await fetchExercises(selectedKpId);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setImporting(false);
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
            <TeacherTopicSelector
              selectedId={selectedKpId}
              onSelect={(selection) => {
                setSelectedKpId(selection.id);
                setSelectedKpPath(selection.pathLabel);
              }}
              onClear={() => {
                setSelectedKpId('');
                setSelectedKpPath('');
                setExercises([]);
              }}
            />
            {selectedKpPath && (
              <div className="text-xs text-gray-500 mt-2">
                Percorso didattico: {selectedKpPath}
              </div>
            )}
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

            <button
              type="button"
              onClick={verifyLlmConnection}
              disabled={verifyingLlm}
              className="neu-button w-full px-3 py-2 flex items-center justify-center gap-2 text-indigo-700 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {verifyingLlm ? 'Verifica in corso...' : 'Verifica connessione LLM'}
            </button>

            {verifyResult && (
              <div className={`text-xs p-2 rounded ${verifyResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {verifyResult.ok
                  ? `Connessione LLM OK (${verifyResult.elapsedMs} ms)`
                  : `Verifica fallita: ${verifyResult.error}`}
              </div>
            )}

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

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="neu-flat p-4 space-y-3">
            <h2 className="font-bold text-gray-800">Schema JSON per import</h2>
            <textarea
              className="neu-input w-full px-3 py-2 min-h-64 font-mono text-xs"
              value={jsonSchemaExample}
              readOnly
            />
            <p className="text-xs text-gray-500">
              Le formule possono essere scritte in KaTeX con delimitatori `$...$` o `$$...$$`.
            </p>
          </div>

          <div className="neu-flat p-4 space-y-3">
            <h2 className="font-bold text-gray-800">Prompt e importazione JSON</h2>
            <textarea
              className="neu-input w-full px-3 py-2 min-h-24 text-xs"
              value={generationPromptTemplate}
              readOnly
            />
            <textarea
              className="neu-input w-full px-3 py-2 min-h-64 font-mono text-xs"
              placeholder="Incolla qui il JSON generato dall'LLM"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
            <button
              type="button"
              onClick={importJsonBundle}
              disabled={importing || !selectedKpId}
              className="neu-button w-full px-3 py-2 bg-indigo-600 text-white disabled:opacity-50"
            >
              {importing ? 'Import in corso...' : 'Importa JSON in argomento selezionato'}
            </button>
            {importResult && (
              <div className="text-xs bg-green-50 text-green-700 p-2 rounded">
                Import completato: teoria {importResult.theory}, tips {importResult.tips}, esempi {importResult.examples}, esercizi {importResult.exercises}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
