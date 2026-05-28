import { clsx } from 'clsx'

export function cn(...args) { return clsx(args) }

export function formatDate(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(ts) {
  return `${formatDate(ts)} · ${formatTime(ts)}`
}

export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function attendanceColor(pct) {
  if (pct >= 75) return 'text-green-600'
  if (pct >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

export function parseExcelStudentList(data) {
  // data is array of rows from XLSX
  return data.slice(1).map(row => ({
    matric: String(row[0] || '').trim().toUpperCase(),
    name:   String(row[1] || '').trim(),
    level:  String(row[2] || '').trim(),
    course: String(row[3] || '').trim(),
  })).filter(s => s.matric && s.name)
}

export const LEVELS = ['ND 1', 'ND 2', 'HND 1', 'HND 2']

// Normalise level strings so "HND II" == "HND 2", "ND I" == "ND 1", etc.
export function normalizeLevel(level) {
  if (!level) return ''
  return level.toString().trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\bIII\b/g, '3')
    .replace(/\bII\b/g,  '2')
    .replace(/\bI\b/g,   '1')
    .replace(/(\D)2\b/g, '$1 2')   // "HND2" → "HND 2"
    .replace(/(\D)1\b/g, '$1 1')   // "HND1" → "HND 1"
    .replace(/  +/g, ' ')
    .trim()
}

// Derive the canonical level from a course code prefix.
// 1x = ND 1, 2x = ND 2, 3x = HND 1, 4x = HND 2
export function levelFromCourseCode(code) {
  if (!code) return null
  const m = code.match(/(\d)/)
  if (!m) return null
  switch (m[1]) {
    case '1': return 'ND 1'
    case '2': return 'ND 2'
    case '3': return 'HND 1'
    case '4': return 'HND 2'
    default:  return null
  }
}

export const SEMESTERS = ['First Semester', 'Second Semester']

export function weekRange(total = 15) {
  return Array.from({ length: total }, (_, i) => i + 1)
}
