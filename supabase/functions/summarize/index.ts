// Supabase Edge Function: summarize
// Generates an executive summary of a payment request via the Gemini API.
// The Gemini API key lives ONLY in the function's secrets, never in the client.
//
// Deploy:
//   supabase functions deploy summarize
// Set secret:
//   supabase secrets set GEMINI_API_KEY=xxxx

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = 'gemini-2.0-flash';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let r: Record<string, unknown>;
  try {
    r = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const prompt = `You are an expert executive assistant helping an Executive Director prioritise payment reviews.
Summarise this payment request in 2-3 professional, objective sentences. Clearly highlight the vendor, the exact amount, the project being billed, and the core purpose.

Data Context:
- Subject Header: ${r.requestSubject ?? ''}
- Linked Project: ${r.billingProject ?? ''}
- Vendor Entity: ${r.vendorName ?? ''}
- Financial Value: ${r.currency ?? ''} ${r.amount ?? ''}
- Originating Dept: ${r.department ?? ''}
- Requester Notes: ${r.description ?? ''}
- Submitted By: ${r.requesterName ?? ''}`;

  const gRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  if (!gRes.ok) {
    const status = gRes.status === 429 ? 429 : 502;
    return new Response(JSON.stringify({ error: 'Gemini request failed' }), {
      status, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const data = await gRes.json();
  const summary =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

  return new Response(JSON.stringify({ summary }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
