import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { getSavedLocation, SavedLocation } from "../../lib/user";
import {
  fetchNext24hForecastFeatures,
  fetchHourly,
  scoreRisk,
  closestIndex,
  RiskResult,
} from "../../lib/weather";

const RISK_COLORS = {
  Low: "#4a8f5c",
  Medium: "#c98a2b",
  High: "#b3413e",
};

export default function Today() {
  const router = useRouter();
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [bars, setBars] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadEverything() {
    setLoading(true);
    setErrorMsg("");
    const loc = await getSavedLocation();
    setLocation(loc);
    if (!loc) {
      setLoading(false);
      return;
    }
    try {
      const [riskResult, hourly] = await Promise.all([
        fetchNext24hForecastFeatures(loc.lat, loc.lon).then(scoreRisk),
        fetchHourly(loc.lat, loc.lon),
      ]);
      setRisk(riskResult);

      // pressure from 24h ago to 24h ahead, every 2 hrs
      const nowIdx = closestIndex(hourly.time, new Date());
      const start = Math.max(0, nowIdx - 24);
      const end = Math.min(hourly.pressure.length - 1, nowIdx + 24);
      const points: number[] = [];
      for (let i = start; i <= end; i += 2) {
        points.push(hourly.pressure[i]);
      }
      setBars(points);
    } catch (e) {
      setErrorMsg("Couldn't load weather data. Check your connection.");
    }
    setLoading(false);
  }

  // reload when tab comes into focus in case location changed
  useFocusEffect(
    useCallback(() => {
      loadEverything();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadEverything} />}
      >
        <Text style={styles.heading}>{location?.name}</Text>

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        {risk && (
          <View
            style={[
              styles.riskCard,
              risk.level !== "Low" && { backgroundColor: RISK_COLORS[risk.level] },
            ]}
          >
            <Text
              style={[
                styles.riskLevel,
                risk.level === "Low" && { color: RISK_COLORS.Low },
              ]}
            >
              {risk.level} risk in next 24 hours
            </Text>
            <Text
              style={[
                styles.riskScore,
                risk.level === "Low" && { color: "#666" },
              ]}
            >
              score {risk.score} / 7
            </Text>
            {risk.factors.map((f, i) => (
              <Text
                key={i}
                style={[styles.factor, risk.level === "Low" && { color: "#666" }]}
              >
                • {f}
              </Text>
            ))}
          </View>
        )}

        {bars.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Pressure (past 24h → next 24h)</Text>
            <PressureBars values={bars} />
          </View>
        )}

        <TouchableOpacity style={styles.logButton} onPress={() => router.push("/log")}>
          <Text style={styles.logButtonText}>Log Today</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// homemade bar chart, just divs with different heights basically
function PressureBars({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={styles.barsRow}>
      {values.map((v, i) => {
        const heightPct = ((v - min) / range) * 60 + 10; // between 10 and 70
        return <View key={i} style={[styles.bar, { height: heightPct }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f5f2" },
  content: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 16 },
  error: { color: "#b3413e", marginBottom: 16 },
  riskCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  riskLevel: { fontSize: 18, fontWeight: "700", color: "#fff" },
  riskScore: { fontSize: 13, color: "#fff", marginTop: 2, marginBottom: 10 },
  factor: { fontSize: 13, color: "#fff", marginBottom: 2 },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: { fontSize: 13, color: "#666", marginBottom: 10 },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 80,
    gap: 3,
  },
  bar: {
    flex: 1,
    backgroundColor: "#5b6ba8",
    borderRadius: 2,
  },
  logButton: {
    backgroundColor: "#5b6ba8",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  logButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
