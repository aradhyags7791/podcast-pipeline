import { Queue } from 'bullmq'
import IORedis from 'ioredis'

let _connection: IORedis | null = null

function getConnection() {
  if (!_connection) {
    const redisUrl = process.env.REDIS_URL!
    const url = new URL(redisUrl)
    const isTLS = redisUrl.startsWith('rediss://')
    _connection = new IORedis({
      host: url.hostname,
      port: parseInt(url.port) || (isTLS ? 6380 : 6379),
      username: url.username || 'default',
      password: decodeURIComponent(url.password),
      tls: isTLS ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }
  return _connection
}

const defaultJobOptions = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
}

let _segmentQueue: Queue | null = null
let _visionQueue: Queue | null = null
let _heygenQueue: Queue | null = null
let _stitchQueue: Queue | null = null

export function getSegmentQueue() {
  if (!_segmentQueue) {
    _segmentQueue = new Queue('segment', { connection: getConnection(), defaultJobOptions })
  }
  return _segmentQueue
}

export function getVisionQueue() {
  if (!_visionQueue) {
    _visionQueue = new Queue('vision', { connection: getConnection(), defaultJobOptions })
  }
  return _visionQueue
}

export function getHeygenQueue() {
  if (!_heygenQueue) {
    _heygenQueue = new Queue('heygen', { connection: getConnection(), defaultJobOptions })
  }
  return _heygenQueue
}

export function getStitchQueue() {
  if (!_stitchQueue) {
    _stitchQueue = new Queue('stitch', { connection: getConnection(), defaultJobOptions })
  }
  return _stitchQueue
}
