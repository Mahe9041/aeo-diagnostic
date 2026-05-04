"use client";

import type { JobStatus } from "@/types";

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Queued...",
  orchestrating: "Analyzing query + selecting prompt template...",
  running: "Querying GPT-4o, Claude, and Gemini in parallel...",
  judging: "Judge agent scoring results...",
  done: "Complete",
  failed: "Failed",
};

const STEPS: JobStatus[] = ["queued","orchestrating","running","judging","done"];

export function LoadingSkeleton({ status }: { status: JobStatus }) {
  const currentStep = STEPS.indexOf(status);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span className="pulse-dot" style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{STATUS_LABELS[status]}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {STEPS.slice(0, -1).map((step, i) => {
            const isComplete = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-mono)", background: isComplete ? "var(--accent)" : isActive ? "var(--accent-glow)" : "var(--bg-input)", border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`, color: isComplete ? "white" : isActive ? "var(--accent)" : "var(--text-muted)" }}>
                    {isComplete ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>{step}</span>
                </div>
                {i < STEPS.length - 2 && <div style={{ flex: 1, height: 1, background: i < currentStep ? "var(--accent)" : "var(--border)" }} />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {["GPT-4o","Claude","Gemini"].map((label) => (
          <div key={label} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</span>
              <div className="skeleton" style={{ width: 60, height: 20 }} />
            </div>
            <div className="skeleton" style={{ height: 6, width: "100%", marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 48, width: "100%", marginBottom: 12 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="skeleton" style={{ height: 12, width: "100%" }} />
              <div className="skeleton" style={{ height: 12, width: "80%" }} />
              <div className="skeleton" style={{ height: 12, width: "60%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
