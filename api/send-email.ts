// Vercel serverless function: POST /api/send-email
// Sends transactional email via Resend. The Resend key and sender live in
// Vercel environment variables (server-side), never in the client bundle.
//
// Set in Vercel -> Project -> Settings -> Environment Variables (Production + Preview):
//   RESEND_API_KEY        re_xxxxx
//   RESEND_FROM           SendREQ <notifications@yourdomain>   (verified domain in Resend)
//   EMAIL_RELAY_SECRET    optional; if set, callers must send a matching
//                         x-relay-secret header (see note below)
//
// Request body: { to: string, subject: string, html?: string, text?: string }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    res.status(500).json({ error: 'Email not configured (RESEND_API_KEY / RESEND_FROM missing)' });
    return;
  }

  // Optional shared-secret barrier. This is a minor deterrent against a stranger
  // using the relay, not real authentication (a browser-held secret is public).
  // Real protection comes with the Supabase Auth migration (verify a session JWT).
  const guard = process.env.EMAIL_RELAY_SECRET;
  if (guard && req.headers['x-relay-secret'] !== guard) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { to, subject, html, text } = body;
  if (!to || !subject || (!html && !text)) {
    res.status(400).json({ error: 'Missing required fields (to, subject, content)' });
    return;
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, ...(html ? { html } : { text }) }),
  });

  if (!resendRes.ok) {
    const details = await resendRes.text();
    res.status(502).json({ error: 'Failed to send email', details });
    return;
  }

  const data = await resendRes.json();
  res.status(200).json({ message: 'Email sent', id: data?.id });
}
