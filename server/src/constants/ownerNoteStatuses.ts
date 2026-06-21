export const OWNER_NOTE_STATUSES = ["Inbox", "Reviewed", "ReadyToConvert", "Archived"] as const;

export type OwnerNoteStatus = (typeof OWNER_NOTE_STATUSES)[number];

export function normalizeOwnerNoteStatus(value: unknown): OwnerNoteStatus {
  return (OWNER_NOTE_STATUSES as readonly string[]).includes(value as string)
    ? (value as OwnerNoteStatus)
    : "Inbox";
}
