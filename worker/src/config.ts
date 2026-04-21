import * as dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const schema = z.object({
  DATABASE_URL:               z.string().min(1),
  REDIS_URL:                  z.string().min(1),
  R2_ACCOUNT_ID:              z.string().min(1),
  R2_ACCESS_KEY_ID:           z.string().min(1),
  R2_SECRET_ACCESS_KEY:       z.string().min(1),
  R2_BUCKET_NAME:             z.string().default('podcast-pipeline'),
  ANTHROPIC_API_KEY:          z.string().min(1),
  HEYGEN_EMAIL:               z.string().email(),
  HEYGEN_PASSWORD:            z.string().min(1),
  HEYGEN_AVATAR_NAME:         z.string().min(1),
  WORDS_PER_SEGMENT:          z.coerce.number().default(37),
  HEYGEN_TIMEOUT_MINUTES:     z.coerce.number().default(10),
  HEYGEN_POLL_INTERVAL_SECONDS: z.coerce.number().default(15),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('[config] Missing env vars:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = {
  databaseUrl:              parsed.data.DATABASE_URL,
  redisUrl:                 parsed.data.REDIS_URL,
  r2AccountId:              parsed.data.R2_ACCOUNT_ID,
  r2AccessKeyId:            parsed.data.R2_ACCESS_KEY_ID,
  r2SecretAccessKey:        parsed.data.R2_SECRET_ACCESS_KEY,
  r2BucketName:             parsed.data.R2_BUCKET_NAME,
  anthropicApiKey:          parsed.data.ANTHROPIC_API_KEY,
  heygenEmail:              parsed.data.HEYGEN_EMAIL,
  heygenPassword:           parsed.data.HEYGEN_PASSWORD,
  heygenAvatarName:         parsed.data.HEYGEN_AVATAR_NAME,
  wordsPerSegment:          parsed.data.WORDS_PER_SEGMENT,
  heygenTimeoutMinutes:     parsed.data.HEYGEN_TIMEOUT_MINUTES,
  heygenPollIntervalSeconds: parsed.data.HEYGEN_POLL_INTERVAL_SECONDS,
}
