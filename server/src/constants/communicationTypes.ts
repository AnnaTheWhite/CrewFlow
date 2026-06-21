export const COMMUNICATION_TYPES = ["PhoneCall", "Email", "Meeting", "Other"] as const;

export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export function normalizeCommunicationType(value: unknown): CommunicationType {
  return (COMMUNICATION_TYPES as readonly string[]).includes(value as string)
    ? (value as CommunicationType)
    : "Other";
}
