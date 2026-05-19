// ================================================================
// GAPOSA EEE — Master List Seed Script (Supabase)
// Usage: node seed-master-list.js
// Add SUPABASE_SERVICE_ROLE_KEY to your .env.local, then run.
// ================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync }  from 'fs'
import { config }        from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL       = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL) {
  console.error('Missing VITE_SUPABASE_URL in .env.local')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

console.log(`Connecting to: ${SUPABASE_URL}`)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const students = JSON.parse(readFileSync('./students.json', 'utf-8'))

async function seedMasterList() {
  console.log(`Seeding ${students.length} students into master_list…\n`)

  const rows = students.map(s => ({
    matric:     String(s.matric).trim().toUpperCase(),
    name:       String(s.name).trim().toUpperCase(),
    level:      String(s.level).trim(),
    option:     String(s.option || '').trim(),
    created_at: new Date().toISOString(),
  }))

  const BATCH = 100
  let success = 0
  let failed  = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch     = rows.slice(i, i + BATCH)
    const batchNum  = Math.floor(i / BATCH) + 1

    const { error } = await supabase
      .from('master_list')
      .upsert(batch, { onConflict: 'matric' })

    if (error) {
      console.error(`Batch ${batchNum} failed: ${error.message}`)
      failed += batch.length
    } else {
      success += batch.length
      console.log(`Batch ${batchNum}: ${batch.length} records OK`)
    }
  }

  console.log(`\nDone! ${success} inserted/updated, ${failed} failed.`)
  process.exit(0)
}

seedMasterList().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
