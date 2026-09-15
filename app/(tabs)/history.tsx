import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ensureSignedIn } from "../../lib/firebase";
import { getAllLogs, deleteLog, LogEntry } from "../../lib/logs";
import { TRIGGERS } from "../../lib/triggers";

export default function History() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    const userId = await ensureSignedIn();
    setUid(userId);
    const data = await getAllLogs(userId);
    setLogs(data);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  async function handleDelete(date: string) {
    if (!uid) return;
    await deleteLog(uid, date);
    setLogs((prev) => prev.filter((l) => l.date !== date));
  }

  async function handleExport() {
    if (logs.length === 0) {
      Alert.alert("No logs yet", "Log a few days before exporting.");
      return;
    }
    const triggerIds = TRIGGERS.map((t) => t.id);
    const header = ["date", "migraine", "pressureDelta", "humidity", "tempSwing", ...triggerIds, "notes"];
    const rows = logs.map((l) => {
      const triggerCols = triggerIds.map((id) => (l.triggers.includes(id) ? "1" : "0"));
      return [
        l.date,
        l.migraine ? "1" : "0",
        l.pressureDelta,
        l.humidity,
        l.tempSwing,
        ...triggerCols,
        `"${(l.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");

    try {
      const file = new File(Paths.cache, "migraine_logs.csv");
      file.create({ overwrite: true });
      file.write(csv);
      await Sharing.shareAsync(file.uri);
    } catch (e) {
      Alert.alert("Couldn't export", "Something went wrong creating the CSV file.");
    }
  }

  const migraineDays = logs.filter((l) => l.migraine);
  const nonMigraineDays = logs.filter((l) => !l.migraine);
  const hasEnoughForInsights = migraineDays.length >= 2 && nonMigraineDays.length >= 2;

  function avg(arr: LogEntry[], key: "pressureDelta" | "humidity" | "tempSwing") {
    return (arr.reduce((sum, l) => sum + l[key], 0) / arr.length).toFixed(1);
  }

  // triggers that show up more on migraine days vs not
  function topTriggers() {
    const scored = TRIGGERS.map((t) => {
      const onMigraineDays = migraineDays.filter((l) => l.triggers.includes(t.id)).length;
      const onNonMigraineDays = nonMigraineDays.filter((l) => l.triggers.includes(t.id)).length;
      const migraineRate = onMigraineDays / migraineDays.length;
      const nonMigraineRate = onNonMigraineDays / nonMigraineDays.length;
      return { label: t.label, diff: migraineRate - nonMigraineRate, onMigraineDays };
    });
    return scored
      .filter((s) => s.onMigraineDays > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>History ({logs.length} entries)</Text>

        <View style={styles.insightsCard}>
          {hasEnoughForInsights ? (
            <>
              <Text style={styles.insightsTitle}>
                Migraine days ({migraineDays.length}) vs non-migraine days ({nonMigraineDays.length})
              </Text>
              <Text style={styles.insightsLine}>
                Avg pressure drop: {avg(migraineDays, "pressureDelta")} hPa vs{" "}
                {avg(nonMigraineDays, "pressureDelta")} hPa
              </Text>
              <Text style={styles.insightsLine}>
                Avg humidity: {avg(migraineDays, "humidity")}% vs {avg(nonMigraineDays, "humidity")}%
              </Text>
              <Text style={styles.insightsLine}>
                Avg temp swing: {avg(migraineDays, "tempSwing")}°C vs{" "}
                {avg(nonMigraineDays, "tempSwing")}°C
              </Text>
              {topTriggers().length > 0 && (
                <>
                  <Text style={[styles.insightsTitle, { marginTop: 10 }]}>
                    Most linked to migraine days
                  </Text>
                  {topTriggers().map((t) => (
                    <Text key={t.label} style={styles.insightsLine}>
                      {t.label} - on {t.onMigraineDays} of your migraine days
                    </Text>
                  ))}
                </>
              )}
            </>
          ) : (
            <Text style={styles.insightsLine}>
              Log at least 2 migraine days and 2 non-migraine days to see personal insights
              (currently {migraineDays.length} / {nonMigraineDays.length}).
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportButtonText}>Share CSV (for the V2 model)</Text>
        </TouchableOpacity>

        {logs.map((l) => (
          <View key={l.date} style={styles.logRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.logDate}>{l.date}</Text>
              <Text style={l.migraine ? styles.logYes : styles.logNo}>
                {l.migraine ? "Migraine" : "No migraine"}
              </Text>
              <Text style={styles.logDetails}>
                Δ{l.pressureDelta}hPa · {l.humidity}% humidity · {l.tempSwing}°C swing
              </Text>
              {l.triggers.length > 0 && (
                <Text style={styles.logTriggers}>{l.triggers.join(", ")}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDelete(l.date)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f5f2" },
  content: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 16 },
  insightsCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 },
  insightsTitle: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 6 },
  insightsLine: { fontSize: 13, color: "#666", marginBottom: 3 },
  exportButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#5b6ba8",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  exportButtonText: { color: "#5b6ba8", fontWeight: "600" },
  logRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  logDate: { fontSize: 14, fontWeight: "700", color: "#333" },
  logYes: { fontSize: 13, color: "#b3413e", fontWeight: "600" },
  logNo: { fontSize: 13, color: "#888" },
  logDetails: { fontSize: 12, color: "#888", marginTop: 2 },
  logTriggers: { fontSize: 12, color: "#5b6ba8", marginTop: 2 },
  deleteText: { color: "#b3413e", fontSize: 13 },
});
