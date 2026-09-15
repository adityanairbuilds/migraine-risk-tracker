import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { geocodeCity } from "../../lib/weather";
import {
  getSavedLocation,
  saveLocation,
  getHiddenTriggers,
  saveHiddenTriggers,
  clearEverythingOnThisPhone,
  SavedLocation,
} from "../../lib/user";
import { TRIGGERS } from "../../lib/triggers";
import { ensureSignedIn, deleteMyAccount } from "../../lib/firebase";
import { deleteAllLogs } from "../../lib/logs";

export default function Settings() {
  const router = useRouter();
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSavedLocation().then(setLocation);
      getHiddenTriggers().then(setHidden);
    }, [])
  );

  async function handleChangeLocation() {
    if (!query.trim()) return;
    setSaving(true);
    setError("");
    const result = await geocodeCity(query.trim());
    setSaving(false);
    if (!result) {
      setError("Couldn't find that place.");
      return;
    }
    await saveLocation(result);
    setLocation(result);
    setQuery("");
  }

  async function toggleHidden(id: string) {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHidden(next);
    await saveHiddenTriggers(next);
  }

  function handleDeleteEverything() {
    Alert.alert(
      "Delete all my data?",
      "This deletes every log you've entered, your saved location, and forgets this phone completely. There is no undo.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete everything", style: "destructive", onPress: reallyDeleteEverything },
      ]
    );
  }

  async function reallyDeleteEverything() {
    setDeleting(true);
    try {
      const uid = await ensureSignedIn();
      await deleteAllLogs(uid);
      await clearEverythingOnThisPhone();
      await deleteMyAccount();
    } catch (e) {
      setDeleting(false);
      Alert.alert("Something went wrong", "Couldn't delete everything, try again.");
      return;
    }
    router.replace("/onboarding");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.currentLocation}>Current: {location?.name ?? "not set"}</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="New city, State"
            value={query}
            onChangeText={setQuery}
          />
          <TouchableOpacity style={styles.smallButton} onPress={handleChangeLocation} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.smallButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Hide trigger chips that don't apply to you</Text>
        {TRIGGERS.map((t) => {
          const isHidden = hidden.includes(t.id);
          return (
            <TouchableOpacity key={t.id} style={styles.triggerRow} onPress={() => toggleHidden(t.id)}>
              <Text style={styles.triggerLabel}>{t.label}</Text>
              <Text style={isHidden ? styles.hiddenText : styles.shownText}>
                {isHidden ? "Hidden" : "Shown"}
              </Text>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.disclaimer}>
          This app is not a medical device and does not diagnose migraines. It highlights
          weather patterns (barometric pressure drops, humidity, temperature swings) that
          research has linked to migraines for some people, and lets you track your own
          possible triggers to find your personal pattern. Always follow guidance from a
          healthcare provider for migraine management.
        </Text>

        <Text style={styles.sectionTitle}>Danger zone</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteEverything}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#b3413e" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete All My Data</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f5f2" },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#333", marginTop: 24, marginBottom: 8 },
  currentLocation: { fontSize: 14, color: "#666", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  smallButton: {
    backgroundColor: "#5b6ba8",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  smallButtonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#b3413e", marginTop: 6, fontSize: 13 },
  triggerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  triggerLabel: { fontSize: 14, color: "#333" },
  hiddenText: { fontSize: 13, color: "#b3413e" },
  shownText: { fontSize: 13, color: "#4a8f5c" },
  disclaimer: { fontSize: 13, color: "#666", lineHeight: 19 },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#b3413e",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  deleteButtonText: { color: "#b3413e", fontWeight: "600" },
});
