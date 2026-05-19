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

export const SEMESTERS = ['First Semester', 'Second Semester']

export function weekRange(total = 15) {
  return Array.from({ length: total }, (_, i) => i + 1)
}
