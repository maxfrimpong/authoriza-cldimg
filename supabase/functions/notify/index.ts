// Supabase Edge Function: notify
// Sends transactional email via SendGrid. The SendGrid API key and verified
// sender live ONLY in the function's secrets, never in the client bundle.
//
// Deploy:
//   supabase functions deploy notify
// Set secrets:
//   supabase secrets set SENDGRID_API_KEY=SG.xxxx
//   supabase secrets set SENDGRID_FROM=media@yotaweb.org   (must be a verified sender)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  const from = Deno.env.get('SENDGRID_FROM') ?? 'media@yotaweb.org';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'SENDGRID_API_KEY not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let body: { to?: string; subject?: string; html?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { to, subject, html, text } = body;
  if (!to || !subject || (!html && !text)) {
    return new Response(JSON.stringify({ error: 'Missing required fields (to, subject, content)' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: html ? 'text/html' : 'text/plain', value: html || text }],
    }),
  });

  if (!sgRes.ok) {
    const details = await sgRes.text();
    return new Response(JSON.stringify({ error: 'Failed to send email', details }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: 'Email sent' }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
