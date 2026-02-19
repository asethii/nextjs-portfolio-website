import { z } from "zod";

export const RequestSchema = z.object({
  mode: z.enum(["html", "url"]),
  html: z.string().nullable(),
  url: z.string().nullable(),
});

export const IssueSchema = z.object({
  issue: z.string(),
  severity: z.union([z.literal("High"), z.literal("Medium"), z.literal("Low")]),
  evidence: z.string(),
  recommendation: z.string(),
  selector: z.string().optional(),
  xpath: z.string().optional(),
});

export const QuickFixSchema = z.object({
  title: z.string(),
  diff_like_suggestion: z.string(),
});

export const ResponseSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  summary: z.string(),
  accessibility_issues: z.array(IssueSchema),
  ux_improvements: z.array(IssueSchema),
  quick_fixes: z.array(QuickFixSchema),
  unknowns: z.array(z.string()),
  severity_counts: z
    .object({ High: z.number().int().min(0), Medium: z.number().int().min(0), Low: z.number().int().min(0) })
    .optional(),
});

export type AuditRequest = z.infer<typeof RequestSchema>;
export type AuditResponse = z.infer<typeof ResponseSchema>;

// Small helper to strongly type parsing results
export function validateAuditResponse(obj: unknown) {
  return ResponseSchema.parse(obj);
}
