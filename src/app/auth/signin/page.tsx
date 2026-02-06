'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Email o password non validi');
      setLoading(false);
    } else {
      // Redirect based on role - fetch session to check
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      if (session?.user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (session?.user?.role === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="neu-circle w-20 h-20 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <BookOpen className="w-10 h-10 text-accent-success" />
          </motion.div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Bentornato!
          </h1>
          <p className="text-gray-600">
            Accedi per continuare il tuo percorso
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="neu-pressed p-4 text-accent-error text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="neu-input w-full pl-12 pr-4 py-4 text-gray-800"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neu-input w-full pl-12 pr-4 py-4 text-gray-800"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="neu-button w-full py-4 flex items-center justify-center gap-2 text-gray-800 font-semibold disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Accedi
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Non hai un account?{' '}
            <Link
              href="/auth/signup"
              className="text-accent-success font-semibold hover:underline"
            >
              Registrati
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          {[
            { icon: Sparkles, label: 'Gamificato' },
            { icon: BookOpen, label: 'Apprendimento' },
            { icon: Lock, label: 'Sicuro' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="neu-convex p-4 text-center">
              <Icon className="w-6 h-6 mx-auto mb-2 text-accent-success" />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
