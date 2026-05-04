"use client";

import type { DiagnosticReport, AiProvider } from "@/types";

const PROVIDER_LABELS: Record<AiProvider, string> = {
  gpt: "GPT-4o", claude: "Claude", gemini: "Gemini",
};

export async function downloadPdf(report: DiagnosticReport): Promise<void> {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

  const styles = StyleSheet.create({
    page: { backgroundColor: "#ffffff", padding: 48, fontFamily: "Helvetica" },
    title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 4 },
    subtitle: { fontSize: 11, color: "#6b7280", marginBottom: 28 },
    sectionLabel: { fontSize: 9, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, fontFamily: "Helvetica-Bold" },
    grade: { fontSize: 48, fontFamily: "Helvetica-Bold", color: "#7c3aed" },
    scoreNumber: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#111827" },
    scoreMeta: { fontSize: 11, color: "#6b7280", marginTop: 2 },
    scoreRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
    providerGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
    providerCard: { flex: 1, backgroundColor: "#f9fafb", borderRadius: 8, padding: 12 },
    providerLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#374151", marginBottom: 4 },
    providerRank: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#7c3aed", marginBottom: 4 },
    providerScore: { fontSize: 11, color: "#6b7280", marginBottom: 6 },
    snippet: { fontSize: 9, color: "#6b7280", fontStyle: "italic" },
    recRow: { flexDirection: "row", gap: 8, backgroundColor: "#f9fafb", borderRadius: 6, padding: 10, marginBottom: 6 },
    recTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 2 },
    recDetail: { fontSize: 10, color: "#6b7280" },
    section: { marginBottom: 20 },
  });

  const REC_ICON: Record<string, string> = { gap: "↓", strength: "↑", action: "→" };

  const Doc = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>AEO Diagnostic Report</Text>
        <Text style={styles.subtitle}>{report.productName} · &quot;{report.normalizedQuery}&quot; · {new Date(report.createdAt).toLocaleDateString()}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Overall Score</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.grade}>{report.grade}</Text>
            <View>
              <Text style={styles.scoreNumber}>{report.overallScore} / 100</Text>
              <Text style={styles.scoreMeta}>Mentioned by {report.mentionedByCount}/3 AIs{report.avgRank ? ` · Avg rank #${report.avgRank}` : ""}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Results by AI</Text>
          <View style={styles.providerGrid}>
            {(["gpt","claude","gemini"] as AiProvider[]).map((p) => {
              const r = report.providers[p];
              return (
                <View key={p} style={styles.providerCard}>
                  <Text style={styles.providerLabel}>{PROVIDER_LABELS[p]}</Text>
                  <Text style={styles.providerRank}>{r.rank ? `#${r.rank}` : "Not ranked"}</Text>
                  <Text style={styles.providerScore}>Score: {r.score}/100 · {r.sentiment}</Text>
                  {r.snippet ? <Text style={styles.snippet}>&quot;{r.snippet}&quot;</Text> : null}
                </View>
              );
            })}
          </View>
        </View>

        {report.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recommendations</Text>
            {report.recommendations.map((rec, i) => (
              <View key={i} style={styles.recRow}>
                <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: "#7c3aed", width: 14 }}>{REC_ICON[rec.type]}</Text>
                <View>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recDetail}>{rec.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aeo-report-${report.productName.replace(/\s+/g, "-")}-${Date.now()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
