import { pgTable, pgEnum, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core'

export const episodeStatusEnum = pgEnum('episode_status', [
  'pending', 'segmenting', 'analyzing', 'generating', 'stitching', 'done', 'failed',
])
export const jobStatusEnum = pgEnum('job_status', ['waiting', 'active', 'completed', 'failed'])
export const segmentStatusEnum = pgEnum('segment_status', ['pending', 'generating', 'done', 'failed'])

export const users = pgTable('users', {
  id:           uuid('id').defaultRandom().primaryKey(),
  name:         varchar('name', { length: 100 }).notNull(),
  email:        varchar('email', { length: 200 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive:     boolean('is_active').default(true).notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const episodes = pgTable('episodes', {
  id:                 uuid('id').defaultRandom().primaryKey(),
  name:               varchar('name', { length: 200 }).notNull(),
  status:             episodeStatusEnum('status').default('pending').notNull(),
  scriptText:         text('script_text').notNull(),
  scriptFileKey:      varchar('script_file_key', { length: 500 }),
  imageKey:           varchar('image_key', { length: 500 }).notNull(),
  wordsPerSegment:    integer('words_per_segment').default(37).notNull(),
  avatarName:         varchar('avatar_name', { length: 200 }).notNull(),
  totalSegments:      integer('total_segments').default(0).notNull(),
  completedSegments:  integer('completed_segments').default(0).notNull(),
  outputVideoKey:     varchar('output_video_key', { length: 500 }),
  errorMessage:       text('error_message'),
  createdBy:          uuid('created_by').references(() => users.id).notNull(),
  createdAt:          timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const segments = pgTable('segments', {
  id:           uuid('id').defaultRandom().primaryKey(),
  episodeId:    uuid('episode_id').references(() => episodes.id, { onDelete: 'cascade' }).notNull(),
  index:        integer('index').notNull(),
  text:         text('text').notNull(),
  wordCount:    integer('word_count').notNull(),
  status:       segmentStatusEnum('status').default('pending').notNull(),
  videoKey:     varchar('video_key', { length: 500 }),
  errorMessage: text('error_message'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const visualContexts = pgTable('visual_contexts', {
  id:                uuid('id').defaultRandom().primaryKey(),
  episodeId:         uuid('episode_id').references(() => episodes.id, { onDelete: 'cascade' }).notNull().unique(),
  styleMood:         text('style_mood').notNull(),
  actorAppearance:   text('actor_appearance').notNull(),
  staticDescription: text('static_description').notNull(),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const jobs = pgTable('jobs', {
  id:           uuid('id').defaultRandom().primaryKey(),
  episodeId:    uuid('episode_id').references(() => episodes.id, { onDelete: 'cascade' }).notNull(),
  stage:        varchar('stage', { length: 50 }).notNull(),
  status:       jobStatusEnum('status').default('waiting').notNull(),
  bullJobId:    varchar('bull_job_id', { length: 100 }),
  startedAt:    timestamp('started_at', { withTimezone: true }),
  completedAt:  timestamp('completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const settings = pgTable('settings', {
  key:       varchar('key', { length: 100 }).primaryKey(),
  value:     text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
