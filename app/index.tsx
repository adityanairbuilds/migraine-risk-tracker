import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { getSavedLocation } from "../lib/user";

// just redirects to onboarding or the tabs depending on if location is set
export default function Index() {
  const [checked, setChecked] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    getSavedLocation().then((loc) => {
      setHasLocation(loc !== null);
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return hasLocation ? <Redirect href="/(tabs)" /> : <Redirect href="/onboarding" />;
}
