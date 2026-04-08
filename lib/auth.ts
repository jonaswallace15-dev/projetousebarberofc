import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string };
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Para login com Google, cria o usuário no banco se não existir
      if (account?.provider === 'google' && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          const name = user.name || user.email.split('@')[0];
          await prisma.user.create({
            data: {
              email: user.email,
              name,
              role: 'Proprietário',
              barbers: {
                create: {
                  name,
                  role: 'Dono / Master',
                  commission: 100,
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`,
                },
              },
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      // Para Google, busca o id e role do banco
      if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email as string } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as any).role = token.role as string;
      return session;
    },
  },
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
});
