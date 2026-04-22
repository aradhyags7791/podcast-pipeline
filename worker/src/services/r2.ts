import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Readable } from 'stream'
import { config } from '../config'

export const r2 = new S3Client({
  region: process.env.R2_REGION ?? 'us-west-004',
  endpoint: process.env.R2_ENDPOINT ?? 'https://s3.us-west-004.backblazeb2.com',
  credentials: {
    accessKeyId: config.r2AccessKeyId,
    secretAccessKey: config.r2SecretAccessKey,
  },
})

export async function uploadFileToR2(localPath: string, key: string, contentType = 'application/octet-stream') {
  const body = await fs.readFile(localPath)
  await r2.send(new PutObjectCommand({
    Bucket: config.r2BucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  console.log(`[r2] uploaded ${key}`)
}

export async function uploadBufferToR2(buffer: Buffer, key: string, contentType = 'application/octet-stream') {
  await r2.send(new PutObjectCommand({
    Bucket: config.r2BucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
}

export async function downloadFromR2(key: string, localPath: string): Promise<string> {
  const res = await r2.send(new GetObjectCommand({
    Bucket: config.r2BucketName,
    Key: key,
  }))
  if (!res.Body) throw new Error(`R2 empty body for key: ${key}`)

  await fs.mkdir(path.dirname(localPath), { recursive: true })
  const chunks: Buffer[] = []
  for await (const chunk of res.Body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  await fs.writeFile(localPath, Buffer.concat(chunks))
  console.log(`[r2] downloaded ${key} → ${localPath}`)
  return localPath
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(r2, new GetObjectCommand({
    Bucket: config.r2BucketName,
    Key: key,
  }), { expiresIn })
}
