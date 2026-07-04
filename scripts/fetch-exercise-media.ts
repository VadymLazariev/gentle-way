/**
 * Dev-only: downloads curated start/end demo frames for the program's
 * exercises from the public-domain free-exercise-db dataset into
 * public/exercise-media/<slug>/{0,1}.jpg and writes src/lib/exerciseMedia.ts.
 * Run with: npm run media:fetch
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const seedFile = join(root, 'supabase', 'seed.sql')
const mediaDir = join(root, 'public', 'exercise-media')
const outFile = join(root, 'src', 'lib', 'exerciseMedia.ts')

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

type FreeExercise = {
  id: string
  name: string
  primaryMuscles: string[]
  instructions: string[]
  images: string[]
}

type CuratedEntry = { name: string; id: string | null }

type MediaRecord = {
  name: string
  slug: string
  frames: string[]
  instructions: string[]
  primaryMuscles: string[]
}

// Hand-curated mapping: program exercise name -> free-exercise-db id.
// id === null means no suitable public-domain match (judo-specific work).
const CURATED: CuratedEntry[] = [
  { name: '4-way neck isometric', id: 'Isometric_Neck_Exercise_-_Front_And_Back' },
  { name: 'Band-resisted uchi-komi', id: null },
  { name: 'Banded tokui-waza entry', id: null },
  { name: 'Bulgarian split squat', id: 'Split_Squat_with_Dumbbells' },
  { name: 'Carry or crawl finisher', id: 'Rickshaw_Carry' },
  { name: 'Carry or neck circuit', id: 'Rickshaw_Carry' },
  { name: 'Chest-supported row', id: 'Dumbbell_Incline_Row' },
  { name: 'Close-grip bench press', id: 'Close-Grip_Barbell_Bench_Press' },
  { name: 'Copenhagen plank', id: 'Plank' },
  { name: 'Easy med-ball throw', id: 'Medicine_Ball_Scoop_Throw' },
  { name: 'Flat DB press', id: 'Dumbbell_Bench_Press' },
  { name: 'Footwork / uchi-komi rhythm', id: null },
  { name: 'Front squat', id: 'Front_Barbell_Squat' },
  { name: 'Front squat speed sets', id: 'Front_Barbell_Squat' },
  { name: 'Gi hang', id: null },
  { name: 'Hamstring curl', id: 'Lying_Leg_Curls' },
  { name: 'Hamstring curl or Copenhagen', id: 'Lying_Leg_Curls' },
  { name: 'Hamstring curl or Nordic regression', id: 'Lying_Leg_Curls' },
  { name: 'Hang high pull or jump shrug', id: 'Kettlebell_Sumo_High_Pull' },
  { name: 'Hinge or posterior chain', id: 'Romanian_Deadlift' },
  { name: 'Judogi dynamic grip circuit', id: null },
  { name: 'Judogi hang', id: null },
  { name: 'Judogi hang or towel hold', id: null },
  { name: 'Judogi pull-up cluster', id: null },
  { name: 'Jump primer', id: 'Freehand_Jump_Squat' },
  { name: 'Landmine rotation', id: 'Landmine_180s' },
  { name: 'Light carry or mobility circuit', id: 'Rickshaw_Carry' },
  { name: 'Low-incline barbell press', id: 'Barbell_Incline_Bench_Press_-_Medium_Grip' },
  { name: 'Low-incline press', id: 'Barbell_Incline_Bench_Press_-_Medium_Grip' },
  { name: 'Main squat pattern', id: 'Barbell_Squat' },
  { name: 'Neck work', id: 'Isometric_Neck_Exercise_-_Front_And_Back' },
  { name: 'Neutral-grip pulldown', id: 'V-Bar_Pulldown' },
  { name: 'Neutral-grip pulldown or chin-up', id: 'V-Bar_Pulldown' },
  { name: 'One-arm cable row or seal row', id: 'Seated_One-arm_Cable_Pulley_Rows' },
  { name: 'Overhead rear throw', id: 'Backward_Medicine_Ball_Throw' },
  { name: 'Pallof press', id: 'Pallof_Press' },
  { name: 'Pallof press or anti-rotation cable lift', id: 'Pallof_Press' },
  { name: 'Pallof press or suitcase carry', id: 'Pallof_Press' },
  { name: 'Press pattern', id: 'Barbell_Bench_Press_-_Medium_Grip' },
  { name: 'Pull pattern', id: 'Pullups' },
  { name: 'Pulldown or row', id: 'Wide-Grip_Lat_Pulldown' },
  { name: 'Push press', id: 'Push_Press' },
  { name: 'Push press or push jerk', id: 'Push_Press' },
  { name: 'Push press technique', id: 'Push_Press' },
  { name: 'Romanian deadlift', id: 'Romanian_Deadlift' },
  { name: 'Rotational scoop toss', id: 'Medicine_Ball_Scoop_Throw' },
  { name: 'Rotational shot-put throw', id: 'Medicine_Ball_Scoop_Throw' },
  { name: 'Row or pulldown', id: 'Bent_Over_Barbell_Row' },
  { name: 'Seal row', id: 'Lying_T-Bar_Row' },
  { name: 'Secondary throw band entry', id: null },
  { name: 'Short band-entry circuit', id: null },
  { name: 'Sled drag or rope drag', id: 'Sled_Drag_-_Harness' },
  { name: 'Step-in shot-put throw', id: 'Medicine_Ball_Scoop_Throw' },
  { name: 'Suitcase carry', id: 'Rickshaw_Carry' },
  { name: 'Towel row or rope row', id: 'Seated_Cable_Rows' },
  { name: 'Trap-bar deadlift', id: 'Trap_Bar_Deadlift' },
  { name: 'Trap-bar deadlift or clean pull', id: 'Trap_Bar_Deadlift' },
  { name: 'Trap-bar or hinge pattern', id: 'Trap_Bar_Deadlift' },
  { name: 'Two med-ball throw variations', id: 'Medicine_Ball_Scoop_Throw' },
  { name: 'Uchi-komi intervals', id: null },
  { name: 'Unilateral lower', id: 'Split_Squat_with_Dumbbells' },
  { name: 'Weighted neutral-grip pull-up', id: 'Weighted_Pull_Ups' },
  { name: 'Weighted pull-up', id: 'Weighted_Pull_Ups' },
  { name: 'Weighted pull-up or chin-up', id: 'Weighted_Pull_Ups' },
]

function normalizeKey(name: string): string {
  return name.trim().toLowerCase()
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function distinctSeedExercises(): string[] {
  const sql = readFileSync(seedFile, 'utf8')
  const re =
    /insert into prescriptions \([^)]*\) values \(\d+, \d+, '[^']*', '(?:[^']|'')*', '((?:[^']|'')*)'/g
  const set = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(sql)) !== null) {
    set.add(m[1].replace(/''/g, "'"))
  }
  return [...set].sort()
}

async function fetchDataset(): Promise<FreeExercise[]> {
  const res = await fetch(DATASET_URL)
  if (!res.ok) throw new Error(`dataset fetch failed: HTTP ${res.status}`)
  const data: unknown = await res.json()
  if (!Array.isArray(data)) throw new Error('dataset is not an array')
  return data as FreeExercise[]
}

function serializeRecord(records: MediaRecord[]): string {
  const body = records
    .map((r) => {
      const entry = {
        name: r.name,
        slug: r.slug,
        frames: r.frames,
        instructions: r.instructions,
        primaryMuscles: r.primaryMuscles,
      }
      return `  ${JSON.stringify(normalizeKey(r.name))}: ${JSON.stringify(entry, null, 2)
        .split('\n')
        .join('\n  ')},`
    })
    .join('\n')

  return `// AUTO-GENERATED by scripts/fetch-exercise-media.ts. Do not edit by hand.
// Regenerate with: npm run media:fetch

export type ExerciseMedia = {
  name: string
  slug: string
  frames: string[]
  instructions: string[]
  primaryMuscles: string[]
}

export const EXERCISE_MEDIA: Record<string, ExerciseMedia> = {
${body}
}

export function getExerciseMedia(exerciseName: string): ExerciseMedia | null {
  const key = exerciseName.trim().toLowerCase()
  return EXERCISE_MEDIA[key] ?? null
}
`
}

async function main() {
  const seedNames = distinctSeedExercises()
  const curatedNames = new Set(CURATED.map((c) => c.name))
  const missingFromCurated = seedNames.filter((n) => !curatedNames.has(n))
  const extraInCurated = CURATED.map((c) => c.name).filter(
    (n) => !seedNames.includes(n),
  )

  console.log(`Program exercises in seed: ${seedNames.length}`)
  if (missingFromCurated.length > 0) {
    console.warn(
      `WARNING: ${missingFromCurated.length} seed exercise(s) missing from curated mapping:`,
    )
    for (const n of missingFromCurated) console.warn(`  - ${n}`)
  }
  if (extraInCurated.length > 0) {
    console.warn(`NOTE: ${extraInCurated.length} curated name(s) not present in seed:`)
    for (const n of extraInCurated) console.warn(`  - ${n}`)
  }

  let dataset: FreeExercise[] | null = null
  try {
    dataset = await fetchDataset()
    console.log(`Fetched dataset: ${dataset.length} exercises`)
  } catch (err) {
    console.warn(`Network unavailable, skipping downloads: ${String(err)}`)
  }

  const byId = new Map<string, FreeExercise>(
    (dataset ?? []).map((e) => [e.id, e]),
  )

  const records: MediaRecord[] = []
  const unmapped: string[] = []
  const downloaded: string[] = []
  const failed: string[] = []
  const bufferCache = new Map<string, Buffer>()

  for (const entry of CURATED) {
    if (entry.id === null) {
      unmapped.push(entry.name)
      continue
    }
    const source = byId.get(entry.id)
    if (!source) {
      failed.push(`${entry.name} (id ${entry.id} not in dataset)`)
      continue
    }
    if (source.images.length < 2) {
      failed.push(`${entry.name} (id ${entry.id} has <2 images)`)
      continue
    }

    const slug = slugify(entry.name)
    const frames = ['0.jpg', '1.jpg'].map((f) => `/exercise-media/${slug}/${f}`)

    if (dataset) {
      const dir = join(mediaDir, slug)
      mkdirSync(dir, { recursive: true })
      let ok = true
      for (let i = 0; i < 2; i++) {
        const imagePath = source.images[i]
        try {
          let buf = bufferCache.get(imagePath)
          if (!buf) {
            const res = await fetch(`${IMAGE_BASE}/${imagePath}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            buf = Buffer.from(await res.arrayBuffer())
            bufferCache.set(imagePath, buf)
          }
          writeFileSync(join(dir, `${i}.jpg`), buf)
        } catch (err) {
          ok = false
          failed.push(`${entry.name} frame ${i}: ${String(err)}`)
        }
      }
      if (ok) downloaded.push(entry.name)
    }

    records.push({
      name: entry.name,
      slug,
      frames,
      instructions: source.instructions,
      primaryMuscles: source.primaryMuscles,
    })
  }

  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, serializeRecord(records))

  console.log('')
  console.log(`Mapped with media: ${records.length}`)
  console.log(`Unmapped (no media): ${unmapped.length}`)
  for (const n of unmapped) console.log(`  - ${n}`)
  if (dataset) console.log(`Downloaded frame pairs: ${downloaded.length}`)
  if (failed.length > 0) {
    console.warn(`Failures: ${failed.length}`)
    for (const f of failed) console.warn(`  - ${f}`)
  }
  console.log(`Wrote ${outFile}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
