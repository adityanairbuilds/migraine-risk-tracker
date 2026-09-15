import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface LogEntry {
  date: string; // YYYY-MM-DD
  migraine: boolean;
  pressureDelta: number;
  humidity: number;
  tempSwing: number;
  triggers: string[];
  notes: string;
}

function logsCollection(uid: string) {
  return collection(db, "users", uid, "logs");
}

export async function saveLog(uid: string, entry: LogEntry): Promise<void> {
  await setDoc(doc(logsCollection(uid), entry.date), entry);
}

export async function getAllLogs(uid: string): Promise<LogEntry[]> {
  const snap = await getDocs(logsCollection(uid));
  const logs = snap.docs.map((d) => d.data() as LogEntry);
  logs.sort((a, b) => b.date.localeCompare(a.date));
  return logs;
}

export async function deleteLog(uid: string, date: string): Promise<void> {
  await deleteDoc(doc(logsCollection(uid), date));
}

// deletes every log, for the delete data button
export async function deleteAllLogs(uid: string): Promise<void> {
  const snap = await getDocs(logsCollection(uid));
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}
