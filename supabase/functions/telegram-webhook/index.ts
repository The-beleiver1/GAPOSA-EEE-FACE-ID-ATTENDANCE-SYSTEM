import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') as string;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chat_id: number | string, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  const update = await req.json().catch(() => null);
  if (!update?.message) return new Response('OK', { status: 200 });

  const message = update.message;
  const chat_id = message.chat.id;
  const text = (message.text || '').trim().toUpperCase();

  if (text === '/START') {
    await sendMessage(chat_id,
      '<b>GAPOSA EEE · Attendance System</b>\n\n' +
      'To receive attendance notifications here:\n\n' +
      '1. Open the GAPOSA app\n' +
      '2. Go to <b>Profile</b>\n' +
      '3. Tap <b>Link Telegram</b>\n' +
      '4. Copy the code and send it here\n\n' +
      '<i>Codes expire after 15 minutes.</i>'
    );
    return new Response('OK', { status: 200 });
  }

  if (/^LINK-[A-Z0-9]{6}$/.test(text)) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: linkCode } = await supabase
      .from('telegram_link_codes')
      .select('*')
      .eq('code', text)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!linkCode) {
      await sendMessage(chat_id,
        '&#10060; <b>Invalid or expired code.</b>\n\n' +
        'Open the GAPOSA app → Profile → Link Telegram to generate a new code.'
      );
      return new Response('OK', { status: 200 });
    }

    const { error: updateErr } = await supabase
      .from('students')
      .update({ telegram_chat_id: String(chat_id) })
      .ilike('matric', linkCode.matric);

    if (updateErr) {
      await sendMessage(chat_id, '&#10060; Something went wrong. Please try again.');
      return new Response('OK', { status: 200 });
    }

    await supabase
      .from('telegram_link_codes')
      .update({ used: true })
      .eq('id', linkCode.id);

    const { data: student } = await supabase
      .from('students')
      .select('name, matric')
      .ilike('matric', linkCode.matric)
      .single();

    const firstName = (student?.name || 'Student').split(' ')[0];

    await sendMessage(chat_id,
      `&#9989; <b>Account linked successfully.</b>\n\n` +
      `Hello <b>${firstName}</b> (${student?.matric || linkCode.matric}),\n\n` +
      `You will now receive attendance notifications here.\n\n` +
      `<i>Gateway ICT Polytechnic — EEE Dept.</i>`
    );
    return new Response('OK', { status: 200 });
  }

  await sendMessage(chat_id,
    'Open the GAPOSA app → Profile → Link Telegram, then send the code shown here.'
  );
  return new Response('OK', { status: 200 });
});
