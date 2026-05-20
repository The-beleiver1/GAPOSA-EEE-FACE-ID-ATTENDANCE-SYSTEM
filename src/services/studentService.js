import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

const FACE_SERVER = import.meta.env.VITE_FACE_SERVER_URL || 'http://localhost:8000'
const DEV = import.meta.env.DEV

// ── Save ArcFace embeddings after enrollment ──────────────────────
export async function saveStudentDescriptors(matric, descriptors, photoDataUrl) {
  if (!matric) throw new Error('Matric number is required')
  if (!descriptors || descriptors.length === 0) throw new Error('No face data captured')

  // Fetch student details from master list
  const { data: masterData } = await supabase
    .from('master_list')
    .select('name, level, option')
    .ilike('matric', String(matric))
    .single()

  // Upload enrollment photo to Supabase storage (best effort)
  let photoUrl = null
  if (photoDataUrl) {
    try {
      const res   = await fetch(photoDataUrl)
      const blob  = await res.blob()
      const path  = `${String(matric)}.jpg`
      await supabase.storage.from('student - photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      const { data: pub } = supabase.storage.from('student - photos').getPublicUrl(path)
      photoUrl = pub?.publicUrl || null
    } catch { /* storage bucket may not exist yet — silently skip */ }
  }

  // Upsert student record
  const { error: studentError } = await supabase
    .from('students')
    .upsert({
      matric:      String(matric),
      name:        masterData?.name   || '',
      level:       masterData?.level  || '',
      option:      masterData?.option || '',
      enrolled:    true,
      enrolled_at: new Date().toISOString(),
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    }, { onConflict: 'matric' })

  if (studentError) throw new Error(studentError.message)

  // Delete old descriptors
  await supabase
    .from('face_descriptors')
    .delete()
    .eq('matric', String(matric))

  // Insert new 512D ArcFace descriptors
  const rows = descriptors.map(desc => ({
    matric:     String(matric),
    descriptor: Array.from(desc),
  }))

  const { error: descError } = await supabase
    .from('face_descriptors')
    .insert(rows)

  if (descError) throw new Error(descError.message)
  return true
}

// ── Check for duplicate face ──────────────────────────────────────
// Fetches all stored embeddings from Supabase
// Sends them + new face image to Python /deduplicate endpoint
// Python compares using numpy cosine similarity — reliable across sessions
export async function checkDuplicateFace(newFaceImage, currentMatric) {
  if (DEV) console.log('[checkDuplicateFace] called for matric:', currentMatric)

  try {
    // Step 1 — Fetch all enrolled students and their embeddings from Supabase
    const { data: descriptors, error } = await supabase
      .from('face_descriptors')
      .select('matric, descriptor')

    if (error) {
      if (DEV) console.error('[checkDuplicateFace] Supabase error fetching descriptors:', error.message)
      throw new Error('[dedup] Could not load enrolled faces from database. Check your connection and try again.')
    }

    if (!descriptors || descriptors.length === 0) {
      if (DEV) console.log('[checkDuplicateFace] No enrolled faces in database — skipping dedup check')
      return null
    }

    if (DEV) console.log(`[checkDuplicateFace] Fetched ${descriptors.length} descriptor row(s) from Supabase`)

    // Step 2 — Get student names for better error messages
    const { data: students } = await supabase
      .from('students')
      .select('matric, name')
      .eq('enrolled', true)

    const nameMap = {}
    for (const s of (students || [])) {
      nameMap[s.matric] = s.name
    }

    // Step 3 — Filter out current matric (allow same student to re-enroll)
    // IMPORTANT: pgvector columns returned by Supabase JS client come back as the
    // string "[0.1,0.2,...]" — NOT a JS array. Array.from(string) would produce
    // individual characters which breaks Pydantic validation on the Python side.
    // Parse with JSON.parse when it's a string; fall back to Array.from for jsonb.
    const storedEmbeddings = descriptors
      .filter(d => d.matric !== String(currentMatric))
      .map(d => {
        let embedding
        if (typeof d.descriptor === 'string') {
          try {
            embedding = JSON.parse(d.descriptor)
          } catch {
            if (DEV) console.error('[checkDuplicateFace] Failed to parse descriptor string for matric:', d.matric)
            return null
          }
        } else {
          embedding = Array.from(d.descriptor)
        }
        return {
          matric:    d.matric,
          name:      nameMap[d.matric] || d.matric,
          embedding,
        }
      })
      .filter(Boolean)

    if (storedEmbeddings.length === 0) {
      if (DEV) console.log('[checkDuplicateFace] No other enrolled students to compare against')
      return null
    }

    // Sanity-check: embeddings must be arrays of numbers
    for (const s of storedEmbeddings) {
      if (!Array.isArray(s.embedding) || typeof s.embedding[0] !== 'number') {
        if (DEV) console.error('[checkDuplicateFace] Descriptor for', s.matric, 'is not a numeric array after parsing — type:', typeof s.embedding[0])
        return null
      }
    }

    if (DEV) console.log(`[checkDuplicateFace] Comparing against ${storedEmbeddings.length} enrolled face(s) via Python /deduplicate ...`)

    // Step 4 — Send to Python /deduplicate endpoint
    const res = await fetch(`${FACE_SERVER}/deduplicate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        new_image:         newFaceImage,
        stored_embeddings: storedEmbeddings,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Server error' }))
      if (DEV) console.error('[checkDuplicateFace] /deduplicate returned', res.status, ':', err.detail)
      throw new Error('[dedup] Face verification server error (' + res.status + '). Try again.')
    }

    const result = await res.json()
    if (DEV) console.log('[checkDuplicateFace] Result:', result)

    if (result.is_duplicate) {
      return {
        isDuplicate: true,
        matric:      result.matched_matric,
        name:        result.matched_name,
        similarity:  result.similarity,
        embedding:   result.embedding || null,
      }
    }

    // Return embedding so caller can skip a second /embed/batch call
    return { isDuplicate: false, embedding: result.embedding || null }

  } catch (err) {
    if (DEV) console.error('[checkDuplicateFace] Error:', err.message)
    // Re-throw so handleSubmit can block the enrollment
    throw err.message?.startsWith('[dedup]') ? err : new Error('[dedup] ' + (err.message || 'Unexpected error during face check.'))
  }
}

// ── Get face descriptors for a student ───────────────────────────
export async function getStudentDescriptors(matric) {
  const { data, error } = await supabase
    .from('face_descriptors')
    .select('descriptor')
    .eq('matric', String(matric))

  if (error || !data?.length) return null
  return {
    matric,
    descriptors: data.map(r => Array.from(r.descriptor)),
  }
}

// ── Get all enrolled students with descriptors ────────────────────
export async function getAllEnrolledStudents() {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('matric, name, level, option')
      .eq('enrolled', true)

    if (error || !students?.length) return []

    const { data: descs } = await supabase
      .from('face_descriptors')
      .select('matric, descriptor')

    const descMap = {}
    for (const d of (descs || [])) {
      if (!descMap[d.matric]) descMap[d.matric] = []
      descMap[d.matric].push(Array.from(d.descriptor))
    }

    return students.map(s => ({ ...s, descriptors: descMap[s.matric] || [] }))
  } catch (err) {
    if (DEV) console.warn('getAllEnrolledStudents error:', err.message)
    return []
  }
}

export const getEnrolledStudents = getAllEnrolledStudents

// ── Face match via Supabase pgvector ─────────────────────────────
export async function matchFaceInDatabase(descriptor, threshold = 0.55) {
  const { data, error } = await supabase.rpc('match_face', {
    query_descriptor: Array.from(descriptor),
    match_threshold:  threshold,
    match_count:      1,
  })

  if (error) { if (DEV) console.warn('matchFaceInDatabase error:', error.message); return null }
  if (!data || data.length === 0) return null

  const match = data[0]
  // ArcFace same-person cosine distances realistically fall in 0.1–0.55.
  // Raw (1 - distance) × 100 compresses correct matches into 45–90%, which feels
  // unreliable. Scaling (1 - distance) × 180 maps that range to 63–99% instead.
  const displayConfidence = Math.round(Math.min(99, (1 - match.distance) * 180))
  return {
    student:    { matric:match.matric, name:match.name, level:match.level, option:match.option },
    distance:   match.distance,
    confidence: displayConfidence,
    isMatch:    match.distance < threshold,
  }
}

// ── Mark attendance ───────────────────────────────────────────────
export async function markAttendance({
  matric, name, courseId, week,
  status, confidence, lecturerId, semester, session,
}) {
  if (!matric) throw new Error('Matric is required')

  const { error } = await supabase.from('attendance').insert({
    matric:      String(matric),
    name:        name       || '',
    course_id:   courseId   || null,
    week:        week       || 1,
    status:      status     || 'absent',
    present:     status === 'present',
    confidence:  confidence || 0,
    lecturer_id: lecturerId || null,
    semester:    semester   || '',
    session:     session    || '',
    date:        new Date().toLocaleDateString('en-GB'),
    timestamp:   new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
  return true
}

// ── Attendance summary ────────────────────────────────────────────
export async function getAttendanceSummary(matric) {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('matric', String(matric))
      .order('timestamp', { ascending: false })

    if (error || !data?.length) return { total:0, attended:0, percentage:0, records:[] }

    const attended = data.filter(r => r.present === true).length
    return {
      total:      data.length,
      attended,
      percentage: Math.round((attended / data.length) * 100),
      records:    data,
    }
  } catch (err) {
    if (DEV) console.warn('getAttendanceSummary error:', err.message)
    return { total:0, attended:0, percentage:0, records:[] }
  }
}

// ── Course attendance ─────────────────────────────────────────────
export async function getCourseAttendance(courseId, week) {
  try {
    let query = supabase.from('attendance').select('*').eq('course_id', courseId)
    if (week) query = query.eq('week', week)
    const { data, error } = await query.order('timestamp', { ascending: false })
    if (error) return []
    return data || []
  } catch (err) {
    if (DEV) console.warn('getCourseAttendance error:', err.message)
    return []
  }
}

export async function saveStudentPin(matric, pin) {
  const hash = await bcrypt.hash(String(pin), 10)
  const { error } = await supabase.from('students').update({ pin: hash }).eq('matric', String(matric))
  if (error) throw new Error(error.message)
}

export async function verifyStudentPin(matric, pin) {
  const { data } = await supabase.from('students').select('pin').ilike('matric', String(matric)).single()
  if (!data) return false
  if (!data.pin) return true
  // bcrypt hashes start with $2a$ or $2b$ — support legacy plaintext PINs during migration
  if (data.pin.startsWith('$2')) {
    return bcrypt.compare(String(pin), data.pin)
  }
  return data.pin === String(pin)
}

export async function hasStudentPin(matric) {
  const { data } = await supabase.from('students').select('pin').ilike('matric', String(matric)).single()
  return Boolean(data?.pin)
}

export async function updateAttendanceRecord(id, status) {
  const { error } = await supabase
    .from('attendance')
    .update({ status, present: status === 'present' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getStudentAttendance(matric) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('matric', matric)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getAllAttendanceWithDetails() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

// ── Absence requests ──────────────────────────────────────────────
export async function submitAbsenceRequest(data) {
  const { error } = await supabase
    .from('absence_requests')
    .insert({
      matric:        data.matric,
      student_name:  data.student_name,
      reason_type:   data.reason_type,
      description:   data.description,
      absence_dates: data.absence_dates,
      document_url:  data.document_url  || null,
      document_name: data.document_name || null,
      status:        'pending',
    })
  if (error) throw new Error(error.message)
  return true
}

export async function getMyAbsenceRequests(matric) {
  const { data, error } = await supabase
    .from('absence_requests')
    .select('*')
    .eq('matric', String(matric))
    .order('created_at', { ascending: false })
  if (error) { if (DEV) console.warn('getMyAbsenceRequests error:', error.message); return [] }
  return data || []
}

export async function submitReenrollRequest(data) {
  const { error } = await supabase
    .from('reenroll_requests')
    .insert({
      matric:        data.matric,
      student_name:  data.student_name,
      reason:        data.reason,
      description:   data.description,
      document_url:  data.document_url  || null,
      document_name: data.document_name || null,
      status:        'pending',
    })
  if (error) throw new Error(error.message)
  return true
}

export async function getMyReenrollRequests(matric) {
  const { data, error } = await supabase
    .from('reenroll_requests')
    .select('*')
    .eq('matric', String(matric))
    .order('created_at', { ascending: false })
  if (error) { if (DEV) console.warn('getMyReenrollRequests error:', error.message); return [] }
  return data || []
}

export async function uploadAbsenceDocument(matric, file) {
  const ext  = file.name.split('.').pop()
  const path = `${matric}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('absence-docs')
    .upload(path, file, { upsert: false })

  if (error) throw new Error('Document upload failed: ' + error.message)

  const { data: { publicUrl } } = supabase.storage
    .from('absence-docs')
    .getPublicUrl(path)

  return { url: publicUrl, name: file.name }
}

// ── Student email & OTP ───────────────────────────────────────────
export async function getStudentEmail(matric) {
  const { data } = await supabase
    .from('students')
    .select('email, email_verified')
    .eq('matric', String(matric))
    .single()
  return data || { email: null, email_verified: false }
}

export async function saveAndSendOTP(matric, email) {
  // Rate-limit: one OTP per 60 seconds. Infer creation time from expires_at (expires_at = created + 10min)
  const { data: existing } = await supabase
    .from('student_email_otps')
    .select('expires_at')
    .eq('matric', String(matric))
    .maybeSingle()

  if (existing?.expires_at) {
    const createdAt = new Date(existing.expires_at).getTime() - 10 * 60 * 1000
    const elapsed   = (Date.now() - createdAt) / 1000
    if (elapsed < 60) {
      throw new Error(`Please wait ${Math.ceil(60 - elapsed)}s before requesting a new code.`)
    }
  }

  const otp       = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await supabase.from('student_email_otps').delete().eq('matric', String(matric))
  const { error } = await supabase.from('student_email_otps').insert({
    matric: String(matric), email, otp, expires_at: expiresAt,
  })
  if (error) throw new Error(error.message)
  return otp
}

export async function verifyEmailOTP(matric, email, otp) {
  const { data } = await supabase
    .from('student_email_otps')
    .select('id')
    .eq('matric', String(matric))
    .eq('email', email)
    .eq('otp', otp)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (!data) return false
  await supabase.from('students').update({ email, email_verified: true }).eq('matric', String(matric))
  await supabase.from('student_email_otps').delete().eq('matric', String(matric))
  return true
}

export async function removeStudentEmail(matric) {
  const { error } = await supabase
    .from('students')
    .update({ email: null, email_verified: false })
    .eq('matric', String(matric))
  if (error) throw new Error(error.message)
}

export async function getStudentsWithVerifiedEmail(matricList) {
  if (!matricList.length) return []
  const { data } = await supabase
    .from('students')
    .select('matric, name, email')
    .in('matric', matricList)
    .eq('email_verified', true)
    .not('email', 'is', null)
  return data || []
}

export async function queueAttendanceNotifications(studentStatuses, course, week) {
  // studentStatuses: [{ matric, name, email, status: 'Present'|'Absent' }]
  if (!studentStatuses.length) return
  const date = new Date().toLocaleDateString('en-GB')
  const rows = studentStatuses.map(s => ({
    matric:        s.matric,
    student_name:  s.name,
    email:         s.email,
    course_code:   course?.code || '',
    course_title:  course?.title || '',
    week,
    status:        s.status,
    date,
    sent:          false,
  }))
  const { error } = await supabase.from('attendance_notifications_queue').insert(rows)
  if (DEV && error) console.warn('queueAttendanceNotifications error:', error.message)
}

// ── Master list ───────────────────────────────────────────────────
export async function getMasterList() {
  try {
    const { data, error } = await supabase.from('master_list').select('*').order('name')
    if (error) return []
    return data || []
  } catch (err) {
    if (DEV) console.warn('getMasterList error:', err.message)
    return []
  }
}

export async function uploadMasterList(students) {
  if (!students || students.length === 0) throw new Error('No students provided')
  const rows = students.map(s => ({
    matric: String(s.matric),
    name:   s.name   || '',
    level:  s.level  || '',
    option: s.option || s.course || '',
  }))
  const { error } = await supabase.from('master_list').upsert(rows, { onConflict: 'matric' })
  if (error) throw new Error(error.message)
  return true
}

// ── Delete enrolled student (face data + student record) ──────────
export async function deleteStudent(matric) {
  await supabase.from('face_descriptors').delete().eq('matric', String(matric))
  const { error } = await supabase.from('students').delete().eq('matric', String(matric))
  if (error) throw new Error(error.message)
  return true
}

export async function clearMasterList() {
  const { error } = await supabase
    .from('master_list')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw new Error(error.message)
  return true
}
