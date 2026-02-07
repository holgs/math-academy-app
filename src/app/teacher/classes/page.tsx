'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Upload, Users, Plus, Trash2 } from 'lucide-react';

type ClassSummary = {
  id: string;
  name: string;
  _count: {
    enrollments: number;
    assignments: number;
  };
  enrollments: Array<{
    student: {
      id: string;
      name: string | null;
      email: string;
      level: number;
      xp: number;
    };
  }>;
};

type ImportResult = {
  email: string;
  name: string;
  generatedPassword?: string;
  status: string;
};

export default function TeacherClassesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [className, setClassName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

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
      fetchClasses();
    }
  }, [status, session, router]);

  async function fetchClasses() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/teacher/classes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento classi');
      setClasses(data.classes || []);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setImportResults([]);
    try {
      const res = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: className,
          csv: csvText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore creazione classe');

      setClassName('');
      setCsvText('');
      setImportResults(data.imported || []);
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function importIntoClass(classId: string) {
    if (!csvText.trim()) {
      setError('Incolla prima un CSV con nome,cognome,email');
      return;
    }

    setError('');
    setImportResults([]);
    try {
      const res = await fetch('/api/teacher/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore import CSV');
      setImportResults(data.imported || []);
      setCsvText('');
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function deleteClass(classId: string) {
    if (!confirm('Eliminare questa classe?')) return;
    setError('');
    try {
      const res = await fetch(`/api/teacher/classes?classId=${encodeURIComponent(classId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore eliminazione classe');
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC]">Caricamento...</div>;
  }

  return (
    <div className="min-h-screen bg-[#E0E5EC] p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="neu-flat p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              Classi Docente
            </h1>
            <p className="text-sm text-gray-500">Crea classi e importa studenti via CSV (nome,cognome,email)</p>
          </div>
          <Link href="/teacher" className="neu-button px-4 py-2 text-gray-700">Dashboard docente</Link>
        </div>

        {error && <div className="neu-flat p-3 bg-red-50 text-red-600 text-sm">{error}</div>}

        <form onSubmit={createClass} className="neu-flat p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="neu-input px-3 py-2"
              placeholder="Nome classe (es. 2A)"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
            />
            <button className="neu-button bg-purple-600 text-white px-3 py-2 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Crea classe + importa CSV
            </button>
          </div>

          <textarea
            className="neu-input w-full px-3 py-2 min-h-32"
            placeholder={'nome,cognome,email\nMario,Rossi,mario.rossi@email.it\nAnna,Bianchi,anna.bianchi@email.it'}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Il CSV deve avere 3 colonne: nome,cognome,email. Le password iniziali vengono generate automaticamente.
          </p>
        </form>

        {importResults.length > 0 && (
          <div className="neu-flat p-4">
            <h2 className="font-bold text-gray-800 mb-2">Esito import CSV</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2">Studente</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Stato</th>
                    <th className="py-2">Password iniziale</th>
                  </tr>
                </thead>
                <tbody>
                  {importResults.map((item, idx) => (
                    <tr key={`${item.email}-${idx}`} className="border-b border-gray-100">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2">{item.email}</td>
                      <td className="py-2">{item.status}</td>
                      <td className="py-2 font-mono">{item.generatedPassword || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {classes.map((classroom) => (
            <div key={classroom.id} className="neu-flat p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">{classroom.name}</h3>
                <button
                  className="neu-button px-3 py-1 text-red-600 flex items-center gap-1"
                  onClick={() => deleteClass(classroom.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Elimina
                </button>
              </div>

              <div className="text-sm text-gray-600 flex items-center gap-4">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {classroom._count.enrollments} studenti</span>
                <span>{classroom._count.assignments} compiti</span>
              </div>

              <button
                className="neu-button w-full px-3 py-2 text-purple-700 flex items-center justify-center gap-2"
                onClick={() => importIntoClass(classroom.id)}
              >
                <Upload className="w-4 h-4" />
                Importa CSV in questa classe
              </button>

              <div className="text-xs text-gray-500 space-y-1">
                {classroom.enrollments.length === 0 && <p>Nessuno studente in classe.</p>}
                {classroom.enrollments.map((enrollment) => (
                  <p key={enrollment.student.id}>
                    {enrollment.student.name || 'Studente'} - {enrollment.student.email}
                  </p>
                ))}
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="neu-flat p-6 text-sm text-gray-500">Nessuna classe creata.</div>
          )}
        </div>
      </div>
    </div>
  );
}
