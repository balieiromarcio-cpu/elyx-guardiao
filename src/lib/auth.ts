import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Limite de força-bruta: 5 falhas pro mesmo e-mail em 15 min bloqueiam
        // novas tentativas até a janela passar (mesmo padrão do 007/associadas).
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentFailures = await prisma.loginAttempt.count({
          where: { email, success: false, createdAt: { gte: fifteenMinAgo } },
        });
        if (recentFailures >= 5) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = user && !user.removedAt ? await bcrypt.compare(password, user.password) : false;

        await prisma.loginAttempt.create({ data: { email, success: valid } });
        if (!valid || !user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.roleAt = Date.now();
        return token;
      }
      const ROLE_TTL_MS = 60_000;
      const checkedAt = (token.roleAt as number | undefined) ?? 0;
      if (token.id && Date.now() - checkedAt > ROLE_TTL_MS) {
        const fresh = await prisma.user
          .findUnique({ where: { id: token.id as string }, select: { role: true, removedAt: true } })
          .catch(() => null);
        if (fresh && !fresh.removedAt) token.role = fresh.role;
        token.roleAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "TEAM";
      }
      return session;
    },
  },
});
