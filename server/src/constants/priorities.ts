export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export type Priority = (typeof PRIORITIES)[number];

export function normalizePriority(value: unknown): Priority {
  return (PRIORITIES as readonly string[]).includes(value as string)
    ? (value as Priority)
    : "Medium";
}
