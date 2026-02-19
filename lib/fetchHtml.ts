// Safe HTML fetcher with timeout and size cap
export async function fetchHtmlSnippet(url: string, opts?: { timeoutMs?: number; maxBytes?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 10000;
  const maxBytes = opts?.maxBytes ?? 1_000_000; // 1MB

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "AI-UX-Auditor/1.0" } });
  } catch (err) {
    clearTimeout(id);
    throw new Error("Failed to fetch URL: " + String(err));
  }
  clearTimeout(id);

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    // not strictly required to fail — but warn and continue
  }

  // Try to stream-limited read if available
  let raw = "";
  try {
    if (res.body && (res.body as any).getReader) {
      const reader = (res.body as any).getReader();
      let done = false;
      while (!done) {
        const { value, done: chunkDone } = await reader.read();
        if (value) {
          raw += new TextDecoder().decode(value);
          if (raw.length > maxBytes) {
            reader.cancel();
            break;
          }
        }
        done = chunkDone;
      }
    } else {
      raw = await res.text();
      if (raw.length > maxBytes) raw = raw.slice(0, maxBytes);
    }
  } catch (err) {
    throw new Error("Failed while reading response body: " + String(err));
  }

  // Basic cleanup: remove scripts/styles
  const withoutScripts = raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");

  const titleMatch = withoutStyles.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const bodyMatch = withoutStyles.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : withoutStyles;

  // Remove excessive whitespace
  const sanitized = bodyHtml.replace(/\s+/g, " ").trim();

  // Return title + excerpt, capped
  const maxModelChars = 12000;
  let excerpt = sanitized.slice(0, maxModelChars);
  if (sanitized.length > excerpt.length) excerpt = excerpt + "\n\n...[truncated]";

  const result = `Title: ${title}\n\n${excerpt}`.slice(0, maxModelChars);
  return { title, snippet: result, length: raw.length, contentType };
}

export function sanitizeHtml(raw: string, maxChars = 12000) {
  if (!raw) return "";
  // remove scripts and styles, and inline event handlers and javascript: links
  let out = raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  out = out.replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/href\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "href=\"#\"");
  out = out.replace(/javascript:\/\/[\s\S]*/gi, "");
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > maxChars) out = out.slice(0, maxChars) + "\n\n...[truncated]";
  return out;
}
