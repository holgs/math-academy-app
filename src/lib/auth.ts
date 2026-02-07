import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthOptions } from 'next-auth';

// Admin hardcoded
const ADMIN_EMAIL = 'f.prof.h@gmail.com';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Special case for Admin initialization/recovery
        const isAdminSetup = credentials.email === 'f.prof.h@gmail.com' && credentials.password === 'Luca0001!';
        const isTeacherSetup = credentials.email === 'holger.ferrero@piaggia.it' && credentials.password === 'Luca0001!';

        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (isAdminSetup || isTeacherSetup) {
          const role = isAdminSetup ? 'ADMIN' : 'TEACHER';
          const hashedPassword = await bcrypt.hash(credentials.password, 10);
          
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                password: hashedPassword,
                role: role,
                name: isAdminSetup ? 'Professor Ferrero' : 'Holger Ferrero',
              },
            });
          } else if (user.role !== role) {
            user = await prisma.user.update({
              where: { email: credentials.email },
              data: { role: role, password: hashedPassword },
            });
          }
          return user as any;
        }

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return user as any;
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.xp = user.xp;
        token.coins = user.coins;
        token.level = user.level;
        token.streak = user.streak;
        token.nickname = user.nickname ?? null;
        token.avatarUrl = user.avatarUrl ?? null;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.xp = token.xp as number;
        session.user.coins = token.coins as number;
        session.user.level = token.level as number;
        session.user.streak = token.streak as number;
        session.user.nickname = (token.nickname as string | null) ?? null;
        session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/signup',
  },
};
