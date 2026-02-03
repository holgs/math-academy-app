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
    xp: number;
    coins: number;
    level: number;
    streak: number;
  } | undefined;

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
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Ciao, {user?.name || 'Studente'}! 👋
          </h1>
          <p className="text-gray-600">
            Pronto per la tua missione di oggi?
          </p>
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
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-gray-600">Bloccato</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-success" />
                <span className="text-gray-600">Disponibile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-warning" />
                <span className="text-gray-600">In corso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-info" />
                <span className="text-gray-600">Completato</span>
              </div>
            </div>
          </div>
          
          <div className="neu-flat p-6">
            <KnowledgeGraph />
          </div>
        </motion.div>
      </div>
    </div>
  );
}