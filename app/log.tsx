import { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { TRIGGERS, TRIGGER_CATEGORIES } from "../lib/triggers";
import { getSavedLocation, getHiddenTriggers } from "../lib/user";
import { fetchTodaysActualFeatures, fetchHistoricalFeatures } from "../lib/weather";
import { ensureSignedIn } from "../lib/firebase";
import { saveLog } from "../lib/logs";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function LogScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [migraine, setMigraine] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHiddenTriggers().then(setHidden);
  }, []);

  function toggleTrigger(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (migraine === null) {
      Alert.alert("Pick Yes or No", "Let us know if you had a migraine on this day.");
      return;
    }
    setSaving(true);
    try {
      const location = await getSavedLocation();
      if (!location) throw new Error("no location set");
      const uid = await ensureSignedIn();
      const features =
        date === todayStr()
          ? await fetchTodaysActualFeatures(location.lat, location.lon)
          : await fetchHistoricalFeatures(location.lat, location.lon, date);

      await saveLog(uid, {
        date,
        migraine,
        pressureDelta: features.pressureDelta,
        humidity: features.humidity,
        tempSwing: features.tempSwing,
        triggers: selected,
        notes,
      });
      router.back();
    } catch (e) {
      Alert.alert(
        "Couldn't save",
        "Something went wrong saving your log. Check your connection and try again."
      );
    }
    setSaving(false);
  }

  const visibleTriggers = TRIGGERS.filter((t) => !hidden.includes(t.id));

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Date</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={styles.dateInput}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />
        <TouchableOpacity onPress={() => setDate(todayStr())}>
          <Text style={styles.todayLink}>Today</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Did you have a migraine on this day?</Text>
      <View style={styles.yesNoRow}>
        <TouchableOpacity
          style={[styles.yesNoButton, migraine === true && styles.yesNoButtonSelected]}
          onPress={() => setMigraine(true)}
        >
          <Text style={[styles.yesNoText, migraine === true && styles.yesNoTextSelected]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoButton, migraine === false && styles.yesNoButtonSelected]}
          onPress={() => setMigraine(false)}
        >
          <Text style={[styles.yesNoText, migraine === false && styles.yesNoTextSelected]}>
            No
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Anything else going on? (optional)</Text>
      {TRIGGER_CATEGORIES.map((category) => (
        <View key={category} style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>{category}</Text>
          <View style={styles.chipWrap}>
            {visibleTriggers
              .filter((t) => t.category === category)
              .map((t) => {
                const isSelected = selected.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleTrigger(t.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      ))}

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything specific, like what you ate"
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Log</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f5f2" },
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 20, marginBottom: 8 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  todayLink: { color: "#5b6ba8", fontWeight: "600" },
  yesNoRow: { flexDirection: "row", gap: 12 },
  yesNoButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  yesNoButtonSelected: { backgroundColor: "#5b6ba8", borderColor: "#5b6ba8" },
  yesNoText: { fontSize: 16, fontWeight: "600", color: "#333" },
  yesNoTextSelected: { color: "#fff" },
  categoryBlock: { marginBottom: 12 },
  categoryLabel: { fontSize: 12, color: "#888", marginBottom: 6, textTransform: "uppercase" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: "#5b6ba8", borderColor: "#5b6ba8" },
  chipText: { fontSize: 13, color: "#333" },
  chipTextSelected: { color: "#fff" },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    minHeight: 70,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#5b6ba8",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
