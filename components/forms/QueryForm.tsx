"use client";

import { useState } from "react";
import type { DiagnoseRequest } from "@/types";

const EXAMPLES = [
  { product: "MagRelax Pro", query: "best magnesium supplement for seniors", competitors: ["Nature Made", "Doctor's Best"] },
  { product: "CloudStep Runner", query: "most comfortable running shoes for flat feet", competitors: ["Brooks", "ASICS"] },
  { product: "LumiGlow Serum", query: "best vitamin C serum for sensitive skin", competitors: ["The Ordinary", "CeraVe"] },
];

interface Props {
  onSubmit: (request: DiagnoseRequest) => void;
  isLoading: boolean;
}

export function QueryForm({ onSubmit, isLoading }: Props) {
  const [productName, setProductName] = useState("");
  const [query, setQuery] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);

  const addCompetitor = () => {
    const trimmed = competitorInput.trim();
    if (trimmed && !competitors.includes(trimmed) && competitors.length < 10) {
      setCompetitors((prev) => [...prev, trimmed]);
      setCompetitorInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !query.trim()) return;
    onSubmit({ productName: productName.trim(), query: query.trim(), competitors });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.06em" }}>QUICK EXAMPLES</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex) => (
            <button key={ex.product} type="button"
              onClick={() => { setProductName(ex.product); setQuery(ex.query); setCompetitors(ex.competitors); }}
              style={{ fontSize: 12, padding: "6px 12px", borderRadius: 100, border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
              {ex.product}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.06em" }}>YOUR PRODUCT</label>
          <input className="input" placeholder="MagRelax Pro" value={productName} onChange={(e) => setProductName(e.target.value)} required />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.06em" }}>SHOPPER QUERY</label>
          <input className="input" placeholder="best magnesium supplement for seniors" value={query} onChange={(e) => setQuery(e.target.value)} required minLength={5} />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.06em" }}>COMPETITORS (OPTIONAL)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" placeholder="Add competitor..." value={competitorInput}
            onChange={(e) => setCompetitorInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }} />
          <button type="button" onClick={addCompetitor}
            style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent", cursor: "pointer", whiteSpace: "nowrap" }}>
            Add
          </button>
        </div>
        {competitors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {competitors.map((c) => (
              <span key={c} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 12px", borderRadius: 100, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                {c}
                <button type="button" onClick={() => setCompetitors((prev) => prev.filter((x) => x !== c))}
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="btn-primary" disabled={!productName.trim() || query.trim().length < 5 || isLoading}>
        {isLoading ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span className="pulse-dot" style={{ background: "white" }} />
            Running diagnostic...
          </span>
        ) : "Run AEO Diagnostic →"}
      </button>
    </form>
  );
}
