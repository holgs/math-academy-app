'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Presentation, 
  Plus, 
  Calendar,
  Clock,
  Users,
  ChevronRight,
  BookOpen,
  Play,
  Trash2,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: string;
  description: string;
  knowledgePointId: string;
  knowledgePointTitle?: string;
  knowledgePoint?: { title: string };
  createdAt: string;
  inClassTimerMinutes: number;
  passThresholdPercent: number;
  lastSuccessPercent: number | null;
  slides: Slide[];
}

interface Slide {
  id: string;
  type: 'content' | 'example' | 'exercise' | 'summary';
  title: string;
  content: string;
}

export default function TeacherLessons() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role === 'STUDENT') {
      router.push('/dashboard');
    } else if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'TEACHER') {
      fetchLessons();
    }
  }, [status, session]);

  const fetchLessons = async () => {
    try {
      const res = await fetch('/api/teacher/lessons');
      if (res.ok) {
        const data = await res.json();
        setLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa lezione?')) return;
    
    try {
      const res = await fetch(`/api/teacher/lessons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLessons(lessons.filter(l => l.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete lesson:', error);
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
              <Presentation className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Lezioni LIM</h1>
              <p className="text-sm text-gray-500">Gestisci le tue lezioni frontali</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="neu-button px-4 py-2 text-gray-600 hidden sm:flex items-center gap-2"
            >
              Dashboard
            </Link>
            <Link 
              href="/teacher/lessons/new"
              className="neu-button px-4 py-2 bg-purple-600 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuova Lezione</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {lessons.length === 0 ? (
          <div className="neu-flat p-12 text-center">
            <div className="neu-convex w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Presentation className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Nessuna lezione ancora</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Crea la tua prima lezione per la LIM. Puoi generarla automaticamente con l'AI 
              o crearla manualmente.
            </p>
            <Link 
              href="/teacher/lessons/new"
              className="neu-button px-6 py-3 bg-purple-600 text-white inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Crea Lezione
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Lesson Card */}
            <Link href="/teacher/lessons/new">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="neu-flat p-6 h-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-purple-400 transition-colors"
              >
                <div className="neu-convex w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-purple-600" />
                </div>
                <p className="font-semibold text-gray-600">Crea Nuova Lezione</p>
              </motion.div>
            </Link>

            {/* Lesson Cards */}
            {lessons.map((lesson, index) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="neu-flat p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="neu-convex w-10 h-10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/teacher/lessons/new?edit=${lesson.id}`}
                      className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(lesson.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-gray-800 mb-2">{lesson.title}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{lesson.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <BookOpen className="w-3 h-3" />
                    <span>{lesson.knowledgePoint?.title || lesson.knowledgePointTitle || 'Argomento'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Presentation className="w-3 h-3" />
                    <span>{lesson.slides?.length || 0} slide</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Timer: {lesson.inClassTimerMinutes || 15} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users className="w-3 h-3" />
                    <span>Soglia: {lesson.passThresholdPercent || 70}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ChevronRight className="w-3 h-3" />
                    <span>Successo: {lesson.lastSuccessPercent ?? 'n/d'}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(lesson.createdAt).toLocaleDateString('it-IT')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/teacher/lessons/${lesson.id}/present`}
                    className="neu-button w-full py-2 flex items-center justify-center gap-2 bg-purple-600 text-white"
                  >
                    <Play className="w-4 h-4" />
                    Presenta
                  </Link>
                  <a
                    href={`/api/teacher/lessons/${lesson.id}/pdf`}
                    className="neu-button w-full py-2 flex items-center justify-center gap-2 text-gray-700"
                  >
                    PDF
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
