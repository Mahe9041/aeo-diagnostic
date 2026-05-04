"use client";

import type { DiagnosticReport, AiProvider, ProviderResult } from "@/types";

const PROVIDER_CONFIG: Record<AiProvider, { label: string; color: string }> = {
  gpt:    { label: "GPT-4o",  color: "var(--gpt)" },
  claude: { label: "Claude",  color: "var(--claude)" },
  gemini: { label: "Gemini",  color: "var(--gemini)" },
};

const GRADE_COLOR: Record<string, string> = {
  A: "var(--grade-a)", B: "var(--grade-b)", C: "var(--grade-c)", D: "var(--grade-d)", F: "var(--grade-f)",
};

const REC_ICON: Record<string, string> = { gap: "↓", strength: "↑", action: "→" };
const REC_COLOR: Record<string, string> = { gap: "var(--grade-d)", strength: "var(--grade-a)", action: "var(--gemini)" };

function ProviderCard({ result, delay }: { result: ProviderResult; delay: number }) {
  const cfg = PROVIDER_CONFIG[result.provider];
  return (
    <div className="card fade-up" style={{ "--delay": `${delay}s` } as React.CSSProperties}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{cfg.label}</span>
        </div>
        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 100, fontFamily: "var(--font-mono)", background: result.mentioned ? `${cfg.color}18` : "rgba(255,255,255,0.04)", color: result.mentioned ? cfg.color : "var(--text-muted)", border: `1px solid ${result.mentioned ? `${cfg.color}30` : "var(--border)"}` }}>
          {result.rank ? `#${result.rank}` : "Not ranked"}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 6 }}>
          <span>SCORE</span><span style={{ color: cfg.color }}>{result.score}</span>
        </div>
        <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--bg-input)" }}>
          <div className="bar-animated" style={{ height: "100%", borderRadius: 3, background: cfg.color, width: `${result.score}%`, "--delay": `${delay + 0.2}s` } as React.CSSProperties} />
        </div>
      </div>

      {result.snippet ? (
        <p style={{ fontSize: 12, lineHeight: 1.6, padding: 12, borderRadius: 8, background: "var(--bg-input)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", borderLeft: `2px solid ${cfg.color}` }}>
          &ldquo;{result.snippet}&rdquo;
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{result.error ? `Error: ${result.error}` : "Product not mentioned"}</p>
      )}

      {result.allRecommendations.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 8 }}>FULL TOP 5</p>
          {result.allRecommendations.map((rec, i) => (
            <p key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{rec}</p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{result.latencyMs}ms</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{result.tokensUsed} tokens</span>
        {result.sentiment !== "undetected" && (
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: result.sentiment === "positive" ? "var(--grade-a)" : result.sentiment === "negative" ? "var(--grade-d)" : "var(--text-muted)" }}>
            {result.sentiment}
          </span>
        )}
      </div>
    </div>
  );
}

export function ReportCard({ report, onDownloadPdf }: { report: DiagnosticReport; onDownloadPdf: () => void }) {
  const gradeColor = GRADE_COLOR[report.grade] ?? "var(--text-muted)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card fade-up" style={{ "--delay": "0s" } as React.CSSProperties}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ fontSize: 52, fontWeight: 700, fontFamily: "var(--font-mono)", color: gradeColor, lineHeight: 1 }}>{report.grade}</div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 600 }}>{report.overallScore}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}>/100</span></p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Mentioned by {report.mentionedByCount}/3 AIs{report.avgRank ? ` · Avg rank #${report.avgRank}` : ""}</p>
              <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: 4 }}>&ldquo;{report.normalizedQuery}&rdquo;</p>
            </div>
          </div>
          <button onClick={onDownloadPdf} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>↓ PDF</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 24 }}>
          {(["gpt","claude","gemini"] as AiProvider[]).map((p) => {
            const r = report.providers[p]; const cfg = PROVIDER_CONFIG[p];
            return (
              <div key={p} style={{ borderRadius: 12, padding: 12, background: "var(--bg-input)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{cfg.label}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: r.mentioned ? cfg.color : "var(--text-muted)" }}>{r.rank ? `#${r.rank}` : "—"}</span>
                </div>
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border)" }}>
                  <div className="bar-animated" style={{ height: "100%", borderRadius: 2, background: cfg.color, width: `${r.score}%` } as React.CSSProperties} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {(["gpt","claude","gemini"] as AiProvider[]).map((p, i) => (
          <ProviderCard key={p} result={report.providers[p]} delay={0.1 + i * 0.08} />
        ))}
      </div>

      {report.recommendations.length > 0 && (
        <div className="card fade-up" style={{ "--delay": "0.35s" } as React.CSSProperties}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 16 }}>RECOMMENDATIONS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {report.recommendations.map((rec, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: 12, borderRadius: 12, background: "var(--bg-input)" }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: REC_COLOR[rec.type], flexShrink: 0, marginTop: 2 }}>{REC_ICON[rec.type]}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{rec.title}</p>
                  <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.6, color: "var(--text-secondary)" }}>{rec.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.competitorGaps.length > 0 && (
        <div className="card fade-up" style={{ "--delay": "0.45s" } as React.CSSProperties}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 16 }}>COMPETITOR GAPS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {report.competitorGaps.map((gap, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, background: "var(--bg-input)" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{gap.competitorName}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginLeft: 8 }}>best rank #{gap.theirBestRank}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["gpt","claude","gemini"] as AiProvider[]).map((p) => {
                    const appears = gap.appearsInProviders.includes(p);
                    return (
                      <span key={p} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontFamily: "var(--font-mono)", background: appears ? `${PROVIDER_CONFIG[p].color}18` : "transparent", color: appears ? PROVIDER_CONFIG[p].color : "var(--text-muted)", border: `1px solid ${appears ? `${PROVIDER_CONFIG[p].color}30` : "var(--border)"}` }}>
                        {PROVIDER_CONFIG[p].label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
