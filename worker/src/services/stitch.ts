import { spawnSync } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.00`
}

export async function stitchEpisode(
  episodeId: string,
  segmentPaths: string[],
  segmentTexts: string[],
  outputPath: string,
): Promise<void> {
  const tmpDir = path.dirname(outputPath)
  const concatPath = path.join(tmpDir, 'concat.txt')
  const assPath    = path.join(tmpDir, 'subtitles.ass')
  const rawPath    = path.join(tmpDir, 'raw.mp4')

  // concat.txt
  await fs.writeFile(concatPath, segmentPaths.map(p => `file '${p}'`).join('\n'))

  // subtitles.ass
  const assLines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginV',
    'Style: Default,Arial,72,&H00FFFFFF,&H00000000,-1,1,4,2,2,120',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Text',
  ]

  segmentTexts.forEach((text, i) => {
    const safeText = text.replace(/\n/g, '\\N').replace(/,/g, '\\,')
    assLines.push(`Dialogue: 0,${formatTime(i * 15)},${formatTime((i + 1) * 15)},Default,${safeText}`)
  })

  await fs.writeFile(assPath, assLines.join('\n'))

  // Step 1: concat
  const concat = spawnSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0',
    '-i', concatPath,
    '-c', 'copy',
    rawPath,
  ], { stdio: 'inherit' })

  if (concat.status !== 0) {
    throw new Error(`ffmpeg concat failed with exit code ${concat.status}`)
  }

  // Step 2: subtitle burn
  const sub = spawnSync('ffmpeg', [
    '-y', '-i', rawPath,
    '-vf', `ass=${assPath}`,
    '-c:v', 'libx264',
    '-crf', '23',
    '-preset', 'fast',
    '-c:a', 'copy',
    outputPath,
  ], { stdio: 'inherit' })

  if (sub.status !== 0) {
    console.warn('[stitch] Subtitle burn failed — falling back to no subtitles')
    await fs.copyFile(rawPath, outputPath)
  }

  await fs.unlink(rawPath).catch(() => {})

  console.log(`[stitch] complete → ${outputPath}`)
}
