'use client';

import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, LogOut, Plus, Save, Trash2, Search, ArrowLeft } from 'lucide-react';

type Teacher = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: {
    lessons: number;
    attempts: number;
    progress: number;
  };
};

type Stats = {
  totalUsers: number;
  totalStudents: number;
  totalXp: number;
  masteredPoints: number;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, router]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
      ]);
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      if (!usersRes.ok) throw new Error(usersData.error || 'Errore caricamento docenti');
      if (!statsRes.ok) throw new Error(statsData.error || 'Errore caricamento statistiche');
      const allUsers = Array.isArray(usersData.users) ? usersData.users : [];
      setTeachers(allUsers.filter((user: Teacher) => user.role === 'TEACHER'));
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  async function createTeacher(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const normalizedEmail = createForm.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new Error('Email non valida');
      }
      if (createForm.password.length < 8) {
        throw new Error('Password minima: 8 caratteri');
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, email: normalizedEmail, role: 'TEACHER' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore creazione docente');
      setCreateForm({ name: '', email: '', password: '' });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function updateTeacher(id: string) {
    setError('');
    try {
      const normalizedEmail = editForm.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new Error('Email non valida');
      }
      if (editForm.password.trim() && editForm.password.trim().length < 8) {
        throw new Error('Password minima: 8 caratteri');
      }

      const payload: Record<string, string> = {
        id,
        role: 'TEACHER',
        name: editForm.name,
        email: normalizedEmail,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore aggiornamento docente');
      setEditingId(null);
      setEditForm({ name: '', email: '', password: '' });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function deleteTeacher(id: string) {
    if (!confirm('Eliminare questo docente?')) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore eliminazione docente');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  const filtered = teachers.filter((teacher) => {
    const s = search.toLowerCase();
    return (teacher.name || '').toLowerCase().includes(s) || teacher.email.toLowerCase().includes(s);
  });

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC]">Caricamento...</div>;
  }

  return (
    <div className="min-h-screen bg-[#E0E5EC] p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="neu-flat p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin - Gestione Docenti</h1>
            <p className="text-sm text-gray-500">CRUD docenti + cambio password</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="neu-button px-3 py-2 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="neu-button px-3 py-2 text-red-600 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {error && <div className="neu-flat p-3 text-sm text-red-600 bg-red-50">{error}</div>}
        {teachers.length === 0 && (
          <div className="neu-flat p-3 text-sm text-amber-700 bg-amber-50">
            Nessun docente trovato. Nota: il docente hardcoded viene creato nel DB al suo primo login.
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="neu-flat p-3">
            <p className="text-xs text-gray-500">Totale utenti</p>
            <p className="text-xl font-bold">{stats?.totalUsers || 0}</p>
          </div>
          <div className="neu-flat p-3">
            <p className="text-xs text-gray-500">Studenti</p>
            <p className="text-xl font-bold">{stats?.totalStudents || 0}</p>
          </div>
          <div className="neu-flat p-3">
            <p className="text-xs text-gray-500">XP totale</p>
            <p className="text-xl font-bold">{stats?.totalXp || 0}</p>
          </div>
          <div className="neu-flat p-3">
            <p className="text-xs text-gray-500">KP masterati</p>
            <p className="text-xl font-bold">{stats?.masteredPoints || 0}</p>
          </div>
        </div>

        <form noValidate onSubmit={createTeacher} className="neu-flat p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="neu-input px-3 py-2"
            placeholder="Nome docente"
            value={createForm.name}
            onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            className="neu-input px-3 py-2"
            type="text"
            placeholder="Email docente"
            value={createForm.email}
            onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            className="neu-input px-3 py-2"
            type="password"
            placeholder="Password iniziale"
            value={createForm.password}
            onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
            required
          />
          <button className="neu-button bg-purple-600 text-white px-3 py-2 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Crea docente
          </button>
        </form>

        <div className="neu-flat p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              Elenco docenti
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="neu-input pl-8 pr-3 py-2 text-sm"
                placeholder="Cerca docente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2">Docente</th>
                  <th className="py-2">Lezioni</th>
                  <th className="py-2">Creato</th>
                  <th className="py-2 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((teacher) => {
                  const editing = editingId === teacher.id;
                  return (
                    <tr key={teacher.id} className="border-b border-gray-100">
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
                            <div className="font-medium text-gray-800">{teacher.name || 'Docente'}</div>
                            <div className="text-gray-500">{teacher.email}</div>
                          </>
                        )}
                      </td>
                      <td className="py-3">{teacher._count.lessons}</td>
                      <td className="py-3">{new Date(teacher.createdAt).toLocaleDateString('it-IT')}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          {editing ? (
                            <>
                              <button
                                className="neu-button px-2 py-1 text-green-700 flex items-center gap-1"
                                onClick={() => updateTeacher(teacher.id)}
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
                                className="neu-button px-2 py-1"
                                onClick={() => {
                                  setEditingId(teacher.id);
                                  setEditForm({ name: teacher.name || '', email: teacher.email, password: '' });
                                }}
                              >
                                Modifica / password
                              </button>
                              <button
                                className="neu-button px-2 py-1 text-red-600 flex items-center gap-1"
                                onClick={() => deleteTeacher(teacher.id)}
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
