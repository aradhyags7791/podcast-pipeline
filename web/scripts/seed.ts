import { db } from '../lib/db'
import { users, settings } from '../lib/db/schema'
import bcrypt from 'bcryptjs'

async function seed() {
  const hash = await bcrypt.hash('changeme123', 12)
  await db.insert(users).values({
    name: 'Admin',
    email: 'admin@podcast-pipeline.com',
    passwordHash: hash,
  }).onConflictDoNothing()

  await db.insert(settings).values([
    { key: 'wordsPerSegment',       value: '37' },
    { key: 'heygenTimeoutMinutes',  value: '10' },
    { key: 'heygenAvatarName',      value: '' },
    { key: 'heygenEmail',           value: '' },
    { key: 'heygenPassword',        value: '' },
  ]).onConflictDoNothing()

  console.log('Seed complete. Login: admin@podcast-pipeline.com / changeme123')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
