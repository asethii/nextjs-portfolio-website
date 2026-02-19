"use client";

import React, { useState } from "react";

type Mode = "html" | "url";

export default function AIUXAuditorPage() {
  const [mode, setMode] = useState<Mode>("html");
  const [html, setHtml] = useState("");
  const [url, setUrl] = useState("");
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [analyzedTarget, setAnalyzedTarget] = useState<string | null>(null);
  const [sanitizedSnippet, setSanitizedSnippet] = useState<string | null>(null);

  async function analyze() {
    setError(null);
    setResult(null);
    setLoading(true);
      try {
      const payload = { mode, html: mode === "html" ? html : null, url: mode === "url" ? url : null, hp };
      const res = await fetch("/api/ux-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Server error");
      } else if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        setAnalyzedTarget(data.analyzed_target || null);
        setSanitizedSnippet(data.sanitized_snippet || null);
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">AI UX & Accessibility Auditor</h1>

      <div className="mb-4">
        <label className="mr-3"><input type="radio" name="mode" checked={mode === "html"} onChange={() => setMode("html")} /> HTML</label>
        <label><input type="radio" name="mode" checked={mode === "url"} onChange={() => setMode("url")} /> URL</label>
      </div>

      {mode === "html" ? (
        <div className="mb-4">
          <label className="block mb-1">Paste HTML snippet (max 12k chars)</label>
          <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={12} className="w-full p-2 border" />
          {/* Honeypot input to catch naive bots that auto-fill form fields; keep hidden */}
          <input name="hp" value={hp} onChange={(e) => setHp(e.target.value)} autoComplete="off" aria-hidden="true" style={{ display: "none" }} />
        </div>
      ) : (
        <div className="mb-4">
          <label className="block mb-1">Page URL (http/https)</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full p-2 border" />
        </div>
      )}

      <div className="mb-4">
        <button onClick={analyze} className="px-4 py-2 bg-blue-600 text-white" disabled={loading}>{loading ? "Analyzing…" : "Analyze"}</button>
      </div>

      {error && <div className="mb-4 text-red-600">Error: {error}</div>}

      {result && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Results</h2>
          {analyzedTarget && <div className="mb-2"><strong>Analyzed:</strong> {analyzedTarget}</div>}
          <div className="mb-2"><strong>Overall Score:</strong> {result.overall_score}</div>
          <div className="mb-2">
            <strong>Severity Counts:</strong>
            <span className="ml-2">High: {result.severity_counts?.High ?? 0}</span>
            <span className="ml-2">Medium: {result.severity_counts?.Medium ?? 0}</span>
            <span className="ml-2">Low: {result.severity_counts?.Low ?? 0}</span>
          </div>

          {sanitizedSnippet && (
            <div className="mb-4">
              <strong>Preview (sandboxed):</strong>
              <div className="border mt-2" style={{ height: 300 }}>
                <iframe title="preview" srcDoc={sanitizedSnippet} sandbox="allow-same-origin" style={{ width: "100%", height: "100%", border: 0 }} />
              </div>
              <div className="text-sm text-gray-500 mt-1">Preview is sandboxed (scripts disabled). Images or external resources may not load.</div>
            </div>
          )}
          <div className="mb-2"><strong>Summary:</strong> {result.summary}</div>

          <div className="mb-4">
            <strong>Accessibility Issues:</strong>
            <ul>
              {result.accessibility_issues.map((it: any, i: number) => (
                <li key={i} className="mb-2">
                  <div>{`[${it.severity}] ${it.issue} — ${it.recommendation}`}</div>
                  {it.evidence ? <pre className="bg-gray-50 p-2 mt-1 text-black">{it.evidence}</pre> : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <strong>UX Improvements:</strong>
            <ul>
              {result.ux_improvements.map((it: any, i: number) => (
                <li key={i} className="mb-2">
                  <div>{`[${it.severity}] ${it.issue} — ${it.recommendation}`}</div>
                  {it.evidence ? <pre className="bg-gray-50 p-2 mt-1">{it.evidence}</pre> : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <strong>Quick Fixes:</strong>
            {result.quick_fixes.map((q: any, i: number) => (
              <div key={i} className="mb-2">
                <div className="font-medium">{q.title}</div>
                <pre className="bg-gray-100 p-2 overflow-auto text-black">{q.diff_like_suggestion}</pre>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <strong>Unknowns:</strong>
            <ul>
              {result.unknowns.map((u: string, i: number) => <li key={i}>{u}</li>)}
            </ul>
          </div>

          <details>
            <summary>Raw JSON</summary>
            <pre className="p-2 bg-gray-50 overflow-auto text-black">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
