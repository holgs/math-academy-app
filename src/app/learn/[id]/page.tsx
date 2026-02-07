'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Lock,
  Lightbulb,
  Target,
  Clock,
  Trophy,
  ChevronRight,
  Calculator
} from 'lucide-react';
import Link from 'next/link';
import KatexContent from '@/components/KatexContent';

interface KnowledgePoint {
  id: string;
  title: string;
  description: string;
  layer: number;
  prerequisites: string[];
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
  masteryLevel: number;
  importedTheory?: string[];
  importedTips?: string[];
  importedExamples?: Array<{ title?: string; content?: string }>;
}

interface Exercise {
  id: string;
  question: string;
  difficulty: number;
  hint: string | null;
  completed?: boolean;
}

interface LightbulbData {
  tips: string[];
  commonMistakes: string[];
  realWorldApps: string[];
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const kpId = params?.id as string;
  
  const [kp, setKp] = useState<KnowledgePoint | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lightbulb, setLightbulb] = useState<LightbulbData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tips' | 'exercises'>('overview');

  useEffect(() => {
    if (kpId) {
      fetchData();
    }
  }, [kpId]);

  const fetchData = async () => {
    try {
      const [kpRes, exercisesRes, lightbulbRes] = await Promise.all([
        fetch(`/api/knowledge-points/${kpId}`),
        fetch(`/api/exercises?kp=${kpId}`),
        fetch(`/api/knowledge-points/${kpId}/lightbulb`)
      ]);

      if (kpRes.ok) {
        const kpData = await kpRes.json();
        setKp(kpData);
      }

      if (exercisesRes.ok) {
        const exData = await exercisesRes.json();
        setExercises(exData.exercises || []);
      }

      if (lightbulbRes.ok) {
        const lbData = await lightbulbRes.json();
        setLightbulb(lbData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'MASTERED':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="w-6 h-6 text-amber-500" />;
      case 'AVAILABLE':
        return <Play className="w-6 h-6 text-blue-500" />;
      default:
        return <Lock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MASTERED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'AVAILABLE':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'MASTERED':
        return 'Completato';
      case 'IN_PROGRESS':
        return 'In corso';
      case 'AVAILABLE':
        return 'Disponibile';
      default:
        return 'Bloccato';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC]">
        <div className="neu-convex p-8">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!kp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC]">
        <div className="neu-flat p-8 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Argomento non trovato</h2>
          <p className="text-gray-500 mb-4">Il knowledge point richiesto non esiste.</p>
          <Link href="/dashboard" className="neu-button px-6 py-2 inline-block">
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (kp.status === 'LOCKED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0E5EC] p-4">
        <div className="neu-flat p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Argomento Bloccato</h2>
          <p className="text-gray-500 mb-4">
            Devi completare i prerequisiti prima di accedere a questo argomento.
          </p>
          {kp.prerequisites.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Prerequisiti richiesti:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {kp.prerequisites.map((prereq) => (
                  <span key={prereq} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {prereq}
                  </span>
                ))}
              </div>
            </div>
          )}
          <Link href="/dashboard" className="neu-button px-6 py-2 inline-block">
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const mergedTips = [
    ...(Array.isArray(kp.importedTips) ? kp.importedTips.map((t) => String(t)) : []),
    ...(lightbulb?.tips || []),
  ];

  return (
    <div className="min-h-screen bg-[#E0E5EC]">
      {/* Header */}
      <header className="neu-flat m-4 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="neu-button p-2 flex items-center gap-2 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {getStatusIcon(kp.status)}
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(kp.status)}`}>
              {getStatusLabel(kp.status)}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="neu-flat p-6 mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="neu-convex w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{kp.title}</h1>
              <KatexContent className="text-gray-600 mb-4" content={kp.description} />
              
              {kp.status !== 'MASTERED' && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progresso</span>
                      <span className="font-bold text-gray-800">{Math.round(kp.masteryLevel)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent-success transition-all duration-500"
                        style={{ width: `${kp.masteryLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Panoramica', icon: BookOpen },
            { id: 'tips', label: '💡 Lampadina', icon: Lightbulb },
            { id: 'exercises', label: 'Esercizi', icon: Calculator },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`neu-button px-4 py-2 flex items-center gap-2 ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Theory Card */}
              <div className="neu-flat p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Teoria
                </h3>
                <div className="prose prose-gray max-w-none">
                  <KatexContent
                    className="text-gray-600 leading-relaxed"
                    content={`${kp.description}. Questo argomento fa parte del livello ${kp.layer + 1} del percorso di apprendimento.`}
                  />
                  {Array.isArray(kp.importedTheory) && kp.importedTheory.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {kp.importedTheory.map((block, idx) => (
                        <KatexContent key={`th-${idx}`} className="text-gray-700" content={String(block)} />
                      ))}
                    </div>
                  )}
                  {Array.isArray(kp.importedExamples) && kp.importedExamples.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {kp.importedExamples.map((item, idx) => (
                        <div key={`imp-ex-${idx}`} className="p-3 bg-indigo-50 rounded-xl">
                          <p className="font-semibold text-indigo-800 mb-1">{item.title || `Esempio ${idx + 1}`}</p>
                          <KatexContent className="text-indigo-700" content={String(item.content || '')} isHtml />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                    <h4 className="font-semibold text-blue-800 mb-2">Cosa imparerai:</h4>
                    <ul className="list-disc list-inside text-blue-700 space-y-1">
                      <li>Concetti fondamentali di {kp.title}</li>
                      <li>Applicazioni pratiche</li>
                      <li>Esercizi guidati di varia difficoltà</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Prerequisites Card */}
              <div className="neu-flat p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Prerequisiti
                </h3>
                {kp.prerequisites.length > 0 ? (
                  <ul className="space-y-2">
                    {kp.prerequisites.map((prereq, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{prereq}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">Nessun prerequisito richiesto - questo è un argomento base!</p>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3">Prossimi passi:</h4>
                  <Link 
                    href={`/exercises?kp=${kp.id}`}
                    className="neu-button w-full py-3 flex items-center justify-center gap-2 bg-accent-success text-white font-semibold"
                  >
                    <Play className="w-5 h-5" />
                    Inizia Esercitazione
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tips' && lightbulb && (
            <div className="space-y-6">
              {/* Tips */}
              <div className="neu-flat p-6">
                <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  💡 Suggerimenti
                </h3>
                <ul className="space-y-3">
                  {mergedTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <KatexContent className="text-gray-700" content={tip} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Mistakes */}
              <div className="neu-flat p-6">
                <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  ⚠️ Errori Comuni
                </h3>
                <ul className="space-y-3">
                  {lightbulb.commonMistakes.map((mistake, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        !
                      </span>
                      <KatexContent className="text-gray-700" content={mistake} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Real World Applications */}
              <div className="neu-flat p-6">
                <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  🌍 Applicazioni Reali
                </h3>
                <ul className="space-y-3">
                  {lightbulb.realWorldApps.map((app, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <KatexContent className="text-gray-700" content={app} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'exercises' && (
            <div className="neu-flat p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-600" />
                Esercizi Disponibili
              </h3>
              
              {exercises.length > 0 ? (
                <div className="space-y-3">
                  {exercises.map((ex, idx) => (
                    <div 
                      key={ex.id}
                      className={`p-4 rounded-xl border ${
                        ex.completed 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-gray-600">
                            {idx + 1}
                          </span>
                          <div>
                            <KatexContent className="font-medium text-gray-800" content={ex.question} />
                            <p className="text-sm text-gray-500">Difficoltà: {'★'.repeat(ex.difficulty)}</p>
                          </div>
                        </div>
                        {ex.completed && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <Link 
                    href={`/exercises?kp=${kp.id}`}
                    className="neu-button w-full py-3 mt-4 flex items-center justify-center gap-2 bg-accent-success text-white font-semibold"
                  >
                    <Play className="w-5 h-5" />
                    {kp.status === 'MASTERED' ? 'Ripeti Esercitazione' : 'Inizia Esercitazione'}
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nessun esercizio disponibile per questo argomento.</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
