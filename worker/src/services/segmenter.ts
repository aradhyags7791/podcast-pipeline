interface Segment {
  index: number
  text: string
  wordCount: number
}

export function segmentScript(scriptText: string, wordsPerSegment: number): Segment[] {
  const words = scriptText.trim().split(/\s+/)
  const segments: Segment[] = []
  let i = 0

  while (i < words.length) {
    const chunk = words.slice(i, i + wordsPerSegment)

    // Try to break at sentence boundary within ±5 words of target
    let end = chunk.length
    for (let j = Math.min(chunk.length - 1, wordsPerSegment + 4); j >= Math.max(0, wordsPerSegment - 5); j--) {
      if (chunk[j] && /[.!?]$/.test(chunk[j])) {
        end = j + 1
        break
      }
    }

    const segWords = chunk.slice(0, end)
    segments.push({
      index: segments.length,
      text: segWords.join(' '),
      wordCount: segWords.length,
    })

    i += end
  }

  return segments
}
