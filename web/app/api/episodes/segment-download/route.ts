import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPresignedDownloadUrl } from '@/lib/r2'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  const url = await getPresignedDownloadUrl(key)
  return NextResponse.json({ url })
}
