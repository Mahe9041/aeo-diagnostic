"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import type { HistoryRun } from "@/types";

export function HistoryChart({ runs }: { runs: HistoryRun[] }) {
  if (runs.length < 2) return null;

  const data = [...runs].reverse().map((r) => ({
    date: format(new Date(r.createdAt), "MMM d"),
    overall: r.overallScore,
    gpt: r.providers.gpt.score,
    claude: r.providers.claude.score,
    gemini: r.providers.gemini.score,
  }));

  return (
    <div className="card">
      <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 24 }}>SCORE TREND</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0,100]} tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12 }} labelStyle={{ color: "var(--text-secondary)" }} />
          <Line type="monotone" dataKey="overall" stroke="#f0f0f5" strokeWidth={2} dot={{ r: 3, fill: "#f0f0f5" }} name="Overall" />
          <Line type="monotone" dataKey="gpt" stroke="var(--gpt)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="GPT" />
          <Line type="monotone" dataKey="claude" stroke="var(--claude)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Claude" />
          <Line type="monotone" dataKey="gemini" stroke="var(--gemini)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Gemini" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
