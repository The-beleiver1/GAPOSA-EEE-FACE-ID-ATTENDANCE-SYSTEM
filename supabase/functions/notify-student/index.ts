import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const TELEGRAM_BOT_TOKEN   = Deno.env.get('TELEGRAM_BOT_TOKEN') as string;
const BREVO_API_KEY        = Deno.env.get('BREVO_API_KEY') as string;
const SENDER_EMAIL         = Deno.env.get('SENDER_EMAIL') as string;
const SENDER_NAME          = Deno.env.get('SENDER_NAME') || 'EEE FACE-ID System';
const TELEGRAM_API         = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendTelegram(chat_id: string, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' }),
  });
}

async function sendEmail(toEmail: string, toName: string, subject: string, html: string) {
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    }),
  });
}

function wrapEmailHtml(text: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
      <div style="height:5px;background:linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97)"></div>
      <div style="padding:32px">
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:700;letter-spacing:.1em;text-transform:uppercase">EEE FACE-ID · Gateway ICT Polytechnic</p>
        <p style="margin:16px 0 0;font-size:14px;color:#334155;line-height:1.8;white-space:pre-line">${text.replace(/<[^>]+>/g, '')}</p>
      </div>
      <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:14px 32px;text-align:center">
        <p style="margin:0;font-size:11px;color:#cbd5e1">Electrical/Electronics Engineering Dept. · Gateway ICT Polytechnic, Saapade</p>
      </div>
    </div>
  </div>`;
}

function warningLetterTelegram(name: string, matric: string, courseCode: string, pct: number, absences: number, date: string): string {
  return (
    `&#128680; <b>ACADEMIC WARNING LETTER</b>\n` +
    `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
    `To      : ${name} (${matric})\n` +
    `Subject : Insufficient Attendance — ${courseCode}\n` +
    `Date    : ${date}\n\n` +
    `This is to formally notify you that your attendance in <b>${courseCode}</b> has fallen below the required minimum of 75%.\n\n` +
    `Attendance : <b>${pct}%</b>\n` +
    `Absences   : <b>${absences}</b> classes this semester\n\n` +
    `Students who fail to meet the 75% requirement will be <b>BARRED</b> from sitting for the end-of-semester examination.\n\n` +
    `You are hereby advised to attend ALL remaining scheduled classes without fail.\n\n` +
    `<i>H.O.D, Electrical/Electronics Engineering Dept.\nGateway ICT Polytechnic, Saapade</i>`
  );
}

function warningLetterHtml(name: string, matric: string, courseCode: string, pct: number, absences: number, date: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:32px auto;padding:0 16px">
  <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="height:5px;background:linear-gradient(90deg,#991b1b,#dc2626,#f87171)"></div>
    <div style="padding:28px 36px 32px">
      <div style="border-bottom:2px solid #f1f5f9;padding-bottom:20px;margin-bottom:24px">
        <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Electrical/Electronics Engineering Dept. · Gateway ICT Polytechnic, Saapade</p>
        <p style="margin:4px 0 0;font-size:10px;color:#cbd5e1">EEE FACE-ID Attendance System</p>
      </div>
      <div style="background:#fff1f2;border:1.5px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
        <span style="font-size:22px">&#128680;</span>
        <div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#dc2626;letter-spacing:.08em;text-transform:uppercase">Academic Warning</p>
          <p style="margin:2px 0 0;font-size:18px;font-weight:900;color:#991b1b">Insufficient Attendance</p>
        </div>
      </div>
      <p style="margin:0 0 20px;font-size:13px;color:#64748b">${date}</p>
      <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">
        <strong>${name}</strong><br>
        <span style="font-family:monospace;font-size:12px;color:#94a3b8">${matric}</span><br>
        Electrical/Electronics Engineering Dept.<br>Gateway ICT Polytechnic, Saapade.
      </p>
      <p style="margin:0 0 20px;font-size:14px;color:#0f172a"><strong>RE: INSUFFICIENT CLASS ATTENDANCE — ${courseCode}</strong></p>
      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7">
        I write to formally notify you that your attendance record in <strong>${courseCode}</strong> has fallen below the minimum required threshold of <strong>75%</strong> as stipulated by departmental policy.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#f8fafc;border-radius:10px;overflow:hidden">
        <tr><td style="padding:12px 16px;font-size:13px;color:#94a3b8;font-weight:600;width:140px">Current Attendance</td><td style="padding:12px 16px;font-size:14px;font-weight:900;color:#dc2626">${pct}%</td></tr>
        <tr style="border-top:1px solid #f1f5f9"><td style="padding:12px 16px;font-size:13px;color:#94a3b8;font-weight:600">Total Absences</td><td style="padding:12px 16px;font-size:14px;font-weight:900;color:#0f172a">${absences} classes this semester</td></tr>
        <tr style="border-top:1px solid #f1f5f9"><td style="padding:12px 16px;font-size:13px;color:#94a3b8;font-weight:600">Minimum Required</td><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#0f172a">75%</td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7">
        In accordance with departmental regulations, students who fail to attain the minimum attendance requirement will be <strong>BARRED from sitting for the end-of-semester examination</strong> in the affected course(s).
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.7">
        You are hereby strongly advised to attend <strong>ALL remaining scheduled classes</strong> without exception. Further absences must be supported by a formal absence request through the EEE FACE-ID system.
      </p>
      <div style="border-top:1.5px solid #f1f5f9;padding-top:20px">
        <p style="margin:0;font-size:13px;color:#334155;line-height:1.8">
          Yours faithfully,<br><br><strong>Head of Department</strong><br>
          Electrical/Electronics Engineering Dept.<br>Gateway ICT Polytechnic, Saapade
        </p>
      </div>
    </div>
  </div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Warning letter: query DB, calculate %, send if below 75% ──
    if (body.type === 'warning') {
      const { matric, name, course_code, course_id, semester, session } = body;

      const { data: courseRecs } = await supabase
        .from('attendance')
        .select('status')
        .ilike('matric', matric)
        .eq('course_id', course_id)
        .eq('semester', semester || '')
        .eq('session', session || '');

      if (!courseRecs?.length) {
        return new Response(JSON.stringify({ ok: true, skipped: 'no records' }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      }

      const total    = courseRecs.length;
      const absences = courseRecs.filter((r: any) => r.status === 'absent').length;
      const pct      = Math.round(((total - absences) / total) * 100);

      if (pct >= 75) {
        return new Response(JSON.stringify({ ok: true, skipped: 'above threshold', pct }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      }

      const { data: student } = await supabase
        .from('students')
        .select('name, email, email_verified, telegram_chat_id')
        .ilike('matric', matric)
        .single();

      const studentName = student?.name || name || matric;
      const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

      if (student?.telegram_chat_id) {
        await sendTelegram(student.telegram_chat_id, warningLetterTelegram(studentName, matric, course_code, pct, absences, date));
      } else if (student?.email && student?.email_verified) {
        await sendEmail(student.email, studentName, `Academic Warning — ${course_code} Attendance`, warningLetterHtml(studentName, matric, course_code, pct, absences, date));
      }

      return new Response(JSON.stringify({ ok: true, sent: true, pct }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // ── Event notification: route text/html to correct channel ────
    const { matric, text, subject, html } = body;

    const { data: student } = await supabase
      .from('students')
      .select('name, email, email_verified, telegram_chat_id')
      .ilike('matric', matric)
      .single();

    if (!student) {
      return new Response(JSON.stringify({ ok: false, error: 'student not found' }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (student.telegram_chat_id) {
      await sendTelegram(student.telegram_chat_id, text);
    } else if (student.email && student.email_verified) {
      await sendEmail(student.email, student.name, subject || 'EEE FACE-ID Notification', html || wrapEmailHtml(text));
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('notify-student error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
