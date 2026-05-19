import emailjs from '@emailjs/browser'

// ── EmailJS — lecturer verification only (200 emails/month free) ──────────────
const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export function emailJsConfigured() {
  return !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)
}

export async function sendLecturerInviteEmail(toEmail, code, expiresMinutes = 15) {
  if (!emailJsConfigured()) return false
  await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
    to_email:    toEmail,
    to_name:     toEmail.split('@')[0],
    code,
    expires_in:  `${expiresMinutes} minutes`,
    system_name: 'EEE FACE-ID Attendance System',
    dept:        'Electrical / Electronics Engineering Dept.',
    school:      'Gateway ICT Polytechnic, Saapade',
  }, PUBLIC_KEY)
  return true
}

// ── Brevo — student emails (9,000 free emails/month) ─────────────────────────
const BREVO_KEY    = import.meta.env.VITE_BREVO_API_KEY
const BREVO_FROM   = import.meta.env.VITE_BREVO_SENDER_EMAIL
const BREVO_NAME   = import.meta.env.VITE_BREVO_SENDER_NAME || 'EEE FACE-ID System'

export function studentEmailConfigured() {
  return !!(BREVO_KEY && BREVO_FROM)
}

async function brevoSend(toEmail, toName, subject, html) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: BREVO_NAME, email: BREVO_FROM },
      to:          [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Brevo error ${res.status}`)
  }
  return true
}

export async function sendStudentOTP(toEmail, toName, otp) {
  if (!studentEmailConfigured()) return false
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px 16px">
      <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
        <div style="height:5px;background:linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97)"></div>
        <div style="padding:32px 32px 28px">
          <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;font-weight:600;letter-spacing:.08em;text-transform:uppercase">EEE FACE-ID · Gateway ICT Polytechnic</p>
          <h1 style="margin:0 0 24px;font-size:22px;font-weight:900;color:#0f172a">Email Verification</h1>
          <p style="margin:0 0 8px;font-size:15px;color:#334155">Hi <strong>${toName}</strong>,</p>
          <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6">
            Enter this 6-digit code in the app to verify your email and activate attendance notifications.
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px">
            <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Your verification code</p>
            <p style="margin:0;font-size:40px;font-weight:900;color:#1F6F5F;letter-spacing:.25em;font-family:monospace">${otp}</p>
            <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Expires in 10 minutes</p>
          </div>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
            If you didn't request this, ignore this email. Your account is safe.
          </p>
        </div>
        <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
          <p style="margin:0;font-size:11px;color:#cbd5e1">Electrical/Electronics Engineering Dept. · Gateway ICT Polytechnic, Saapade</p>
        </div>
      </div>
    </div>`
  return brevoSend(toEmail, toName, 'Your EEE FACE-ID verification code: ' + otp, html)
}

export async function sendAttendanceNotification(toEmail, {
  name, matric, status, courseCode, week, date,
}) {
  if (!studentEmailConfigured()) return false
  const isPresent  = status === 'Present'
  const statusColor = isPresent ? '#16a34a' : '#dc2626'
  const statusBg    = isPresent ? '#dcfce7' : '#fee2e2'
  const statusBorder = isPresent ? '#bbf7d0' : '#fecaca'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px 16px">
      <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
        <div style="height:5px;background:${isPresent ? 'linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97)' : 'linear-gradient(90deg,#991b1b,#dc2626,#f87171)'}"></div>
        <div style="padding:32px 32px 28px">
          <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;font-weight:600;letter-spacing:.08em;text-transform:uppercase">EEE FACE-ID · Attendance Update</p>
          <h1 style="margin:0 0 24px;font-size:22px;font-weight:900;color:#0f172a">Attendance Recorded</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#334155">Hi <strong>${name}</strong>,</p>
          <div style="background:${statusBg};border:1.5px solid ${statusBorder};border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
            <div style="font-size:28px">${isPresent ? '✅' : '❌'}</div>
            <div>
              <p style="margin:0 0 2px;font-size:11px;color:${statusColor};font-weight:700;letter-spacing:.08em;text-transform:uppercase">Attendance Status</p>
              <p style="margin:0;font-size:22px;font-weight:900;color:${statusColor}">${status}</p>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
            ${[['Course', courseCode], ['Week', `Week ${week}`], ['Date', date], ['Matric', matric]].map(([label, val]) => `
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:10px 0;color:#94a3b8;font-weight:600;width:100px">${label}</td>
              <td style="padding:10px 0;color:#0f172a;font-weight:700">${val}</td>
            </tr>`).join('')}
          </table>
          <a href="#" style="display:block;text-align:center;background:linear-gradient(135deg,#2FA084,#1F6F5F);color:#fff;font-weight:700;font-size:14px;padding:14px;border-radius:10px;text-decoration:none;margin-bottom:20px">
            View Full Attendance in App
          </a>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
            ${isPresent
              ? 'Great — keep attending to maintain your eligibility.'
              : 'If you were present but marked absent, contact your lecturer or submit an absence request in the app.'}
          </p>
        </div>
        <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
          <p style="margin:0;font-size:11px;color:#cbd5e1">Electrical/Electronics Engineering Dept. · Gateway ICT Polytechnic, Saapade</p>
        </div>
      </div>
    </div>`
  return brevoSend(toEmail, name, `${courseCode} Week ${week} — You were marked ${status}`, html)
}
