import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs/promises'
import * as path from 'path'
import { config } from '../config'
import { downloadFromR2 } from './r2'
import { VISION_PROMPT } from './prompts'

const client = new Anthropic({ apiKey: config.anthropicApiKey })

export interface VisualContext {
  styleMood: string
  actorAppearance: string
  staticDescription: string
  setupArchetype?: string
}

export async function analyzeReferenceImage(
  imageKey: string,
  episodeId: string,
): Promise<VisualContext> {
  const tmpDir = path.join(process.cwd(), 'tmp', episodeId)
  await fs.mkdir(tmpDir, { recursive: true })
  const localPath = path.join(tmpDir, 'reference.jpg')

  await downloadFromR2(imageKey, localPath)

  const imageData = await fs.readFile(localPath)
  const base64 = imageData.toString('base64')
  const mediaType = imageKey.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        { type: 'text', text: VISION_PROMPT },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()

  try {
    const parsed = JSON.parse(clean) as VisualContext
    if (!parsed.styleMood || !parsed.actorAppearance || !parsed.staticDescription) {
      throw new Error('Missing fields in Claude response')
    }
    return parsed
  } catch {
    throw new Error(`Failed to parse Claude Vision response: ${clean.slice(0, 200)}`)
  }
}
