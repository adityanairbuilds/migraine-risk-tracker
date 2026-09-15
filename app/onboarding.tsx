import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { geocodeCity } from "../lib/weather";
import { saveLocation } from "../lib/user";

export default function Onboarding() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    const result = await geocodeCity(query.trim());
    setLoading(false);
    if (!result) {
      setError("Couldn't find that place. Try something like \"Baltimore, MD\".");
      return;
    }
    await saveLocation(result);
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Migraine Risk Tracker</Text>
        <Text style={styles.subtitle}>
          This app looks at weather changes that are commonly linked to
          migraines, and lets you log your own triggers to find your
          personal patterns over time. It is not a medical device - see
          the About tab for more.
        </Text>

        <Text style={styles.label}>Where do you live?</Text>
        <TextInput
          style={styles.input}
          placeholder="City, State"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="words"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f5f2" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#333", marginBottom: 12 },
  subtitle: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  error: { color: "#b3413e", marginTop: 8, fontSize: 13 },
  button: {
    backgroundColor: "#5b6ba8",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
