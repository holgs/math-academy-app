import NextAuth, { DefaultSession } from "next-auth"
import { AdapterUser } from "next-auth/adapters"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: 'STUDENT' | 'TEACHER' | 'ADMIN';
      xp: number;
      coins: number;
      level: number;
      streak: number;
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    xp: number;
    coins: number;
    level: number;
    streak: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    xp: number;
    coins: number;
    level: number;
    streak: number;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    xp: number;
    coins: number;
    level: number;
    streak: number;
  }
}
