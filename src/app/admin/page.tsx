'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  Trophy, 
  Map as MapIcon, 
  LayoutDashboard,
  ChevronRight,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalXp: number;
  masteredPoints: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats')
      ]);
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
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

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#E0E5EC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
              Admin Control Center
            </h1>
            <p className="text-gray-600">Bentornato, Professor Ferrero. Ecco lo stato dell'accademia.</p>
          </div>
          <Link href="/dashboard" className="neu-button px-6 py-2 flex items-center gap-2 text-gray-700">
            <MapIcon className="w-4 h-4" />
            Vista Mappa
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Totale Utenti', value: stats?.totalUsers, icon: Users, color: 'text-blue-600' },
            { label: 'Studenti Attivi', value: stats?.totalStudents, icon: GraduationCap, color: 'text-green-600' },
            { label: 'XP Generati', value: stats?.totalXp, icon: Trophy, color: 'text-yellow-600' },
            { label: 'KP Masterati', value: stats?.masteredPoints, icon: LayoutDashboard, color: 'text-purple-600' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="neu-flat p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{stat.value?.toLocaleString() || 0}</div>
            </motion.div>
          ))}
        </div>

        {/* Users Table */}
        <div className="neu-flat p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Elenco Studenti</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cerca studente..."
                className="neu-circle-pressed bg-transparent pl-10 pr-4 py-2 text-sm text-gray-700 outline-none w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="pb-4 px-4">Studente</th>
                  <th className="pb-4 px-4 text-center">Livello</th>
                  <th className="pb-4 px-4 text-center">XP</th>
                  <th className="pb-4 px-4">Ruolo</th>
                  <th className="pb-4 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-800">{user.name || 'Senza nome'}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-gray-700">{user.level}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                        {user.xp} XP
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
