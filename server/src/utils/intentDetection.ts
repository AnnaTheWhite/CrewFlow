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
    keywords: [
      "need",
      "order",
      "buy",
      "purchase",
      "fix",
      "repair",
      "install",
      "missing",
      "out of",
      "low on",
    ],
  },
  {
    type: "CommunicationLog",
    keywords: [
      "called",
      "phoned",
      "call from",
      "emailed",
      "e-mailed",
      "meeting",
      "meeting with",
      "spoke with",
      "talked to",
    ],
  },
  {
    type: "Reminder",
    keywords: [
      "remind",
      "next week",
      "tomorrow",
      "later",
      "follow up",
      "follow-up",
      "don't forget",
      "do not forget",
    ],
  },
  {
    type: "ScheduleSuggestion",
    keywords: [
      "should go",
      "should visit",
      "should be there",
      "on friday",
      "on monday",
      "on tuesday",
      "on wednesday",
      "on thursday",
      "on saturday",
      "on sunday",
      "assign",
      "schedule",
      "send him",
      "send her",
    ],
  },
];

// "send Peter", "send Anna" — a name-shaped fragment after "send" reads as
// a scheduling instruction even though the name itself isn't a fixed
// keyword. Kept as a narrow regex (capitalized word right after "send")
// rather than a bare "send" keyword, which would false-positive on
// "send the invoice" / "send an email".
const SEND_NAME_PATTERN = /\bsend\s+[A-ZÀ-ÖØ-öø-ÿ][\p{L}]*/u;

export function detectIntents(text: string): IntentType[] {
  const lower = text.toLowerCase();

  const matched = RULES.filter((rule) =>
    rule.keywords.some((keyword) => lower.includes(keyword))
  ).map((rule) => rule.type);

  if (!matched.includes("ScheduleSuggestion") && SEND_NAME_PATTERN.test(text)) {
    matched.push("ScheduleSuggestion");
  }

  return matched;
}
