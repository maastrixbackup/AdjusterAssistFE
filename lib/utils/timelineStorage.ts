import AsyncStorage from "@react-native-async-storage/async-storage";

export type TimelineEntry = {
  id: string;
  timestamp: string;
  inputType: "text" | "voice" | "ocr";
  inputContent: string;
  aiResponse?: string;
  nextStepSuggestion?: string;
  metadata?: {
    wordCount?: number;
    duration?: number; // for voice
    imageName?: string; // for OCR
    confidence?: number; // for OCR
    source?: string;
    processingDateTime?: string;
  };
};

const TIMELINE_KEY = "claim_workspace_timeline";
const MAX_TIMELINE_ENTRIES = 100;

export async function addTimelineEntry(
  entry: Omit<TimelineEntry, "id" | "timestamp">,
): Promise<TimelineEntry> {
  const id = Date.now().toString();
  const timestamp = new Date().toISOString();

  const fullEntry: TimelineEntry = {
    ...entry,
    id,
    timestamp,
  };

  const existingTimeline = await getTimeline();
  const updatedTimeline = [fullEntry, ...existingTimeline].slice(
    0,
    MAX_TIMELINE_ENTRIES,
  );

  await AsyncStorage.setItem(TIMELINE_KEY, JSON.stringify(updatedTimeline));

  return fullEntry;
}

export async function getTimeline(): Promise<TimelineEntry[]> {
  const timeline = await AsyncStorage.getItem(TIMELINE_KEY);
  return timeline ? JSON.parse(timeline) : [];
}

export async function clearTimeline(): Promise<void> {
  await AsyncStorage.removeItem(TIMELINE_KEY);
}

export async function deleteTimelineEntry(entryId: string): Promise<void> {
  const timeline = await getTimeline();
  const filtered = timeline.filter((entry) => entry.id !== entryId);
  await AsyncStorage.setItem(TIMELINE_KEY, JSON.stringify(filtered));
}

export async function updateTimelineEntry(
  entryId: string,
  updates: Partial<Omit<TimelineEntry, "id" | "timestamp">>,
): Promise<void> {
  const timeline = await getTimeline();
  const updated = timeline.map((entry) =>
    entry.id === entryId ? { ...entry, ...updates } : entry,
  );
  await AsyncStorage.setItem(TIMELINE_KEY, JSON.stringify(updated));
}
