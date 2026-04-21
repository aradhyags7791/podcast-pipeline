import './config'
import * as fs from 'fs'
import * as path from 'path'
import { startSegmenterWorker } from './workers/segmenter.worker'
import { startVisionWorker }    from './workers/vision.worker'
import { startHeygenWorker }    from './workers/heygen.worker'
import { startStitchWorker }    from './workers/stitch.worker'

// Ensure tmp directory exists
const tmpDir = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

console.log('[worker] starting all workers...')

const workers = [
  startSegmenterWorker(),
  startVisionWorker(),
  startHeygenWorker(),
  startStitchWorker(),
]

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`[worker] ${signal} received — shutting down gracefully`)
  await Promise.allSettled(workers.map(w => w.close()))
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

workers.forEach(w => {
  w.on('error', err => console.error(`[worker:${w.name}] error:`, err))
})

console.log('[worker] all workers running — waiting for jobs')
