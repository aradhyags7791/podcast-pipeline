import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        // Dev bypass — no DB needed locally
        if (process.env.NODE_ENV === 'development' &&
            credentials.email === 'admin@podcast-pipeline.com' &&
            credentials.password === 'changeme123') {
          return { id: 'dev-user', name: 'Admin', email: 'admin@podcast-pipeline.com' }
        }
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        })
        if (!user || !user.isActive) return null
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null
        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
})
