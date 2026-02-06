'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Dashboard from '@/components/Dashboard';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
    // Admin redirect
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      router.push('/admin');
    }
    // Teacher redirect
    if (status === 'authenticated' && session?.user?.role === 'TEACHER') {
      router.push('/teacher');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neu-convex p-8">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!session || session.user?.role === 'ADMIN' || session.user?.role === 'TEACHER') {
    return null;
  }

  return <Dashboard />;
}
