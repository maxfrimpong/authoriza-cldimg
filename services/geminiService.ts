import { PaymentRequest } from "../types";
import { FUNCTIONS_URL, SUPABASE_ANON } from "./supabaseClient";

/**
 * Summarise a payment request for an approver.
 *
 * The Gemini API key lives ONLY in the `summarize` Supabase Edge Function
 * (server-side). It is never bundled into the client. This call sends the
 * request payload to that function and returns the generated summary.
 */
export const summarizeRequest = async (request: PaymentRequest): Promise<string> => {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        requestSubject: request.requestSubject,
        billingProject: request.billingProject,
        vendorName: request.vendorName,
        currency: request.currency,
        amount: request.amount,
        department: request.department,
        description: request.description,
        requesterName: request.requesterName,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return "AI rate limit reached. Please review manually for now.";
      return "The AI assistant is temporarily unavailable. The full breakdown is in the request form.";
    }

    const data = await res.json();
    return data.summary || "Summary generation returned empty content.";
  } catch (error) {
    console.error("Gemini summarization failed:", error);
    return "The AI assistant is temporarily unavailable. The full breakdown is in the request form.";
  }
};
