interface GestureTemplate {
  g2: string   // s2–3
  g6: string   // s6–7
  g8: string   // s8 breath (handled inline, but here for reference)
  g10: string  // s10–11
  g13: string  // s13–14
}

// 8 templates rotated by segmentIndex % 8 — drawn from the skill's gesture library
const GESTURE_TEMPLATES: GestureTemplate[] = [
  // 0 — open-palm-push
  {
    g2:  'right hand raises palm flat and open, held two beats then drops',
    g6:  'head tilts fractionally left, a half-nod landing on an emphasized clause',
    g8:  'natural breath',
    g10: 'right hand rises loosely curled — a brief illustrative gesture — then released',
    g13: 'slow deliberate nod on key word, one full second down',
  },
  // 1 — chop-and-lean
  {
    g2:  'edge-of-hand chopping gesture lands on a key word then rests',
    g6:  'right hand opens fully palm-up held two beats — an offering gesture — then settles',
    g8:  'natural breath',
    g10: 'upper body leans forward two inches from the waist',
    g13: 'one slow deliberate nod',
  },
  // 2 — gathering-motion
  {
    g2:  'left hand gathers inward pulling an idea toward center, held two beats then released flat',
    g6:  'eyebrows lift on a key stressed word then relax',
    g8:  'natural breath — a genuine mid-thought pause — then resume',
    g10: 'right hand fans open palm-up rolling left to right for two beats then settles',
    g13: 'upper body settles back, shoulders drop slightly',
  },
  // 3 — desk-press
  {
    g2:  'right hand lifts and opens fingers spread in a relaxed fan palm-up rolling gently for three beats then settles',
    g6:  'both hands press lightly onto the desk edge as tone sharpens',
    g8:  'natural breath',
    g10: 'single open-palm push from right hand held one beat then withdrawn',
    g13: 'hands return to rest posture slightly forward',
  },
  // 4 — forward-pull
  {
    g2:  'right shoulder shifts fractionally forward — a subtle postural lean',
    g6:  'head tilts left — a natural micro-movement — then recenters',
    g8:  'natural breath — a genuine mid-thought pause — then resume with increased pace',
    g10: 'eyebrows draw inward on a more serious clause then release',
    g13: 'posture straightens, gaze holds steady',
  },
  // 5 — count-on-fingers
  {
    g2:  'right hand rises index finger extended, held one beat',
    g6:  'second finger extends — a two-point count — held briefly',
    g8:  'natural breath',
    g10: 'full hand opens palm facing listener — a presenting gesture — held two beats then drops',
    g13: 'both hands come together fingers loosely interlaced then separate',
  },
  // 6 — watch-catch
  {
    g2:  'left hand rises — the watch catching warm light briefly — then settles',
    g6:  'upper body leans forward one inch, forearms pressing gently onto desk edge',
    g8:  'natural breath',
    g10: 'one eyebrow lifts a single questioning beat then releases as the answer comes',
    g13: 'right hand opens in a brief horizontal sweep then drops',
  },
  // 7 — exhale-reset
  {
    g2:  'chest opens, shoulders settle — a posture reset — preceding the next clause',
    g6:  'brief pause after a clause, head tilts fractionally left, a half-nod on the following word',
    g8:  'natural breath',
    g10: 'right hand raises palm flat and open, held two beats then drops',
    g13: 'last words land slower, one word per beat, jaw dropping cleanly on each',
  },
]

export function getGestureTemplate(segmentIndex: number): GestureTemplate {
  return GESTURE_TEMPLATES[segmentIndex % GESTURE_TEMPLATES.length]
}

// Legacy — kept for any callers using the old string format
export function getGestureForSegment(segmentIndex: number): string {
  const t = getGestureTemplate(segmentIndex)
  return `${t.g2}, ${t.g6}, ${t.g10}, ${t.g13}`
}
