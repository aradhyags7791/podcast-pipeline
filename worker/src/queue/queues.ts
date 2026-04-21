import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'
import { config } from '../config'

let _connection: IORedis | null = null

export function getConnection(): ConnectionOptions {
  if (!_connection) {
    _connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: config.redisUrl.startsWith('rediss://') ? {} : undefined,
    })
  }
  return _connection as unknown as ConnectionOptions
}

const defaultJobOptions = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
}

export function createQueue(name: string) {
  return new Queue(name, { connection: getConnection(), defaultJobOptions })
}

export function createWorker(
  name: string,
  processor: (job: Job) => Promise<void>,
  options?: { concurrency?: number },
) {
  return new Worker(name, processor as any, {
    connection: getConnection(),
    concurrency: options?.concurrency ?? 1,
  })
}

export const segmentQueue = createQueue('segment')
export const visionQueue  = createQueue('vision')
export const heygenQueue  = createQueue('heygen')
export const stitchQueue  = createQueue('stitch')
