"use client";

import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Grid,
  Divider,
  IconButton,
  Snackbar,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SearchIcon from "@mui/icons-material/SearchOutlined";

type Mode = "html" | "url";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`auditor-tabpanel-${index}`} aria-labelledby={`auditor-tab-${index}`} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

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
  const [tabValue, setTabValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  async function analyze() {
    setError(null);
    setResult(null);
    setLoading(true);
    setTabValue(0);
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

  const handleCopyJSON = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setSnackbarMessage("JSON copied to clipboard!");
      setSnackbarOpen(true);
    }
  };

  const handleExportJSON = () => {
    if (result) {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ux-audit-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbarMessage("JSON exported!");
      setSnackbarOpen(true);
    }
  };

  const getSeverityColor = (severity: string): "error" | "warning" | "info" => {
    if (severity === "High") return "error";
    if (severity === "Medium") return "warning";
    return "info";
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === "High") return <ErrorIcon fontSize="small" />;
    if (severity === "Medium") return <WarningIcon fontSize="small" />;
    return <CheckCircleIcon fontSize="small" />;
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper elevation={0} sx={{ p: 4, mb: 4, bgcolor: "background.paper", borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <SearchIcon sx={{ fontSize: 40, color: "primary.main" }} />
            <Box>
              <Typography variant="h1" sx={{ fontSize: "2rem", mb: 0.5 }}>
                AI UX & Accessibility Auditor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Analyze HTML snippets or live URLs for WCAG compliance and UX best practices
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          {/* Left Column: Input */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ position: "sticky", top: 16 }}>
              <CardContent sx={{ p: 3 }}>
                <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                    Input Mode
                  </FormLabel>
                  <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                    <FormControlLabel value="html" control={<Radio />} label="HTML Snippet" />
                    <FormControlLabel value="url" control={<Radio />} label="Live URL" />
                  </RadioGroup>
                </FormControl>

                {mode === "html" ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    label="Paste HTML (max 12k chars)"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    helperText={`${html.length} / 12000 characters`}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                ) : (
                  <TextField
                    fullWidth
                    label="Page URL"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    helperText="Must start with http:// or https://"
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                )}

                {/* Honeypot */}
                <input name="hp" value={hp} onChange={(e) => setHp(e.target.value)} autoComplete="off" aria-hidden="true" style={{ display: "none" }} />

                <Button fullWidth variant="contained" size="large" onClick={analyze} disabled={loading || (mode === "html" && !html) || (mode === "url" && !url)} sx={{ mb: 2 }}>
                  {loading ? "Analyzing…" : "Run Audit"}
                </Button>

                {loading && <LinearProgress sx={{ borderRadius: 1 }} />}

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column: Results */}
          <Grid size={{ xs: 12, md: 7 }}>
            {!result && !loading && (
              <Paper sx={{ p: 6, textAlign: "center", bgcolor: "success.light", borderRadius: 3 }}>
                <SearchIcon sx={{ fontSize: 80, color: "primary.main", mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Ready to Audit
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Enter HTML or a URL and click "Run Audit" to get started
                </Typography>
              </Paper>
            )}

            {result && (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  {/* Results Header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">Audit Results</Typography>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" onClick={handleCopyJSON} title="Copy JSON">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={handleExportJSON} title="Export JSON">
                        <FileDownloadIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {analyzedTarget && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <strong>Analyzed:</strong> {analyzedTarget}
                    </Alert>
                  )}

                  {/* Score and Counts */}
                  <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
                    <Chip label={`Score: ${result.overall_score}/100`} color="primary" size="medium" sx={{ fontSize: "1rem", px: 1 }} />
                    <Chip icon={<ErrorIcon />} label={`High: ${result.severity_counts?.High ?? 0}`} color="error" size="medium" />
                    <Chip icon={<WarningIcon />} label={`Medium: ${result.severity_counts?.Medium ?? 0}`} color="warning" size="medium" />
                    <Chip icon={<CheckCircleIcon />} label={`Low: ${result.severity_counts?.Low ?? 0}`} color="info" size="medium" />
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  {/* Tabs */}
                  <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
                    <Tab label="Summary" />
                    <Tab label={`Issues (${result.accessibility_issues.length})`} />
                    <Tab label={`UX (${result.ux_improvements.length})`} />
                    <Tab label={`Quick Fixes (${result.quick_fixes.length})`} />
                    {sanitizedSnippet && <Tab label="Preview" />}
                    <Tab label="Raw JSON" />
                  </Tabs>

                  {/* Tab 0: Summary */}
                  <TabPanel value={tabValue} index={0}>
                    <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                      {result.summary}
                    </Typography>
                    {result.unknowns && result.unknowns.length > 0 && (
                      <Box mt={3}>
                        <Typography variant="h6" gutterBottom>
                          Unknowns
                        </Typography>
                        <Stack spacing={1}>
                          {result.unknowns.map((u: string, i: number) => (
                            <Alert key={i} severity="warning" sx={{ fontSize: "0.875rem" }}>
                              {u}
                            </Alert>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </TabPanel>

                  {/* Tab 1: Accessibility Issues */}
                  <TabPanel value={tabValue} index={1}>
                    {result.accessibility_issues.length === 0 ? (
                      <Alert severity="success">No accessibility issues found!</Alert>
                    ) : (
                      <Stack spacing={1}>
                        {result.accessibility_issues.map((it: any, i: number) => (
                          <Accordion key={i}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack direction="row" alignItems="center" spacing={2} width="100%">
                                {getSeverityIcon(it.severity)}
                                <Chip label={it.severity} color={getSeverityColor(it.severity)} size="small" />
                                <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: 500 }}>
                                  {it.issue}
                                </Typography>
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ bgcolor: "background.default" }}>
                              <Typography variant="body2" gutterBottom>
                                <strong>Recommendation:</strong> {it.recommendation}
                              </Typography>
                              {it.evidence && (
                                <Box mt={2}>
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Evidence:
                                  </Typography>
                                  <Paper sx={{ p: 2, bgcolor: "grey.100", fontFamily: "monospace", fontSize: "0.85rem", overflow: "auto" }}>{it.evidence}</Paper>
                                </Box>
                              )}
                              {it.selector && (
                                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                  Selector: {it.selector}
                                </Typography>
                              )}
                              {it.xpath && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  XPath: {it.xpath}
                                </Typography>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Stack>
                    )}
                  </TabPanel>

                  {/* Tab 2: UX Improvements */}
                  <TabPanel value={tabValue} index={2}>
                    {result.ux_improvements.length === 0 ? (
                      <Alert severity="success">No UX improvements suggested!</Alert>
                    ) : (
                      <Stack spacing={1}>
                        {result.ux_improvements.map((it: any, i: number) => (
                          <Accordion key={i}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack direction="row" alignItems="center" spacing={2} width="100%">
                                {getSeverityIcon(it.severity)}
                                <Chip label={it.severity} color={getSeverityColor(it.severity)} size="small" />
                                <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: 500 }}>
                                  {it.issue}
                                </Typography>
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ bgcolor: "background.default" }}>
                              <Typography variant="body2" gutterBottom>
                                <strong>Recommendation:</strong> {it.recommendation}
                              </Typography>
                              {it.evidence && (
                                <Box mt={2}>
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Evidence:
                                  </Typography>
                                  <Paper sx={{ p: 2, bgcolor: "grey.100", fontFamily: "monospace", fontSize: "0.85rem", overflow: "auto" }}>{it.evidence}</Paper>
                                </Box>
                              )}
                              {it.selector && (
                                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                  Selector: {it.selector}
                                </Typography>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Stack>
                    )}
                  </TabPanel>

                  {/* Tab 3: Quick Fixes */}
                  <TabPanel value={tabValue} index={3}>
                    {result.quick_fixes.length === 0 ? (
                      <Alert severity="info">No quick fixes available</Alert>
                    ) : (
                      <Stack spacing={2}>
                        {result.quick_fixes.map((q: any, i: number) => (
                          <Paper key={i} sx={{ p: 2, bgcolor: "success.light" }}>
                            <Typography variant="h6" gutterBottom sx={{ fontSize: "1rem", fontWeight: 600 }}>
                              {q.title}
                            </Typography>
                            <Paper sx={{ p: 2, bgcolor: "grey.100", fontFamily: "monospace", fontSize: "0.85rem", overflow: "auto", whiteSpace: "pre-wrap" }}>{q.diff_like_suggestion}</Paper>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </TabPanel>

                  {/* Tab 4: Preview (conditional) */}
                  {sanitizedSnippet && (
                    <TabPanel value={tabValue} index={4}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Sandboxed preview (scripts disabled). External resources may not load.
                      </Typography>
                      <Paper sx={{ height: 400, overflow: "hidden", mt: 2 }}>
                        <iframe title="preview" srcDoc={sanitizedSnippet} sandbox="allow-same-origin" style={{ width: "100%", height: "100%", border: 0 }} />
                      </Paper>
                    </TabPanel>
                  )}

                  {/* Tab 5 or 6: Raw JSON */}
                  <TabPanel value={tabValue} index={sanitizedSnippet ? 5 : 4}>
                    <Paper sx={{ p: 2, bgcolor: "grey.100", fontFamily: "monospace", fontSize: "0.85rem", overflow: "auto", maxHeight: 500 }}>
                      <pre style={{ margin: 0 }}>{JSON.stringify(result, null, 2)}</pre>
                    </Paper>
                  </TabPanel>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* Snackbar for feedback */}
        <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} message={snackbarMessage} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
      </Container>
    </Box>
  );
}
