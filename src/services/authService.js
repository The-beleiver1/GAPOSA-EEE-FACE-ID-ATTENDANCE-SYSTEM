import { supabase } from '@/lib/supabase'

// ── Admin login ─────────────────────────────────────────────────
export async function adminLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileErr || !profile || profile.role !== 'admin') {
    await supabase.auth.signOut()
    throw new Error('Not an admin account')
  }

  return { user: data.user, profile }
}

// ── Lecturer login ───────────────────────────────────────────────
export async function lecturerLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileErr || !profile) throw new Error('Account not found')
  if (profile.role !== 'lecturer') throw new Error('Not a lecturer account')
  if (profile.status !== 'approved') throw new Error('Account pending approval by admin')

  return { user: data.user, profile }
}

// ── Lecturer invite code — generate & store ──────────────────────
function makeCode() {
  const seg = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4).padEnd(4,'X')
  return `EEE-${seg()}-${seg()}`
}

export async function generateLecturerInvite(email) {
  const lEmail = email.toLowerCase().trim()

  const code = makeCode()
  const { error } = await supabase.from('lecturer_auth_codes').insert({
    email: lEmail,
    code,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  })
  if (error) throw new Error(error.message)
  return code
}

export async function getLecturerInvites() {
  const { data, error } = await supabase
    .from('lecturer_auth_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

async function validateLecturerCode(email, code) {
  const { data, error } = await supabase
    .from('lecturer_auth_codes')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('code', code.trim().toUpperCase())
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !data) throw new Error('Invalid or expired authorization code. Request a new one.')
  return data
}

// ── Lecturer register ────────────────────────────────────────────
export async function lecturerRegister({ name, email, password, secretCode, courses }) {
  const codeRecord = await validateLecturerCode(email, secretCode)

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Registration failed. Please try again.')

  const profile = {
    id:         data.user.id,
    name,
    email,
    role:       'lecturer',
    status:     'pending',
    courses:    courses || [],
    created_at: new Date().toISOString(),
  }

  const { error: insertErr } = await supabase.from('users').insert(profile)
  if (insertErr) throw new Error(insertErr.message)

  // Mark code as used (one-time only)
  await supabase
    .from('lecturer_auth_codes')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', codeRecord.id)

  await supabase.auth.signOut()
  return profile
}

// ── Update lecturer course assignments ───────────────────────────
export async function updateLecturerCourses(uid, courseIds) {
  const { error } = await supabase
    .from('users')
    .update({ courses: courseIds })
    .eq('id', uid)
  if (error) throw new Error(error.message)
}

// ── Student lookup ───────────────────────────────────────────────
export async function studentLookup(matric) {
  const { data, error } = await supabase
    .from('master_list')
    .select('*')
    .eq('matric', matric.toUpperCase())
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Matric number not found in master list')
  return data
}

// ── Anonymous session for student self-enrollment ────────────────
export async function enrollAnonymousSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw new Error(error.message)
}

// ── Sign out ─────────────────────────────────────────────────────
export async function signOut() {
  await supabase.auth.signOut()
}

// ── Password reset ───────────────────────────────────────────────
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw new Error(error.message)
}

// ── Get user profile ─────────────────────────────────────────────
export async function getUserProfile(uid) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single()

  if (error) return null
  return data
}

// ── Approve lecturer ─────────────────────────────────────────────
export async function approveLecturer(uid) {
  const { error } = await supabase
    .from('users')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', uid)
  if (error) throw new Error(error.message)
}

// ── Reject lecturer ──────────────────────────────────────────────
export async function rejectLecturer(uid) {
  const { error } = await supabase
    .from('users')
    .update({ status: 'rejected' })
    .eq('id', uid)
  if (error) throw new Error(error.message)
}

// ── Delete lecturer completely (profile + auth account) ───────────
export async function deleteLecturer(uid) {
  const { error } = await supabase.rpc('delete_lecturer_completely', { user_id: uid })
  if (error) throw new Error(error.message)
}
