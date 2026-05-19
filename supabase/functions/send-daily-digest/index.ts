import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') as string
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const BREVO_API_KEY        = Deno.env.get('BREVO_API_KEY') as string
const SENDER_EMAIL         = Deno.env.get('SENDER_EMAIL') as string
const SENDER_NAME          = Deno.env.get('SENDER_NAME') ?? 'EEE FACE-ID System'

/* ── Send one email via Brevo SMTP API ────────────────────────────── */
async function sendEmail(toEmail: string, toName: string, subject: string, html: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
      to:          [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Brevo error ${res.status}: ${JSON.stringify(err)}`)
  }
}

/* ── Build digest HTML email ─────────────────────────────────────── */
function buildDigestHtml(name: string, matric: string, courses: any[], date: string): string {
  const present    = courses.filter(c => c.status === 'Present').length
  const total      = courses.length
  const allPresent = present === total

  const rows = courses.map(c => {
    const isP   = c.status === 'Present'
    const color = isP ? '#16a34a' : '#dc2626'
    const bg    = isP ? '#f0fdf4' : '#fff1f2'
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:${bg}">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">${isP ? '✅' : '❌'}</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a">${c.course_code}${c.course_title ? ' — ' + c.course_title : ''}</p>
              <p style="margin:0;font-size:12px;color:#94a3b8">Week ${c.week}</p>
            </div>
          </div>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;background:${bg}">
          <span style="display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;color:${color};background:${isP ? '#dcfce7' : '#fee2e2'}">
            ${c.status}
          </span>
        </td>
      </tr>`
  }).join('')

  const summaryColor  = allPresent ? '#16a34a' : present === 0 ? '#dc2626' : '#d97706'
  const summaryBg     = allPresent ? '#f0fdf4' : present === 0 ? '#fff1f2' : '#fffbeb'
  const summaryBorder = allPresent ? '#bbf7d0' : present === 0 ? '#fecaca' : '#fde68a'
  const summaryMsg    = allPresent
    ? 'Excellent — you attended all classes today!'
    : present === 0
    ? 'You missed all classes today. Contact your lecturers if needed.'
    : `You attended ${present} of ${total} classes today.`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:32px auto;padding:0 16px">

    <!-- Card -->
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

      <!-- Top bar -->
      <div style="height:5px;background:linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97)"></div>

      <!-- Header -->
      <div style="padding:28px 32px 20px">
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:700;letter-spacing:.1em;text-transform:uppercase">
          EEE FACE-ID · Gateway ICT Polytechnic
        </p>
        <h1 style="margin:0;font-size:22px;font-weight:900;color:#0f172a">Daily Attendance Summary</h1>
        <p style="margin:6px 0 0;font-size:14px;color:#64748b">${date}</p>
      </div>

      <!-- Student info -->
      <div style="padding:0 32px 20px">
        <p style="margin:0;font-size:15px;color:#334155">
          Hi <strong>${name}</strong> &nbsp;·&nbsp;
          <span style="font-family:monospace;font-size:13px;color:#94a3b8">${matric}</span>
        </p>
        <p style="margin:6px 0 0;font-size:13px;color:#64748b">
          Here's your attendance record for today's classes:
        </p>
      </div>

      <!-- Course table -->
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase;border-bottom:2px solid #f1f5f9">Course</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase;border-bottom:2px solid #f1f5f9">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <!-- Summary banner -->
      <div style="margin:20px 32px;padding:14px 18px;border-radius:12px;background:${summaryBg};border:1.5px solid ${summaryBorder}">
        <p style="margin:0;font-size:13px;font-weight:700;color:${summaryColor}">
          ${present}/${total} classes attended today
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:${summaryColor};opacity:.85">${summaryMsg}</p>
      </div>

      <!-- Footer note -->
      <div style="padding:0 32px 28px">
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7">
          If you believe an attendance record is incorrect, contact your lecturer or submit an absence request through the EEE FACE-ID app.
        </p>
      </div>

      <!-- Footer bar -->
      <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:14px 32px;text-align:center">
        <p style="margin:0;font-size:11px;color:#cbd5e1">
          Electrical/Electronics Engineering Dept. · Gateway ICT Polytechnic, Saapade
        </p>
      </div>
    </div>

  </div>
</body>
</html>`
}

/* ── Edge Function entry point ────────────────────────────────────── */
Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Today's date in DD/MM/YYYY format (matches what the app stores)
    const today = new Date().toLocaleDateString('en-GB')

    // Fetch all unsent notifications for today
    const { data: pending, error } = await supabase
      .from('attendance_notifications_queue')
      .select('*')
      .eq('date', today)
      .eq('sent', false)

    if (error) throw new Error('DB query failed: ' + error.message)
    if (!pending?.length) {
      return new Response(JSON.stringify({ message: 'No pending notifications', sent: 0 }), { status: 200 })
    }

    // Group by student
    const byStudent: Record<string, { email: string; name: string; matric: string; courses: any[] }> = {}
    for (const n of pending) {
      if (!byStudent[n.matric]) {
        byStudent[n.matric] = { email: n.email, name: n.student_name, matric: n.matric, courses: [] }
      }
      byStudent[n.matric].courses.push(n)
    }

    const sentIds: string[] = []
    let sentCount  = 0

    for (const { email, name, matric, courses } of Object.values(byStudent)) {
      try {
        const html    = buildDigestHtml(name, matric, courses, today)
        const present = courses.filter(c => c.status === 'Present').length
        const subject = `Attendance summary ${today} — ${present}/${courses.length} classes attended`
        await sendEmail(email, name, subject, html)
        sentIds.push(...courses.map((c: any) => c.id))
        sentCount++
      } catch (err) {
        console.error(`Failed to send to ${email}:`, err)
      }
    }

    // Mark sent records
    if (sentIds.length) {
      await supabase
        .from('attendance_notifications_queue')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .in('id', sentIds)
    }

    return new Response(JSON.stringify({ sent: sentCount, total: Object.keys(byStudent).length }), { status: 200 })

  } catch (err) {
    console.error('Edge Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
