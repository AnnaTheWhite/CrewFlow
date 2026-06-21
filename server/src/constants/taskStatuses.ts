export const TASK_STATUSES = ["Open", "InProgress", "Done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export function normalizeTaskStatus(value: unknown): TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value as string)
    ? (value as TaskStatus)
    : "Open";
}
