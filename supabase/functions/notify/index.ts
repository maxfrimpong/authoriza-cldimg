// Supabase Edge Function: notify
// Sends transactional email via Resend. The Resend API key and verified sender
// live ONLY in the function's secrets, never in the client bundle.
//
// Deploy:
//   supabase functions deploy notify
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxx
//   supabase secrets set RESEND_FROM="SendREQ <notifications@yourdomain>"   (verified domain in Resend)
//
// Request body: { to: string, subject: string, html?: string, text?: string }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM');
  if (!apiKey || !from) {
    return json(500, { error: 'RESEND_API_KEY / RESEND_FROM not configured' });
  }

  let body: { to?: string; subject?: string; html?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { to, subject, html, text } = body;
  if (!to || !subject || (!html && !text)) {
    return json(400, { error: 'Missing required fields (to, subject, content)' });
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      ...(html ? { html } : { text }),
    }),
  });

  if (!resendRes.ok) {
    const details = await resendRes.text();
    return json(502, { error: 'Failed to send email', details });
  }

  const data = await resendRes.json();
  return json(200, { message: 'Email sent', id: data?.id });
});
