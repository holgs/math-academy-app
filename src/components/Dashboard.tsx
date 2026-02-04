'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Coins, 
  Flame, 
  Target, 
  BookOpen,
  TrendingUp,
  Star,
  Zap
} from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session } = useSession();
  const user = session?.user as { 
    name?: string | null;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    xp: number;
    coins: number;
    level: number;
    streak: number;
  } | undefined;

  const roleLabels = {
    STUDENT: { label: 'Studente', color: 'bg-blue-100 text-blue-700' },
    TEACHER: { label: 'Docente', color: 'bg-purple-100 text-purple-700' },
    ADMIN: { label: 'Admin', color: 'bg-red-100 text-red-700' },
  };

  const currentRole = user?.role ? roleLabels[user.role] : { label: 'Studente', color: 'bg-blue-100 text-blue-700' };

  const stats = [
    { 
      icon: Trophy, 
      label: 'XP', 
      value: user?.xp || 0, 
      color: 'text-accent-warning',
      bgColor: 'bg-accent-warning/10'
    },
    { 
      icon: Coins, 
      label: 'Monete', 
      value: user?.coins || 0, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    { 
      icon: Flame, 
      label: 'Streak', 
      value: `${user?.streak || 0} giorni`, 
      color: 'text-accent-error',
      bgColor: 'bg-accent-error/10'
    },
    { 
      icon: Star, 
      label: 'Livello', 
      value: user?.level || 1, 
      color: 'text-accent-success',
      bgColor: 'bg-accent-success/10'
    },
  ];

  const quickActions = [
    { icon: BookOpen, label: 'Continua', href: '/learn', color: 'text-accent-success' },
    { icon: Target, label: 'Esercizi', href: '/exercises', color: 'text-accent-warning' },
    { icon: TrendingUp, label: 'Progressi', href: '/progress', color: 'text-accent-info' },
    { icon: Zap, label: 'Sfide', href: '/challenges', color: 'text-accent-error' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
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
          
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className="neu-button px-6 py-2 flex items-center gap-2 text-gray-700">
              <Zap className="w-4 h-4 text-red-500" />
              Pannello Admin
            </Link>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="neu-flat p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`neu-circle-pressed w-10 h-10 flex items-center justify-center ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-sm text-gray-500">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
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
                  className="neu-button p-6 text-center cursor-pointer"
                >
                  <action.icon className={`w-8 h-8 mx-auto mb-2 ${action.color}`} />
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
          </div>
          
          <div className="neu-flat p-6 overflow-hidden">
            <KnowledgeGraph />
          </div>
        </motion.div>
      </div>
    </div>
  );
}