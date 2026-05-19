import { supabase } from '@/lib/supabase'

export async function getCourses() {
  const { data, error } = await supabase.from('courses').select('*')
  if (error) throw new Error(error.message)
  return data || []
}

export async function getLecturerCourses(lecturerId) {
  const { data: profile } = await supabase
    .from('users')
    .select('courses')
    .eq('id', lecturerId)
    .single()
  if (!profile?.courses?.length) return []
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .in('id', profile.courses)
  if (error) throw new Error(error.message)
  return data || []
}

export async function getCourse(id) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createCourse(data) {
  const { data: course, error } = await supabase
    .from('courses')
    .insert({ ...data, created_at: new Date().toISOString() })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return course.id
}

export async function updateCourse(id, data) {
  const { error } = await supabase.from('courses').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCourse(id) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Settings ─────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  session:              '2024/2025',
  semester:             'Second Semester',
  total_weeks:          15,
  auto_logout:          'off',
  offline_scan_queue:   false,
  lecturer_secret_code: 'EEE2025',
}

export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*').single()
  if (error || !data) return DEFAULT_SETTINGS
  return data
}

export async function updateSettings(data) {
  const { error } = await supabase.from('settings').upsert({ id: 1, ...data })
  if (error) throw new Error(error.message)
}

// ── Lecturers ─────────────────────────────────────────────────────
export async function getLecturers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'lecturer')
  if (error) throw new Error(error.message)
  return data || []
}

export async function getPendingLecturers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'lecturer')
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
  return data || []
}
