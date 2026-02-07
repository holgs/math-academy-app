'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Coins,
  Flame,
  Target,
  BookOpen,
  Star,
  Bot,
  Clock,
  Save,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';
import LLMSettingsPanel from './LLMSettingsPanel';
import Link from 'next/link';

interface UserStats {
  xp: number;
  coins: number;
  level: number;
  streak: number;
  nextLevelXp: number;
}

interface StudentAssignment {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  progressPct: number;
  exercisesCount: number;
}

interface StudentAttempt {
  id: string;
  question: string;
  knowledgePointTitle: string;
  isCorrect: boolean;
  xpEarned: number;
  coinsEarned: number;
  createdAt: string;
}

interface StudentProfile {
  nickname: string;
  avatarUrl: string;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [activity, setActivity] = useState<StudentAttempt[]>([]);
  const [profile, setProfile] = useState<StudentProfile>({ nickname: '', avatarUrl: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  const user = session?.user as {
    name?: string | null;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    xp: number;
    coins: number;
    level: number;
    streak: number;
    nickname?: string | null;
    avatarUrl?: string | null;
  } | undefined;

  useEffect(() => {
    fetchStats();
    fetchAssignments();
    fetchActivity();
    fetchProfile();
    checkLLMConfig();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/user/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // no-op
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/student/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch {
      // no-op
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/student/activity');
      if (res.ok) {
        const data = await res.json();
        setActivity(data.attempts || []);
      }
    } catch {
      // no-op
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/student/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile({
          nickname: data.profile?.nickname || user?.nickname || '',
          avatarUrl: data.profile?.avatarUrl || user?.avatarUrl || '',
        });
      }
    } catch {
      setProfile({
        nickname: user?.nickname || '',
        avatarUrl: user?.avatarUrl || '',
      });
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
        }),
      });
      await fetchProfile();
    } finally {
      setSavingProfile(false);
    }
  };

  const checkLLMConfig = () => {
    const saved = localStorage.getItem('mathacademy_llm_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfiguredProviders(Object.keys(parsed));
    }
  };

  const handleSettingsConfigured = () => {
    checkLLMConfig();
    setShowSettings(false);
  };

  const displayStats = stats || {
    xp: user?.xp || 0,
    coins: user?.coins || 0,
    level: user?.level || 1,
    streak: user?.streak || 0,
    nextLevelXp: 100,
  };

  const xpProgress = stats ? (stats.xp / stats.nextLevelXp) * 100 : 0;

  const statsCards = [
    {
      icon: Trophy,
      label: 'XP',
      value: displayStats.xp,
      subtext: `/${displayStats.nextLevelXp}`,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      showProgress: true,
      progress: xpProgress,
    },
    {
      icon: Coins,
      label: 'Monete pi-greco',
      value: displayStats.coins,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      icon: Flame,
      label: 'Streak',
      value: `${displayStats.streak}`,
      subtext: 'giorni',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      icon: Star,
      label: 'Livello',
      value: displayStats.level,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const nextAssignment = assignments[0];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#E0E5EC]">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div className="flex items-center gap-3">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold">
                {(profile.nickname || user?.name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Ciao, {profile.nickname || user?.name || 'Studente'}!</h1>
              <p className="text-gray-600">Compiti, progressi e mappa conoscenza in un unico posto.</p>
            </div>
          </div>

          <div className="flex gap-2">
            {nextAssignment ? (
              <Link href={`/exercises?assignment=${nextAssignment.id}`} className="neu-button px-4 py-2 bg-indigo-600 text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Apri prossimo compito
              </Link>
            ) : (
              <Link href="/exercises" className="neu-button px-4 py-2 bg-indigo-600 text-white">Vai agli esercizi</Link>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`neu-button px-4 py-2 flex items-center gap-2 ${configuredProviders.length > 0 ? 'text-green-600' : 'text-gray-600'}`}
            >
              <Bot size={18} />
              AI ({configuredProviders.length})
            </button>
          </div>
        </motion.div>

        {showSettings && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <LLMSettingsPanel onClose={() => setShowSettings(false)} onConfigured={handleSettingsConfigured} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="neu-flat p-5 relative overflow-hidden"
            >
              {stat.showProgress && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                  <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${stat.progress}%` }} />
                </div>
              )}
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-sm text-gray-500">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
                {stat.subtext && <span className="text-sm text-gray-400">{stat.subtext}</span>}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="neu-flat p-4 lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Compiti assegnati
            </h2>
            <div className="space-y-2">
              {assignments.slice(0, 8).map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/exercises?assignment=${assignment.id}`}
                  className="neu-button p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-800">{assignment.title}</p>
                    <p className="text-xs text-gray-500">Scadenza: {new Date(assignment.dueDate).toLocaleString('it-IT')}</p>
                  </div>
                  <div className="text-xs text-right text-gray-600">
                    <p>{assignment.status}</p>
                    <p>{Math.round(assignment.progressPct)}%</p>
                  </div>
                </Link>
              ))}
              {assignments.length === 0 && <p className="text-sm text-gray-500">Nessun compito assegnato al momento.</p>}
            </div>
          </div>

          <div className="neu-flat p-4 space-y-3">
            <h2 className="text-lg font-bold text-gray-800">Profilo studente</h2>
            <input
              className="neu-input w-full px-3 py-2"
              placeholder="Nickname"
              value={profile.nickname}
              onChange={(e) => setProfile((prev) => ({ ...prev, nickname: e.target.value }))}
            />
            <input
              className="neu-input w-full px-3 py-2"
              placeholder="URL immagine profilo"
              value={profile.avatarUrl}
              onChange={(e) => setProfile((prev) => ({ ...prev, avatarUrl: e.target.value }))}
            />
            <button
              className="neu-button w-full px-3 py-2 bg-indigo-600 text-white flex items-center justify-center gap-2"
              onClick={saveProfile}
              disabled={savingProfile}
            >
              <Save className="w-4 h-4" />
              {savingProfile ? 'Salvataggio...' : 'Salva profilo'}
            </button>
          </div>
        </div>

        <div className="neu-flat p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Log completo tentativi</h2>
          <div className="space-y-2 max-h-72 overflow-auto">
            {activity.map((attempt) => (
              <div key={attempt.id} className="neu-button p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{attempt.question}</p>
                  <p className="text-xs text-gray-500">{attempt.knowledgePointTitle} - {new Date(attempt.createdAt).toLocaleString('it-IT')}</p>
                </div>
                <div className="text-xs text-right">
                  {attempt.isCorrect ? (
                    <p className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Corretto</p>
                  ) : (
                    <p className="text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Errato</p>
                  )}
                  <p className="text-gray-600">+{attempt.xpEarned} XP</p>
                  <p className="text-gray-600">+{attempt.coinsEarned} Monete</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="text-sm text-gray-500">Nessun tentativo registrato.</p>}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Mappa della Conoscenza</h2>
            <div className="text-sm text-gray-500">Livelli indentati con sblocco progressivo</div>
          </div>

          <div className="neu-flat p-4">
            <KnowledgeGraph />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
