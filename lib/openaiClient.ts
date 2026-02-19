import { AuditResponse, ResponseSchema } from "./uxAuditSchema";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";

export class OpenAIError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`OpenAI error ${status}`);
    this.status = status;
    this.body = body;
  }
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

async function callOpenAI(systemPrompt: string, userPrompt: string, opts?: { temperature?: number; max_tokens?: number }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set on server");

  const body = {
    model: getModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: opts?.temperature ?? 0.2,
    max_tokens: opts?.max_tokens ?? 1200,
  } as any;

  const res = await fetch(OPENAI_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    // Surface 429/quota errors to caller with status
    throw new OpenAIError(res.status, txt);
  }

  const data = await res.json();
  // model's last message
  const text = data.choices?.[0]?.message?.content || "";
  return { raw: text, full: data };
}

// Attempt to parse JSON and validate; if invalid, a repair attempt can be made by caller
export async function auditWithModel(systemPrompt: string, userPrompt: string) {
  const first = await callOpenAI(systemPrompt, userPrompt);
  // Try parse
  // Helper: attempt to extract JSON from noisy model output
  function tryParseMaybe(text: string) {
    try {
      return JSON.parse(text);
    } catch (e) {
      // strip markdown code fences
      const fenced = text.replace(/```(?:json)?\n?([\s\S]*?)```/i, "$1");
      try {
        return JSON.parse(fenced);
      } catch (e2) {
        // attempt to find first {...} block
        const m = fenced.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            return JSON.parse(m[0]);
          } catch (e3) {
            return null;
          }
        }
        return null;
      }
    }
  }

  const parsedCandidate = tryParseMaybe(first.raw);
  if (parsedCandidate) {
    try {
      const validated = ResponseSchema.parse(parsedCandidate);
      return { validated, raw: first.raw, modelOutput: first.full, parsed: parsedCandidate } as { validated: AuditResponse; raw: string; modelOutput: any; parsed?: any };
    } catch (e) {
      // parsed JSON didn't validate to schema - return parsed candidate for potential coercion by caller
      return { validated: null, raw: first.raw, modelOutput: first.full, parsed: parsedCandidate } as any;
    }
  }

  // No parsable JSON found
  return { validated: null, raw: first.raw, modelOutput: first.full } as any;
}

export async function attemptRepair(invalidText: string, systemPrompt: string) {
  const jsonSkeleton = {
    overall_score: 0,
    summary: "",
    accessibility_issues: [],
    ux_improvements: [],
    quick_fixes: [],
    unknowns: [],
  };
  const repairUser = `The model returned invalid JSON or extraneous text:\n\n${invalidText}\n\nRETURN ONLY valid JSON matching the required schema exactly. Use this skeleton and fill in realistic values (don't add keys): ${JSON.stringify(jsonSkeleton)}. Do not include any explanation, commentary, or markdown.`;
  const attempt = await callOpenAI(systemPrompt, repairUser, { temperature: 0.0, max_tokens: 1000 });
  try {
    const parsed = JSON.parse(attempt.raw);
    const validated = ResponseSchema.parse(parsed);
    return { validated, raw: attempt.raw, modelOutput: attempt.full } as { validated: AuditResponse; raw: string; modelOutput: any };
  } catch (e) {
    return { validated: null, raw: attempt.raw, modelOutput: attempt.full } as any;
  }
}
