import { NextResponse } from "next/server";
import { RequestSchema, validateAuditResponse } from "../../../lib/uxAuditSchema";
import { fetchHtmlSnippet, sanitizeHtml } from "../../../lib/fetchHtml";
import { auditWithModel, attemptRepair, OpenAIError } from "../../../lib/openaiClient";

const SYSTEM_PROMPT = `You are a UX + accessibility auditor specializing in WCAG/Section 508 and Nielsen heuristics. Evaluate the provided HTML or extracted page content and produce a JSON object matching the exact schema. Output MUST be valid JSON only, with these keys: overall_score, summary, accessibility_issues, ux_improvements, quick_fixes, unknowns. For each reported issue include evidence strings that point to concrete HTML patterns and — when possible — the first matching DOM snippet (single-line HTML fragment) that triggered the finding (e.g., "<img src=\"...\">" or "<button aria-hidden=\"true\"></button>"). Also include an approximate CSS selector (field: "selector") or XPath (field: "xpath") for the element when possible. If you cannot determine something, add it to unknowns. Do not include markdown or any extra keys.`;

function extractFirstSnippet(content: string) {
  if (!content) return "";
  // rudimentary search for elements likely to trigger accessibility issues
  const re = /<(img|button|a|input|label|form|nav|header|footer|h[1-6])\b[^>]*>(?:[^<]*<\/\1>)?|<(img|input|br|hr)\b[^>]*\/?>/i;
  const m = content.match(re);
  if (m) return m[0].trim().replace(/\n/g, " ").slice(0, 300);
  return content.replace(/\s+/g, " ").slice(0, 300);
}

function buildUserPrompt(mode: string, analyzedTarget: string, content: string, firstSnippetHint: string) {
  return `AnalyzedTarget: ${analyzedTarget}\n\nMode: ${mode}\n\nContent:\n${content}\n\nHINT: When listing issues, if possible include the first matching DOM snippet that triggered the issue in the "evidence" field (single-line, exact HTML). Also include an approximate CSS selector (field: "selector") or XPath (field: "xpath") for the element if you can. For reference, an example snippet from the content: ${firstSnippetHint}\n\nPlease respond ONLY with JSON matching the schema. Start the summary with "Analyzed: ${analyzedTarget} -" and keep it 1-3 sentences. overall_score is integer 0-100. Provide arrays for accessibility_issues and ux_improvements with severity High|Medium|Low and evidence and recommendation strings. Provide quick_fixes as an array of {title, diff_like_suggestion}. Provide unknowns as array of strings.`;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    // Honeypot check: reject submissions where hidden field 'hp' is filled.
    if (json && typeof json.hp === "string" && json.hp.trim() !== "") {
      console.warn("[ux-audit] honeypot triggered, hp length=", json.hp.length);
      return NextResponse.json({ error: "spam detected" }, { status: 400 });
    }
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { mode, html, url } = parsed.data;

    let contentForModel = "";
    let sanitizedSnippetForResponse = "";
    if (mode === "html") {
      if (!html) return NextResponse.json({ error: "html required for mode=html" }, { status: 400 });
      if (html.length === 0) return NextResponse.json({ error: "empty html" }, { status: 400 });
      if (html.length > 12000) return NextResponse.json({ error: "html too large (max 12000 chars)" }, { status: 400 });
      // sanitize user-provided snippet for model and for preview
      const s = sanitizeHtml(html, 12000);
      contentForModel = s;
      sanitizedSnippetForResponse = s;
      console.log("[ux-audit] mode=html length=", contentForModel.length);
    } else {
      if (!url) return NextResponse.json({ error: "url required for mode=url" }, { status: 400 });
      if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "invalid url scheme" }, { status: 400 });
      // fetch
      const fetched = await fetchHtmlSnippet(url, { timeoutMs: 10000, maxBytes: 1_000_000 });
      if (!fetched || !fetched.snippet) return NextResponse.json({ error: "failed to fetch content" }, { status: 400 });
      contentForModel = fetched.snippet.slice(0, 12000);
      sanitizedSnippetForResponse = fetched.snippet.slice(0, 12000);
      console.log("[ux-audit] mode=url url=", url, "fetchedLen=", fetched.length, "contentLen=", contentForModel.length);
    }

    if (!contentForModel || contentForModel.trim().length === 0) return NextResponse.json({ error: "empty content after extraction" }, { status: 400 });

    const analyzedTarget = mode === "url" ? (url ?? "Code Snippet") : "Code Snippet";
    const firstSnippet = extractFirstSnippet(contentForModel);
    const userPrompt = buildUserPrompt(mode, analyzedTarget, contentForModel, firstSnippet);

    // Call model
    const first = await auditWithModel(SYSTEM_PROMPT, userPrompt);
    if (first.validated) {
      // ensure severity counts exist
      const out = { ...first.validated } as any;
      if (!out.severity_counts) {
        const counts = { High: 0, Medium: 0, Low: 0 };
        (out.accessibility_issues || []).forEach((i: any) => {
          const sev = i && typeof i.severity === "string" && ["High", "Medium", "Low"].includes(i.severity) ? i.severity : "Medium";
          counts[sev as keyof typeof counts] = (counts[sev as keyof typeof counts] || 0) + 1;
        });
        out.severity_counts = counts;
      }
      return NextResponse.json({ result: out, raw: first.raw, analyzed_target: analyzedTarget, sanitized_snippet: sanitizedSnippetForResponse });
    }

    // If model returned parsable JSON that failed schema validation, attempt lightweight coercion
    if (first.parsed && typeof first.parsed === "object") {
      const candidate = first.parsed as any;
      // Ensure top-level keys exist
      candidate.overall_score = typeof candidate.overall_score === "number" ? Math.max(0, Math.min(100, Math.round(candidate.overall_score))) : 0;
      candidate.summary = typeof candidate.summary === "string" ? candidate.summary : "";
      candidate.accessibility_issues = Array.isArray(candidate.accessibility_issues) ? candidate.accessibility_issues : [];
      candidate.ux_improvements = Array.isArray(candidate.ux_improvements) ? candidate.ux_improvements : [];
      candidate.quick_fixes = Array.isArray(candidate.quick_fixes) ? candidate.quick_fixes : [];
      candidate.unknowns = Array.isArray(candidate.unknowns) ? candidate.unknowns : [];

      const fillIssueField = (arr: any[]) => {
        return arr.map((it) => {
          if (it && typeof it === "object") {
            if (!it.issue) it.issue = it.evidence || it.recommendation || "unspecified issue";
            if (!it.severity || !["High", "Medium", "Low"].includes(it.severity)) it.severity = "Medium";
            if (!it.evidence) it.evidence = "";
            if (!it.recommendation) it.recommendation = "";
            return {
              issue: String(it.issue),
              severity: it.severity,
              evidence: String(it.evidence),
              recommendation: String(it.recommendation),
              selector: it.selector ? String(it.selector) : undefined,
              xpath: it.xpath ? String(it.xpath) : undefined,
            };
          }
          return null;
        }).filter(Boolean);
      };

      candidate.accessibility_issues = fillIssueField(candidate.accessibility_issues);
      candidate.ux_improvements = fillIssueField(candidate.ux_improvements);

      // quick_fixes coercion
      candidate.quick_fixes = (candidate.quick_fixes || []).map((q: any) => ({ title: q?.title ? String(q.title) : "Quick fix", diff_like_suggestion: q?.diff_like_suggestion ? String(q.diff_like_suggestion) : "" }));

      try {
        // compute severity counts and normalize selectors
        const counts = { High: 0, Medium: 0, Low: 0 };
        candidate.accessibility_issues = (candidate.accessibility_issues || []).map((it: any) => {
          if (it && typeof it === 'object') {
            const sev = typeof it.severity === "string" && ["High", "Medium", "Low"].includes(it.severity) ? it.severity : "Medium";
            counts[sev as keyof typeof counts] = (counts[sev as keyof typeof counts] || 0) + 1;
            return it;
          }
          return it;
        });
        candidate.severity_counts = counts;

        const validated = validateAuditResponse(candidate);
        return NextResponse.json({ result: validated, raw: first.raw, analyzed_target: analyzedTarget, sanitized_snippet: sanitizedSnippetForResponse });
      } catch (e) {
        // fall through to repair
      }
    }

    // Attempt repair once via model
    const repair = await attemptRepair(first.raw, SYSTEM_PROMPT);
    if (repair.validated) {
      const out = { ...repair.validated } as any;
      if (!out.severity_counts) {
        const counts = { High: 0, Medium: 0, Low: 0 };
        (out.accessibility_issues || []).forEach((i: any) => {
          const sev = i && typeof i.severity === "string" && ["High", "Medium", "Low"].includes(i.severity) ? i.severity : "Medium";
          counts[sev as keyof typeof counts] = (counts[sev as keyof typeof counts] || 0) + 1;
        });
        out.severity_counts = counts;
      }
      return NextResponse.json({ result: out, raw: repair.raw, analyzed_target: analyzedTarget, sanitized_snippet: sanitizedSnippetForResponse });
    }

    // final failure
    return NextResponse.json({ error: "Failed to get valid JSON from model", raw: repair.raw || first.raw }, { status: 500 });
  } catch (err) {
    console.error("/api/ux-audit error:", err);
    // If it's an OpenAI quota/429, forward a friendly message and status
    if ((err as any)?.status) {
      const status = (err as any).status;
      const body = (err as any).body || String(err);
      let userMsg = "OpenAI API error";
      if (status === 429) userMsg = "OpenAI quota exceeded or rate limited. Check your account billing/usage.";
      return NextResponse.json({ error: userMsg, details: body }, { status });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
