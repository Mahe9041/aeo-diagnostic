"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { QueryForm } from "@/components/forms/QueryForm";
import { ReportCard } from "@/components/report/ReportCard";
import { LoadingSkeleton } from "@/components/report/LoadingSkeleton";
import { HistoryChart } from "@/components/history/HistoryChart";
import type { DiagnoseRequest, JobState, HistoryRun } from "@/types";

type PageState = "idle" | "loading" | "done" | "error";

export default function HomePage() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [jobState, setJobState] = useState<JobState | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState<HistoryRun[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => { return () => eventSourceRef.current?.close(); }, []);

  const fetchHistory = useCallback(async (productName: string, query?: string) => {
    try {
      const params = new URLSearchParams({ productName });
      if (query) params.set("query", query);
      const res = await fetch(`/api/history?${params}`);
      if (res.ok) { const data = await res.json(); setHistory(data.runs ?? []); }
    } catch { /* non-critical */ }
  }, []);

  const handleSubmit = useCallback(async (request: DiagnoseRequest) => {
    eventSourceRef.current?.close();
    setPageState("loading");
    setJobState(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { jobId } = await res.json();
      const es = new EventSource(`/api/stream/${jobId}`);
      eventSourceRef.current = es;
      es.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "state") {
          const state: JobState = msg.state;
          setJobState(state);
          if (state.status === "done") {
            setPageState("done");
            es.close();
            setTimeout(() => fetchHistory(request.productName, request.query), 500);
          }
          if (state.status === "failed") {
            setPageState("error");
            setErrorMsg(state.error ?? "Diagnostic failed.");
            es.close();
          }
        }
        if (msg.type === "error") { setPageState("error"); setErrorMsg(msg.message); es.close(); }
      };
      es.onerror = () => { setPageState("error"); setErrorMsg("Connection lost. Please try again."); es.close(); };
    } catch (err) {
      setPageState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [fetchHistory]);

  const handleDownloadPdf = useCallback(async () => {
    if (!jobState?.report) return;
    const { downloadPdf } = await import("@/lib/pdf/generator");
    await downloadPdf(jobState.report);
  }, [jobState]);

  const handleReset = () => {
    eventSourceRef.current?.close();
    setPageState("idle");
    setJobState(null);
    setErrorMsg("");
    setHistory([]);
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ borderBottom: "1px solid var(--border)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>AEO Diagnostic</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>AI search visibility · GPT · Claude · Gemini</p>
        </div>
        {pageState !== "idle" && (
          <button onClick={handleReset} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
            ← New diagnostic
          </button>
        )}
      </header>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
        {pageState === "idle" && (
          <div className="fade-up">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 12px" }}>How does AI rank your product?</h2>
              <p style={{ fontSize: 16, color: "var(--text-secondary)", margin: 0 }}>Ask what a shopper would ask. See where you land across GPT-4o, Claude, and Gemini.</p>
            </div>
            <div className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
              <QueryForm onSubmit={handleSubmit} isLoading={false} />
            </div>
          </div>
        )}

        {pageState === "loading" && jobState && <LoadingSkeleton status={jobState.status} />}

        {pageState === "done" && jobState?.report && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <ReportCard report={jobState.report} onDownloadPdf={handleDownloadPdf} />
            {history.length >= 2 && <HistoryChart runs={history} />}
          </div>
        )}

        {pageState === "error" && (
          <div className="card" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 14, fontFamily: "var(--font-mono)", color: "var(--grade-d)", marginBottom: 16 }}>{errorMsg}</p>
            <button onClick={handleReset} className="btn-primary">Try again</button>
          </div>
        )}
      </div>
    </main>
  );
}
