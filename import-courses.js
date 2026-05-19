// ================================================================
// GAPOSA EEE — Course Import Script (Supabase)
// Run this ONCE to populate the database with all courses
// Usage: node import-courses.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
//           (or paste values directly below)
// ================================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL              = process.env.SUPABASE_URL              || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── All courses ──────────────────────────────────────────────────
const COURSES = [
  // ── ND I — First Semester ─────────────────────────────────────
  { code: 'COM 111', name: 'Introduction to Computer',              level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 111', name: 'Electrical Graphics',                   level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 112', name: 'Introduction to Computer Software',     level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 114', name: 'Report Writing',                        level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 115', name: 'Electrical Engineering Science I',      level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 116', name: 'Electrical Workshop Practice I',        level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 117', name: 'Computer Hardware I',                   level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'GNS 111', name: 'Citizenship Education I',               level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'GNS 112', name: 'Use of English',                        level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'GNS 118', name: 'Use of Library',                        level: 'ND 1', semester: 'First Semester',  cu: 1 },
  { code: 'GNS 119', name: 'General Agriculture',                   level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'ICT 115', name: 'Network Fundamental',                   level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'MEC 112', name: 'Technical Drawing',                     level: 'ND 1', semester: 'First Semester',  cu: 1 },
  { code: 'MEC 113', name: 'Basic Workshop Technology and Practice',level: 'ND 1', semester: 'First Semester',  cu: 2 },
  { code: 'MTH 112', name: 'Algebra and Elementary Trigonometry',   level: 'ND 1', semester: 'First Semester',  cu: 2 },

  // ── ND I — Second Semester ────────────────────────────────────
  { code: 'EEC 121', name: 'Digital Electronics',                           level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 122', name: 'Electrical Power I',                            level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 123', name: 'Electrical Machine I',                          level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 124', name: 'Electronics I',                                 level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 125', name: 'Electrical Engineering Science II',             level: 'ND 1', semester: 'Second Semester', cu: 1 },
  { code: 'EEC 126', name: 'Electrical and Electronic Instrument I',        level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 127', name: 'Electrical Workshop Practice II',               level: 'ND 1', semester: 'Second Semester', cu: 1 },
  { code: 'EEC 128', name: 'Telecommunications I',                          level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 129', name: 'Electrical Installation of Building',           level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'GNS 122', name: 'Communication Skills',                          level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'ICT 121', name: 'Information Technology Essentials I',           level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'ICT 125', name: 'Routing Protocol',                              level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'MEC 124', name: 'Machine Tools Technology and Practice',         level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'MTH 121', name: 'Calculus',                                      level: 'ND 1', semester: 'Second Semester', cu: 2 },
  { code: 'ENT 126', name: 'Introduction to Entrepreneurship I',            level: 'ND 1', semester: 'Second Semester', cu: 2 },

  // ── ND II — First Semester ────────────────────────────────────
  { code: 'EEC 210', name: 'Electrical Circuit Theory I',                   level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 211', name: 'Seminar',                                       level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 212', name: 'Electrical Power II',                           level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 213', name: 'Electrical Machine II',                         level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 214', name: 'Electronics II',                                level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 216', name: 'Electrical and Electronic Instrument II',       level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 217', name: 'Electrical/Electronic Maintenance and Repair',  level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'EEC 218', name: 'Telecommunications II',                         level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'ICT 211', name: 'Information Technology Essentials II',          level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'ICT 215', name: 'Switching and Wireless',                        level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'MTH 212', name: 'Logic and Linear Algebra',                      level: 'ND 2', semester: 'First Semester',  cu: 1 },
  { code: 'SWE 211', name: 'Students Industrial Work Experience Scheme',    level: 'ND 2', semester: 'First Semester',  cu: 2 },
  { code: 'ENT 216', name: 'Introduction to Entrepreneurship II',           level: 'ND 2', semester: 'First Semester',  cu: 1 },

  // ── ND II — Second Semester ───────────────────────────────────
  { code: 'EEC 220', name: 'Electrical Circuit Theory II',                  level: 'ND 2', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 222', name: 'Electrical Power III',                          level: 'ND 2', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 223', name: 'Computer Programming Using C/C++ Language',     level: 'ND 2', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 225', name: 'Electronics III',                               level: 'ND 2', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 227', name: 'Computer Hardware II',                          level: 'ND 2', semester: 'Second Semester', cu: 2 },
  { code: 'EEC 229', name: 'Project',                                       level: 'ND 2', semester: 'Second Semester', cu: 2 },
  { code: 'GNS 221', name: 'Communication Skills II',                       level: 'ND 2', semester: 'Second Semester', cu: 1 },
  { code: 'ICT 225', name: 'Wide Area Network',                             level: 'ND 2', semester: 'Second Semester', cu: 2 },
  { code: 'MTH 222', name: 'Trigonometry and Analytical Geometry',          level: 'ND 2', semester: 'Second Semester', cu: 1 },

  // ── HND I — First Semester (Both Options) ─────────────────────
  { code: 'EEC 311', name: 'Electrical Material Science',                   level: 'HND 1', semester: 'First Semester',  cu: 2, option: 'Both' },
  { code: 'EEC 313', name: 'Electrical Circuit Theory III',                 level: 'HND 1', semester: 'First Semester',  cu: 3, option: 'Both' },
  { code: 'EEC 314', name: 'Analogue Electronics III',                      level: 'HND 1', semester: 'First Semester',  cu: 3, option: 'Both' },
  { code: 'EEC 318', name: 'Digital Electronics',                           level: 'HND 1', semester: 'First Semester',  cu: 2, option: 'Both' },
  { code: 'EEI 311', name: 'Electrical Measurement & Control III',          level: 'HND 1', semester: 'First Semester',  cu: 3, option: 'Both' },
  { code: 'WEC 311', name: 'Engineering in Society',                        level: 'HND 1', semester: 'First Semester',  cu: 2, option: 'Both' },
  { code: 'GNS 319', name: 'Modern Agriculture',                            level: 'HND 1', semester: 'First Semester',  cu: 3, option: 'Both' },
  { code: 'ICT 312', name: 'Computer Packages I',                           level: 'HND 1', semester: 'First Semester',  cu: 2, option: 'Both' },
  { code: 'MTH 311', name: 'Advanced Algebra',                              level: 'HND 1', semester: 'First Semester',  cu: 2, option: 'Both' },

  // ── HND I — Second Semester (Power & Machines) ────────────────
  { code: 'EEC 323', name: 'Electrical Circuit Theory IV',                  level: 'HND 1', semester: 'Second Semester', cu: 2, option: 'Power & Machines' },
  { code: 'EEC 329', name: 'Testing Methods and Reliability',               level: 'HND 1', semester: 'Second Semester', cu: 2, option: 'Power & Machines' },
  { code: 'EEE 325', name: 'Digital Communication I',                       level: 'HND 1', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'EEE 326', name: 'Electrical Design and Drawing I',               level: 'HND 1', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'EEE 327', name: 'Electrical Machines III',                       level: 'HND 1', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'EEE 328', name: 'Electrical Power System III',                   level: 'HND 1', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'BAM 328', name: 'Industrial Management',                         level: 'HND 1', semester: 'Second Semester', cu: 2, option: 'Power & Machines' },
  { code: 'ICT 321', name: 'Data Communication and Computer Network',       level: 'HND 1', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'MTH 322', name: 'Advanced Calculus',                             level: 'HND 1', semester: 'Second Semester', cu: 2, option: 'Power & Machines' },
  { code: 'ENT 326', name: 'Practice of Entrepreneurship I',                level: 'HND 1', semester: 'Second Semester', cu: 2, option: 'Power & Machines' },

  // ── HND II — First Semester (Power & Machines) ────────────────
  { code: 'EEC 411', name: 'Electromagnetic Field Theory',                  level: 'HND 2', semester: 'First Semester',  cu: 2, option: 'Power & Machines' },
  { code: 'EEC 413', name: 'Control Engineering System',                    level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Power & Machines' },
  { code: 'EEC 417', name: 'Power Electronics',                             level: 'HND 2', semester: 'First Semester',  cu: 2, option: 'Power & Machines' },
  { code: 'EEC 419', name: 'Project I',                                     level: 'HND 2', semester: 'First Semester',  cu: 2, option: 'Power & Machines' },
  { code: 'EEI 411', name: 'Electronic Measurement and Control IV',         level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Power & Machines' },
  { code: 'EEP 416', name: 'Electrical Power System IV',                    level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Power & Machines' },
  { code: 'EEP 418', name: 'Electrical Design and Drafting II',             level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Power & Machines' },
  { code: 'EEP 419', name: 'Electrical Machines IV',                        level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Power & Machines' },
  { code: 'MTH 411', name: 'Numerical Methods',                             level: 'HND 2', semester: 'First Semester',  cu: 2, option: 'Power & Machines' },
  { code: 'ENT 416', name: 'Practice of Entrepreneurship II',               level: 'HND 2', semester: 'First Semester',  cu: 2, option: 'Power & Machines' },

  // ── HND II — First Semester (Electronics & Telecom) ──────────
  { code: 'EEE 414', name: 'Analogue Electronics III',                      level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Electronics & Telecom' },
  { code: 'EEE 415', name: 'Digital Communication II',                      level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Electronics & Telecom' },
  { code: 'EEE 417', name: 'Electronic Design and Drafting',                level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Electronics & Telecom' },
  { code: 'EEE 418', name: 'Microprocessor Applications',                   level: 'HND 2', semester: 'First Semester',  cu: 3, option: 'Electronics & Telecom' },

  // ── HND II — Second Semester (Power & Machines) ───────────────
  { code: 'EEC 428', name: 'Microcontroller Applications',                  level: 'HND 2', semester: 'Second Semester', cu: 2, option: 'Power & Machines' },
  { code: 'EEC 429', name: 'Project II',                                    level: 'HND 2', semester: 'Second Semester', cu: 6, option: 'Power & Machines' },
  { code: 'EEP 424', name: 'Electrical Maintenance and Repair',             level: 'HND 2', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'EEP 426', name: 'Electrical Power System V',                     level: 'HND 2', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'EEP 427', name: 'Electrical Machines V',                         level: 'HND 2', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'ICT 428', name: 'Computer Programming Using C++',                level: 'HND 2', semester: 'Second Semester', cu: 3, option: 'Power & Machines' },
  { code: 'MTH 423', name: 'Statistical Methods',                           level: 'HND 2', semester: 'Second Semester', cu: 2, option: 'Power & Machines' },

  // ── HND II — Second Semester (Electronics & Telecom) ─────────
  { code: 'EEE 425', name: 'Digital Communication III',                     level: 'HND 2', semester: 'Second Semester', cu: 3, option: 'Electronics & Telecom' },
  { code: 'EEE 426', name: 'Electrical/Electronic Maintenance and Repair',  level: 'HND 2', semester: 'Second Semester', cu: 2, option: 'Electronics & Telecom' },
  { code: 'EEE 427', name: 'Computer Hardware Maintenance and Repair',      level: 'HND 2', semester: 'Second Semester', cu: 3, option: 'Electronics & Telecom' },
]

async function importCourses() {
  console.log(`Importing ${COURSES.length} courses…`)
  let success = 0
  let failed  = 0

  for (const course of COURSES) {
    const id = course.code.replace(/\s+/g, '_')
    const { error } = await supabase.from('courses').upsert({
      id,
      ...course,
      option:      course.option || 'All',
      lecturer_id: '',
      session:     '2025/2026',
      created_at:  new Date().toISOString(),
    }, { onConflict: 'id' })

    if (error) {
      console.error(`✗ ${course.code} — ${error.message}`)
      failed++
    } else {
      console.log(`✓ ${course.code} — ${course.name}`)
      success++
    }
  }

  console.log(`\nDone! ${success} imported, ${failed} failed.`)
  process.exit(0)
}

importCourses()
