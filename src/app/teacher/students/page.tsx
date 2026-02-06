'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Trash2, Save, KeyRound, Search } from 'lucide-react';

type Student = {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  masteryAvg: number;
  masteredCount: number;
  activeCount: number;
  attemptsCount: number;
};

export default function TeacherStudentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (status === 'authenticated' && session?.user?.role === 'STUDENT') {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated') {
      fetchStudents();
    }
  }, [status, session, router]);

  async function fetchStudents() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/teacher/students');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore caricamento studenti');
      }
      setStudents(data.students || []);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  async function createStudent(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore creazione studente');
      }
      setNewStudent({ name: '', email: '', password: '' });
      await fetchStudents();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function updateStudent(id: string) {
    setError('');
    try {
      const payload: Record<string, string> = {
        id,
        name: editForm.name,
        email: editForm.email,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch('/api/teacher/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore aggiornamento studente');
      }
      setEditingId(null);
      setEditForm({ name: '', email: '', password: '' });
      await fetchStudents();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function deleteStudent(id: string) {
    if (!confirm('Eliminare questo studente?')) return;
    setError('');
    try {
      const res = await fetch(`/api/teacher/students?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore eliminazione studente');
      }
      await fetchStudents();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  const filtered = students.filter((student) => {
    const s = search.toLowerCase();
    return student.name?.toLowerCase().includes(s) || student.email.toLowerCase().includes(s);
  });

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC]">Caricamento...</div>;
  }

  return (
    <div className="min-h-screen bg-[#E0E5EC] p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="neu-flat p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Gestione Studenti
            </h1>
            <p className="text-sm text-gray-500">CRUD studenti + statistiche</p>
          </div>
          <Link href="/teacher" className="neu-button px-4 py-2 text-gray-700">
            Dashboard docente
          </Link>
        </div>

        {error && (
          <div className="neu-flat p-3 text-sm text-red-600 bg-red-50">{error}</div>
        )}

        <form onSubmit={createStudent} className="neu-flat p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="neu-input px-3 py-2"
            placeholder="Nome studente"
            value={newStudent.name}
            onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            className="neu-input px-3 py-2"
            placeholder="Email"
            type="email"
            value={newStudent.email}
            onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            className="neu-input px-3 py-2"
            placeholder="Password iniziale"
            type="password"
            value={newStudent.password}
            onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
            required
          />
          <button className="neu-button bg-purple-600 text-white px-3 py-2 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Crea studente
          </button>
        </form>

        <div className="neu-flat p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">Studenti: {filtered.length}</div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="neu-input pl-8 pr-3 py-2 text-sm"
                placeholder="Cerca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2">Studente</th>
                  <th className="py-2">Livello</th>
                  <th className="py-2">XP</th>
                  <th className="py-2">Mastery</th>
                  <th className="py-2">Statistiche</th>
                  <th className="py-2 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => {
                  const editing = editingId === student.id;
                  return (
                    <tr key={student.id} className="border-b border-gray-100">
                      <td className="py-3">
                        {editing ? (
                          <div className="space-y-2">
                            <input
                              className="neu-input px-2 py-1 w-full"
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <input
                              className="neu-input px-2 py-1 w-full"
                              value={editForm.email}
                              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                            <input
                              className="neu-input px-2 py-1 w-full"
                              type="password"
                              placeholder="Nuova password (opzionale)"
                              value={editForm.password}
                              onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-gray-800">{student.name}</div>
                            <div className="text-gray-500">{student.email}</div>
                          </>
                        )}
                      </td>
                      <td className="py-3">{student.level}</td>
                      <td className="py-3">{student.xp}</td>
                      <td className="py-3">{Math.round(student.masteryAvg)}%</td>
                      <td className="py-3 text-xs text-gray-600">
                        Mastered: {student.masteredCount} | Attivi: {student.activeCount} | Tentativi: {student.attemptsCount}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          {editing ? (
                            <>
                              <button
                                className="neu-button px-2 py-1 text-green-700 flex items-center gap-1"
                                onClick={() => updateStudent(student.id)}
                              >
                                <Save className="w-4 h-4" /> Salva
                              </button>
                              <button
                                className="neu-button px-2 py-1"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditForm({ name: '', email: '', password: '' });
                                }}
                              >
                                Annulla
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="neu-button px-2 py-1 flex items-center gap-1"
                                onClick={() => {
                                  setEditingId(student.id);
                                  setEditForm({ name: student.name || '', email: student.email, password: '' });
                                }}
                              >
                                <KeyRound className="w-4 h-4" /> Modifica
                              </button>
                              <button
                                className="neu-button px-2 py-1 text-red-600 flex items-center gap-1"
                                onClick={() => deleteStudent(student.id)}
                              >
                                <Trash2 className="w-4 h-4" /> Elimina
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
