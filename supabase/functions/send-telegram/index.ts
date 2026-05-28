import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') as string
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const TELEGRAM_BOT_TOKEN   = Deno.env.get('TELEGRAM_BOT_TOKEN') as string
const TELEGRAM_API         = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendMessage(chat_id: string, text: string) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error(`Telegram send failed for ${chat_id}:`, JSON.stringify(err))
  }
}

function attendanceMessage(
  courseCode:     string,
  week:           number,
  date:           string,
  status:         string,
  totalAbsences:  number,
): string {
  const isPresent  = status.toLowerCase() === 'present'
  const statusLine = isPresent ? 'PRESENT &#9989;' : 'ABSENT &#10060;'
  const footer     = isPresent
    ? ''
    : '\nIf you were present but marked absent, submit an absence request immediately via the GAPOSA app.\n'

  return (
    `<b>EEE FACE-ID · Attendance Record</b>\n` +
    `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
    `Course  : ${courseCode}\n` +
    `Week    : Week ${week}\n` +
    `Date    : ${date}\n` +
    `Status  : ${statusLine}\n\n` +
    `This has been logged in your academic record.\n` +
    `Total absences this semester: <b>${totalAbsences}</b>\n` +
    footer +
    `\n<i>Gateway ICT Polytechnic — EEE Dept.</i>`
  )
}

function thresholdWarning(courseCode: string, pct: number, absences: number): string | null {
  if (pct < 75) {
    return (
      `&#128680; <b>CRITICAL ATTENDANCE WARNING</b>\n` +
      `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
      `Course  : ${courseCode}\n` +
      `Absences: ${absences} this semester\n\n` +
      `You are below the minimum attendance requirement. This has been flagged in your academic record.\n\n` +
      `<i>Gateway ICT Polytechnic — EEE Dept.</i>`
    )
  }
  if (pct < 80) {
    return (
      `&#9888;&#65039; <b>ATTENDANCE WARNING</b>\n` +
      `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
      `Course  : ${courseCode}\n` +
      `Absences: ${absences} this semester\n\n` +
      `You are approaching the minimum attendance threshold. Any further absence will put you below the required limit.\n\n` +
      `<i>Gateway ICT Polytechnic — EEE Dept.</i>`
    )
  }
  return null
}

function consecutiveWarning(courseCode: string, count: number): string {
  return (
    `&#9888;&#65039; <b>CONSECUTIVE ABSENCES</b>\n` +
    `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
    `Course  : ${courseCode}\n\n` +
    `You have missed ${count} consecutive classes. Regular attendance is required and is being noted in your academic record.\n\n` +
    `<i>Gateway ICT Polytechnic — EEE Dept.</i>`
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')   return new Response('Method not allowed', { status: 405, headers: CORS })

  try {
    const { notifications, semester, session } = await req.json()
    if (!notifications?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Bulk-fetch telegram_chat_ids for all matrics
    const matrics: string[] = [...new Set(notifications.map((n: any) => n.matric as string))]
    const { data: students } = await supabase
      .from('students')
      .select('matric, telegram_chat_id')
      .in('matric', matrics)

    if (!students?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no telegram users' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Map matric (uppercase) → chat_id
    const chatMap: Record<string, string> = {}
    for (const s of students) {
      if (s.telegram_chat_id) chatMap[s.matric.toUpperCase()] = s.telegram_chat_id
    }

    let sent = 0

    for (const n of notifications) {
      const chat_id = chatMap[n.matric.toUpperCase()]
      if (!chat_id) continue

      // Total absences across all courses this semester
      const { count: totalAbsences } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .ilike('matric', n.matric)
        .eq('status', 'absent')
        .eq('semester', semester || '')
        .eq('session', session || '')

      // Send the attendance record message
      await sendMessage(chat_id, attendanceMessage(
        n.course_code,
        n.week,
        n.date,
        n.status,
        totalAbsences || 0,
      ))
      sent++

      // Only run threshold/consecutive checks if the student was absent
      if (n.status.toLowerCase() !== 'absent' || !n.course_id) continue

      // Fetch all attendance records for this student × course × semester (ordered recent-first)
      const { data: courseRecs } = await supabase
        .from('attendance')
        .select('status')
        .ilike('matric', n.matric)
        .eq('course_id', n.course_id)
        .eq('semester', semester || '')
        .eq('session', session || '')
        .order('week', { ascending: false })

      if (!courseRecs?.length) continue

      const total    = courseRecs.length
      const absences = courseRecs.filter((r: any) => r.status === 'absent').length
      const pct      = Math.round(((total - absences) / total) * 100)

      // Threshold warning (send at most once — only on the class that caused the breach)
      const warn = thresholdWarning(n.course_code, pct, absences)
      if (warn) {
        await sendMessage(chat_id, warn)
        continue
      }

      // Consecutive absence check (2+ in a row)
      const top = courseRecs.slice(0, 3)
      const streak = top.findIndex((r: any) => r.status !== 'absent')
      const consecCount = streak === -1 ? top.length : streak
      if (consecCount >= 2) {
        await sendMessage(chat_id, consecutiveWarning(n.course_code, consecCount))
      }
    }

    return new Response(
      JSON.stringify({ sent, total: notifications.length }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-telegram error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
