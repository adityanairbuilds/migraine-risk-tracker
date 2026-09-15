import AsyncStorage from "@react-native-async-storage/async-storage";

// keys for stuff we save on the phone with AsyncStorage
const LOCATION_KEY = "@mww_location";
const HIDDEN_TRIGGERS_KEY = "@mww_hidden_triggers";

export interface SavedLocation {
  name: string;
  lat: number;
  lon: number;
}

export async function getSavedLocation(): Promise<SavedLocation | null> {
  const raw = await AsyncStorage.getItem(LOCATION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveLocation(location: SavedLocation): Promise<void> {
  await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(location));
}

// trigger chips the user hid in settings
export async function getHiddenTriggers(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(HIDDEN_TRIGGERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveHiddenTriggers(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(HIDDEN_TRIGGERS_KEY, JSON.stringify(ids));
}

// wipes local storage, for the delete data button
export async function clearEverythingOnThisPhone(): Promise<void> {
  await AsyncStorage.removeItem(LOCATION_KEY);
  await AsyncStorage.removeItem(HIDDEN_TRIGGERS_KEY);
}
