'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Presentation,
  Users,
  BookOpen,
  TrendingUp,
  Calendar,
  Clock,
  ChevronRight,
  Award,
  AlertTriangle,
  CheckCircle,
  Activity,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalStudents: number;
  activeLessons: number;
  avgMastery: number;
  lessonsThisWeek: number;
}

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  masteryAvg: number;
  streak: number;
  lastActivity: string | null;
}

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeLessons: 0,
    avgMastery: 0,
    lessonsThisWeek: 0,
  });
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role === 'STUDENT') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user?.role === 'TEACHER' || session?.user?.role === 'ADMIN')) {
      fetchDashboardData();
    }
  }, [status, session]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, studentsRes] = await Promise.all([
        fetch('/api/teacher/stats'),
        fetch('/api/teacher/students'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || stats);
      }

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC]">
        <div className="neu-convex p-8">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E0E5EC]">
      {/* Header */}
      <header className="neu-flat m-4 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="neu-convex w-12 h-12 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Dashboard Docente</h1>
              <p className="text-sm text-gray-500">
                Benvenuto, {session?.user?.name || 'Professore'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="neu-button px-4 py-2 text-gray-600 hidden sm:flex items-center gap-2">
              Vista Studente
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="neu-flat p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500">Studenti</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="neu-flat p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Presentation className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.activeLessons}</p>
                <p className="text-xs text-gray-500">Lezioni</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="neu-flat p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.avgMastery}%</p>
                <p className="text-xs text-gray-500">Media Mastery</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="neu-flat p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.lessonsThisWeek}</p>
                <p className="text-xs text-gray-500">Questa settimana</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="neu-flat p-6 h-full">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Azioni Rapide
              </h2>

              <div className="space-y-3">
                <Link
                  href="/teacher/lessons"
                  className="neu-button w-full p-4 flex items-center justify-between hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Presentation className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">Gestisci Lezioni LIM</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                <Link
                  href="/teacher/lessons/new"
                  className="neu-button w-full p-4 flex items-center justify-between bg-purple-600 text-white"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5" />
                    <span className="font-medium">Crea Nuova Lezione</span>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/admin"
                  className="neu-button w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">Pannello Admin</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Students Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2"
          >
            <div className="neu-flat p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Progressi Studenti
                </h2>
                <Link href="/teacher/students" className="text-sm text-purple-600 hover:underline">
                  Vedi tutti
                </Link>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nessuno studente ancora registrato</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Gli studenti appariranno qui quando si registreranno
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.slice(0, 5).map((student, idx) => (
                    <div
                      key={student.id}
                      className="neu-convex p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">
                          {student.name?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{student.name || 'Studente'}</p>
                          <p className="text-xs text-gray-500">Livello {student.level} • {student.xp} XP</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-gray-800">{Math.round(student.masteryAvg)}%</p>
                          <p className="text-xs text-gray-500">Mastery</p>
                        </div>

                        {student.streak > 0 && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <span className="text-sm">🔥</span>
                            <span className="text-sm font-bold">{student.streak}</span>
                          </div>
                        )}

                        {student.masteryAvg >= 80 ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : student.masteryAvg < 50 ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 neu-flat p-6 bg-gradient-to-r from-purple-50 to-blue-50"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-1">Suggerimento del giorno</h3>
              <p className="text-gray-600 text-sm">
                Usa le lezioni LIM per presentare gli argomenti in classe, poi assegna gli esercizi
                sull'app per il ripasso a casa. Il sistema di spaced repetition aiuterà gli studenti
                a consolidare la memoria a lungo termine.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
