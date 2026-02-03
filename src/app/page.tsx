'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/auth/signin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="neu-convex p-8">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}