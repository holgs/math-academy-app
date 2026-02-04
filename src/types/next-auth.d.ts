declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: 'STUDENT' | 'TEACHER' | 'ADMIN';
      xp: number;
      coins: number;
      level: number;
      streak: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    xp: number;
    coins: number;
    level: number;
    streak: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    xp: number;
    coins: number;
    level: number;
    streak: number;
  }
}
