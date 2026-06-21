// Deterministic, keyword-based intent detection for the Owner Command
// Center "Decision Preview Engine" — no AI/ML, no automatic record
// creation. This only ever *suggests* which conversion actions might apply
// to a note; the owner reviews and explicitly confirms via POST
// /owner-notes/:id/convert.

export const INTENT_TYPES = [
  "Task",
  "CommunicationLog",
  "Reminder",
  "ScheduleSuggestion",
] as const;

export type IntentType = (typeof INTENT_TYPES)[number];

type IntentRule = { type: IntentType; keywords: string[] };

// A single note may match several rules — all of them are returned, since
// a note like "Kovács called. Need more cable. Peter should visit Friday."
// genuinely contains three separate intents.
const RULES: IntentRule[] = [
  {
    type: "Task",
    keywords: ["need", "order", "buy", "fix", "repair", "missing", "out of", "low on"],
  },
  {
    type: "CommunicationLog",
    keywords: ["called", "call from", "emailed", "e-mailed", "meeting with", "spoke with", "talked to"],
  },
  {
    type: "Reminder",
    keywords: ["remind", "next week", "follow up", "follow-up", "don't forget", "do not forget"],
  },
  {
    type: "ScheduleSuggestion",
    keywords: ["should go", "should visit", "send him", "send her", "on friday", "on monday", "on tuesday", "on wednesday", "on thursday", "on saturday", "on sunday", "should be there"],
  },
];

export function detectIntents(text: string): IntentType[] {
  const lower = text.toLowerCase();

  return RULES.filter((rule) => rule.keywords.some((keyword) => lower.includes(keyword))).map(
    (rule) => rule.type
  );
}
