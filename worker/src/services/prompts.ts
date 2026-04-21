import { getGestureTemplate } from './gestures'

interface VisualContext {
  styleMood: string
  actorAppearance: string
  staticDescription: string
  setupArchetype?: string   // A–F from skill routing; defaults to A
  pacingNote?: string
}

export interface SeedancePrompt {
  lang: string
  prompt: string
}

// Maps pacing notes to delivery language per the skill
function pacingDescription(note?: string): string {
  if (!note) return 'Natural conversational cadence. Words flow without long pauses. Jaw drops cleanly per syllable.'
  const n = note.toLowerCase()
  if (n.includes('slow') || n.includes('calm'))
    return 'Unhurried, measured delivery. Words land with space between them. Natural breath audible between phrases. Not rushed.'
  if (n.includes('stage') || n.includes('keynote'))
    return 'Stage-measured delivery — slower than podcast cadence. Deliberate pauses between clauses. Each word weighted. Silences held.'
  if (n.includes('fast') || n.includes('excit'))
    return 'Energetic rapid delivery. Sentences connect with minimal pause. Jaw moves quickly.'
  return 'Natural conversational cadence. Words flow without long pauses. Jaw drops cleanly per syllable.'
}

// Camera + body language template by archetype
function archetypeCamera(archetype: string): string {
  switch (archetype.toUpperCase()) {
    case 'B': return 'Stabilized medium close-up, single key light visible. Body leans in at key moments. Chest-level frame crop.'
    case 'C': return 'Stabilized medium close-up. Warm background bokeh. Relaxed gestures.'
    case 'D': return 'Stabilized medium shot. No mic visible. Deliberate delivery with pauses between clauses.'
    case 'E': return 'Stabilized medium shot with minimal slow tracking drift. Speaker walks slowly. Open wide gestures toward audience off-frame.'
    case 'F': return 'Stabilized medium close-up. Blurred branded background elements.'
    default:  return 'Stabilized medium close-up, locked off. No cuts for 15 seconds. Gaze 30–40° off-lens toward someone off-frame.'
  }
}

function roomSound(archetype: string): string {
  switch (archetype.toUpperCase()) {
    case 'E': return 'Mild stage reverb. No music.'
    case 'B': return 'Faint continuous ambient room tone. No music.'
    default:  return 'Faint HVAC hum. No music.'
  }
}

export function buildSegmentPrompts(
  segmentIndex: number,
  segmentText: string,
  vc: VisualContext,
): SeedancePrompt[] {
  const archetype = vc.setupArchetype ?? 'A'
  const pacing = pacingDescription(vc.pacingNote)
  const camera = archetypeCamera(archetype)
  const { g2, g6, g8, g10, g13 } = getGestureTemplate(segmentIndex)
  const isOpening = segmentIndex === 0

  // EN prompt
  const dynamicEn = [
    `${camera}`,
    isOpening
      ? 'Scene opens already at the opening beat — lips moving immediately, no lead-in pause.'
      : 'Scene opens already mid-sentence — lips moving immediately.',
    `At second two, ${g2}.`,
    `At second six, ${g6}.`,
    `At second eight, a natural breath — mouth closes briefly, reopens immediately.`,
    `At second ten, ${g10}.`,
    `At second thirteen, ${g13}.`,
    'Final words land slower, one word per beat. Jaw drops cleanly on each. Expression settles.',
    'Lips move continuously throughout — natural speech rhythm. Gaze holds steady, never touching the lens.',
  ].join(' ')

  const audioEn = `Voice warm, unhurried, conversational. ${pacing} "${segmentText}" ${roomSound(archetype)}`

  const enPrompt = `Style & Mood: ${vc.styleMood} Dynamic Description: ${dynamicEn} Static Description: ${vc.staticDescription} Audio: ${audioEn}`

  // ZH prompt — native director's notes, not a translation; dialogue stays in original language
  const dynamicZh = [
    `镜头：${camera}`,
    isOpening ? '画面入时说话者已在发声，口型即刻运动，无起始停顿。' : '画面入时已至句中，口型立即运动。',
    `第二秒：${g2}（中文导演注记：手部动作落在重音词节上）。`,
    `第六秒：${g6}，姿态自然延续。`,
    `第八秒：自然换气，嘴唇轻合即开，不中断语流。`,
    `第十秒：${g10}，目光保持偏轴注视。`,
    `第十三秒：${g13}，节奏略降。`,
    '最后两秒语速减缓，每字落点清晰，下颚随音节开合，表情趋于沉稳。',
    '全程口型持续运动，自然语速节律，目光始终偏离镜头。',
  ].join(' ')

  const staticZh = `场景静态：${vc.staticDescription}`
  const audioZh = `声音：温暖、从容、对话感。${pacing} "${segmentText}" ${roomSound(archetype)}`

  const zhPrompt = `风格与氛围：${vc.styleMood} 动态描述：${dynamicZh} 静态描述：${staticZh} 音频：${audioZh}`

  return [
    { lang: 'en', prompt: enPrompt },
    { lang: 'zh', prompt: zhPrompt },
  ]
}

// Keep legacy single-prompt function for any callers that haven't migrated
export function buildSegmentPrompt(
  segmentIndex: number,
  segmentText: string,
  vc: VisualContext,
): { lang: string; prompt: string } {
  return buildSegmentPrompts(segmentIndex, segmentText, vc)[0]
}

export const VISION_PROMPT = `You are analyzing a reference image for a podcast/interview talking-head video.
Perform a full visual inventory and return ONLY valid JSON — no markdown, no extra keys:
{
  "setupArchetype": "A|B|C|D|E|F — A=seated studio desk+boom mic, B=dimly lit studio, C=brick wall/warm interior, D=clean desk no mic, E=stage/keynote standing, F=branded/talk show set",
  "styleMood": "2-4 sentences: frame format (9:16 vertical), lighting quality and direction, lens equivalent and aperture, color palette, overall mood and feel",
  "actorAppearance": "2-3 sentences: exact garment (ribbed crewneck/hoodie/blazer etc) color+texture, hair length+style+color, beard/facial hair or none, skin tone, accessories (watch color/wrist, chain, headphones, earring), seated posture, gaze angle relative to lens (e.g. 30-40 degrees left). DO NOT describe gestures or movement.",
  "staticDescription": "3-5 sentences: desk/table material+color, microphone type+mount+position, background material+color+blur level, window/light sources, props (mug, kettle, trophies — note color and position), frame crop (chest/waist/full body). End with ambient sound (e.g. Faint HVAC hum. No music.)"
}`
