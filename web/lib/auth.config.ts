import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname.startsWith('/login')
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL('/episodes', nextUrl))
      }
      if (!isLoggedIn && !isLoginPage) return false
      return true
    },
    async jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      return session
    },
  },
  providers: [],
}
