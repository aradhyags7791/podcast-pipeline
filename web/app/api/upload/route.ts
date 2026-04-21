import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { r2 } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) || 'uploads'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const key = `${folder}/${randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  // Dev bypass — skip R2 when credentials aren't configured
  if (!process.env.R2_ACCOUNT_ID) {
    return NextResponse.json({ key })
  }

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
  }))

  return NextResponse.json({ key })
}
