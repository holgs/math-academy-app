'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, ClipboardList, PlusCircle } from 'lucide-react';

type Classroom = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
};

type KnowledgePoint = {
  id: string;
  title: string;
  layer: number;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  spacedLearningEnabled: boolean;
  knowledgePoint: { id: string; title: string };
  classroom: { id: string; name: string } | null;
  studentsCount: number;
  exercisesCount: number;
  completedCount: number;
  avgProgress: number;
};

export default function TeacherAssignmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [classes, setClasses] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [topics, setTopics] = useState<KnowledgePoint[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    classId: '',
    knowledgePointId: '',
    exerciseCount: 5,
    spacedLearningEnabled: true,
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);

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
      bootstrap();
    }
  }, [status, session, router]);

  async function bootstrap() {
    setLoading(true);
    setError('');
    try {
      const [classesRes, studentsRes, topicsRes, assignmentsRes] = await Promise.all([
        fetch('/api/teacher/classes'),
        fetch('/api/teacher/students'),
        fetch('/api/teacher/knowledge-points?mode=flat'),
        fetch('/api/teacher/assignments'),
      ]);

      const [classesData, studentsData, topicsData, assignmentsData] = await Promise.all([
        classesRes.json(),
        studentsRes.json(),
        topicsRes.json(),
        assignmentsRes.json(),
      ]);

      if (!classesRes.ok) throw new Error(classesData.error || 'Errore classi');
      if (!studentsRes.ok) throw new Error(studentsData.error || 'Errore studenti');
      if (!topicsRes.ok) throw new Error(topicsData.error || 'Errore argomenti');
      if (!assignmentsRes.ok) throw new Error(assignmentsData.error || 'Errore compiti');

      setClasses((classesData.classes || []).map((c: any) => ({ id: c.id, name: c.name })));
      setStudents((studentsData.students || []).map((s: any) => ({ id: s.id, name: s.name, email: s.email })));
      setTopics((topicsData.points || []).map((p: any) => ({ id: p.id, title: p.title, layer: p.layer })));
      setAssignments(assignmentsData.assignments || []);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  const subtopicCandidates = useMemo(() => {
    if (!form.knowledgePointId) return [] as KnowledgePoint[];
    const selected = topics.find((t) => t.id === form.knowledgePointId);
    if (!selected) return [];
    return topics.filter((t) => t.layer >= selected.layer && t.id !== selected.id).slice(0, 12);
  }, [topics, form.knowledgePointId]);

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.dueDate) {
      setError('Inserisci una scadenza');
      return;
    }

    try {
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          classId: form.classId || undefined,
          studentIds: selectedStudents,
          subtopics: selectedSubtopics,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore creazione compito');

      setForm({
        title: '',
        description: '',
        dueDate: '',
        classId: '',
        knowledgePointId: '',
        exerciseCount: 5,
        spacedLearningEnabled: true,
      });
      setSelectedStudents([]);
      setSelectedSubtopics([]);
      await bootstrap();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents((prev) => prev.includes(studentId)
      ? prev.filter((id) => id !== studentId)
      : [...prev, studentId]
    );
  }

  function toggleSubtopic(topicId: string) {
    setSelectedSubtopics((prev) => prev.includes(topicId)
      ? prev.filter((id) => id !== topicId)
      : [...prev, topicId]
    );
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC]">Caricamento...</div>;
  }

  return (
    <div className="min-h-screen bg-[#E0E5EC] p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="neu-flat p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              Assegnazione Compiti
            </h1>
            <p className="text-sm text-gray-500">Classe o singolo studente, scadenza e spaced learning automatico</p>
          </div>
          <Link href="/teacher" className="neu-button px-4 py-2 text-gray-700">Dashboard docente</Link>
        </div>

        {error && <div className="neu-flat p-3 bg-red-50 text-red-600 text-sm">{error}</div>}

        <form onSubmit={createAssignment} className="neu-flat p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="neu-input px-3 py-2"
              placeholder="Titolo compito"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <input
              className="neu-input px-3 py-2"
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              required
            />
          </div>

          <textarea
            className="neu-input w-full px-3 py-2 min-h-20"
            placeholder="Descrizione (opzionale)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="grid md:grid-cols-3 gap-3">
            <select
              className="neu-input px-3 py-2"
              value={form.classId}
              onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))}
            >
              <option value="">Nessuna classe (solo selezione studenti)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            <select
              className="neu-input px-3 py-2"
              value={form.knowledgePointId}
              onChange={(e) => setForm((prev) => ({ ...prev, knowledgePointId: e.target.value }))}
              required
            >
              <option value="">Argomento principale</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>{'  '.repeat(topic.layer)}L{topic.layer + 1} - {topic.title}</option>
              ))}
            </select>

            <input
              className="neu-input px-3 py-2"
              type="number"
              min={1}
              max={30}
              value={form.exerciseCount}
              onChange={(e) => setForm((prev) => ({ ...prev, exerciseCount: Number(e.target.value) }))}
            />
          </div>

          {subtopicCandidates.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Sotto-argomenti (opzionale)</p>
              <div className="grid md:grid-cols-2 gap-2 max-h-40 overflow-auto">
                {subtopicCandidates.map((topic) => (
                  <label key={topic.id} className="neu-button px-3 py-2 text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSubtopics.includes(topic.id)}
                      onChange={() => toggleSubtopic(topic.id)}
                    />
                    <span>{'  '.repeat(topic.layer)}{topic.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600 mb-2">Assegna granularmente a studenti (opzionale)</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-auto">
              {students.map((student) => (
                <label key={student.id} className="neu-button px-3 py-2 text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span>{student.name || student.email}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="text-sm text-gray-700 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.spacedLearningEnabled}
              onChange={(e) => setForm((prev) => ({ ...prev, spacedLearningEnabled: e.target.checked }))}
            />
            Attiva spaced learning: inserisci automaticamente problemi futuri sugli stessi argomenti
          </label>

          <button className="neu-button bg-indigo-600 text-white px-3 py-2 w-full flex items-center justify-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Crea e assegna compito
          </button>
        </form>

        <div className="neu-flat p-4">
          <h2 className="font-bold text-gray-800 mb-3">Compiti creati</h2>
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="neu-button p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{assignment.title}</p>
                  <p className="text-xs text-gray-500">
                    {assignment.knowledgePoint.title}
                    {assignment.classroom ? ` - Classe ${assignment.classroom.name}` : ' - Assegnazione individuale'}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                    <CalendarClock className="w-3 h-3" />
                    Scadenza: {new Date(assignment.dueDate).toLocaleString('it-IT')}
                  </p>
                </div>
                <div className="text-xs text-gray-600 md:text-right">
                  <p>Studenti: {assignment.studentsCount}</p>
                  <p>Esercizi: {assignment.exercisesCount}</p>
                  <p>Completati: {assignment.completedCount}</p>
                  <p className="flex items-center gap-1 md:justify-end">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    Avanzamento medio: {Math.round(assignment.avgProgress)}%
                  </p>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <p className="text-sm text-gray-500">Nessun compito creato.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
