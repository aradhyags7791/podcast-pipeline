import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

type DbType = NodePgDatabase<typeof schema>

let _db: DbType | null = null

function getDb(): DbType {
  if (!_db) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    _db = drizzle(pool, { schema })
  }
  return _db
}

export const db = new Proxy({} as DbType, {
  get(_, prop) { return (getDb() as any)[prop] },
})
