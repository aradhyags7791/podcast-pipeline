import { Queue } from 'bullmq'
import IORedis from 'ioredis'

let _connection: IORedis | null = null

function getConnection() {
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: process.env.REDIS_URL?.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
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
