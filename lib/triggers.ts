// trigger chips the user can tag each day. got the ideas from googling
// common migraine triggers, not an official medical list or anything

export interface Trigger {
  id: string;
  label: string;
  category: string;
}

export const TRIGGERS: Trigger[] = [
  // Diet
  { id: "dehydrated", label: "Dehydrated", category: "Diet" },
  { id: "skippedMeal", label: "Skipped a meal", category: "Diet" },
  { id: "alcohol", label: "Alcohol", category: "Diet" },
  { id: "caffeine", label: "Caffeine", category: "Diet" },
  { id: "chocolate", label: "Chocolate", category: "Diet" },
  { id: "certainFood", label: "Certain food (see notes)", category: "Diet" },

  // Sleep
  { id: "poorSleep", label: "Poor sleep", category: "Sleep" },
  { id: "overslept", label: "Overslept", category: "Sleep" },

  // Sensory / Environment
  { id: "brightLights", label: "Bright/flickering lights", category: "Sensory/Environment" },
  { id: "loudNoise", label: "Loud noise", category: "Sensory/Environment" },
  { id: "strongSmell", label: "Strong smell", category: "Sensory/Environment" },
  { id: "sunHeat", label: "Sun/heat exposure", category: "Sensory/Environment" },
  { id: "screenTime", label: "Screen time", category: "Sensory/Environment" },

  // Physical / Hormonal
  { id: "stress", label: "High stress", category: "Physical/Hormonal" },
  { id: "exercise", label: "Intense exercise", category: "Physical/Hormonal" },
  { id: "period", label: "Menstrual cycle", category: "Physical/Hormonal" },

  // Other
  { id: "medOveruse", label: "Medication overuse", category: "Other" },
  { id: "travel", label: "Travel/routine change", category: "Other" },
];

export const TRIGGER_CATEGORIES = [
  "Diet",
  "Sleep",
  "Sensory/Environment",
  "Physical/Hormonal",
  "Other",
];
