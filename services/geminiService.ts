
import { GoogleGenAI } from "@google/genai";
import { PaymentRequest } from "../types";

export const summarizeRequest = async (request: PaymentRequest): Promise<string> => {
  // Obtain API key exclusively from environment variable process.env.API_KEY.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable is missing.");
    return "Gemini service requires an API key.";
  }

  // Use named parameter when initializing the SDK client.
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert executive assistant helping an Executive Director prioritize payment reviews.
    Please summarize this payment request into 2-3 professional and objective sentences. 
    Clearly highlight the vendor, the exact amount, the project being billed, and the core purpose.
    
    Data Context:
    - Subject Header: ${request.requestSubject}
    - Linked Project: ${request.billingProject}
    - Vendor Entity: ${request.vendorName}
    - Financial Value: ${request.currency} ${request.amount.toLocaleString()}
    - Originating Dept: ${request.department}
    - Requester Notes: ${request.description}
    - Submitted By: ${request.requesterName}
  `;

  try {
    // Basic Text Tasks: Use 'gemini-3-flash-preview' for best efficiency.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // Access the .text property directly as per modern GenerateContentResponse interface.
    return response.text || "Summary generation returned empty content.";
  } catch (error: any) {
    console.error("Gemini summarization failed:", error);
    // Graceful error handling for API failures.
    if (error.status === 429) return "AI rate limit reached. Please try manually reviewing for now.";
    return "The AI assistant is temporarily unavailable. Detailed breakdown is provided in the request form.";
  }
};
