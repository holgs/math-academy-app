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
  TrendingUp,
  Star,
  Zap,
  Settings,
  Bot
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

export default function Dashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  
  const user = session?.user as { 
    name?: string | null;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    xp: number;
    coins: number;
    level: number;
    streak: number;
  } | undefined;

  // Fetch user stats
  useEffect(() => {
    fetchStats();
    checkLLMConfig();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/user/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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

  const roleLabels = {
    STUDENT: { label: 'Studente', color: 'bg-blue-100 text-blue-700' },
    TEACHER: { label: 'Docente', color: 'bg-purple-100 text-purple-700' },
    ADMIN: { label: 'Admin', color: 'bg-red-100 text-red-700' },
  };

  const currentRole = user?.role ? roleLabels[user.role] : { label: 'Studente', color: 'bg-blue-100 text-blue-700' };

  const displayStats = stats || {
    xp: user?.xp || 0,
    coins: user?.coins || 0,
    level: user?.level || 1,
    streak: user?.streak || 0,
    nextLevelXp: 100
  };

  // Calculate XP progress
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
      progress: xpProgress
    },
    { 
      icon: Coins, 
      label: 'Monete', 
      value: displayStats.coins,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    { 
      icon: Flame, 
      label: 'Streak', 
      value: `${displayStats.streak}`,
      subtext: 'giorni',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    { 
      icon: Star, 
      label: 'Livello', 
      value: displayStats.level,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
  ];

  const quickActions = [
    { icon: BookOpen, label: 'Continua', href: '/learn', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Target, label: 'Esercizi', href: '/exercises', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: TrendingUp, label: 'Progressi', href: '/progress', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Zap, label: 'Sfide', href: '/challenges', color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#E0E5EC]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-800">
                Ciao, {user?.name || 'Studente'}! 👋
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentRole.color}`}>
                {currentRole.label}
              </span>
            </div>
            <p className="text-gray-600">
              Pronto per la tua missione di oggi?
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`neu-button px-4 py-2 flex items-center gap-2 ${
                configuredProviders.length > 0 ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              <Bot size={18} />
              AI ({configuredProviders.length})
            </button>
            
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="neu-button px-4 py-2 flex items-center gap-2 text-gray-700">
                <Settings size={18} />
                Admin
              </Link>
            )}
          </div>
        </motion.div>

        {/* LLM Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <LLMSettingsPanel 
              onClose={() => setShowSettings(false)} 
              onConfigured={handleSettingsConfigured}
            />
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
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
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${stat.progress}%` }}
                  />
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">Azioni Rapide</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={action.label} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="neu-button p-5 text-center cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-xl ${action.bg} flex items-center justify-center mx-auto mb-3`}>
                    <action.icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  <span className="text-gray-700 font-medium">{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Knowledge Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Mappa della Conoscenza</h2>
            <div className="text-sm text-gray-500">
              Clicca 💡 per suggerimenti
            </div>
          </div>
          
          <div className="neu-flat p-4">
            <KnowledgeGraph />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
