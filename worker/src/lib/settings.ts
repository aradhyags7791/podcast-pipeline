import { db } from '../db'
import { settings } from '../db/schema'

let cache: Record<string, string> | null = null

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings)
  cache = {}
  for (const row of rows) cache[row.key] = row.value
  return cache
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const s = await getSettings()
  return s[key] || fallback
}
