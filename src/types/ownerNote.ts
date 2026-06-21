export const OWNER_NOTE_STATUSES = ["Inbox", "Reviewed", "ReadyToConvert", "Archived"] as const;

export type OwnerNoteStatus = (typeof OWNER_NOTE_STATUSES)[number];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const INTENT_TYPES = ["Task", "CommunicationLog", "Reminder", "ScheduleSuggestion"] as const;

export type IntentType = (typeof INTENT_TYPES)[number];

export const COMMUNICATION_TYPES = ["PhoneCall", "Email", "Meeting", "Other"] as const;

export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

// Kept broad so historical OwnerNoteConversion rows created before Phase
// 3.2 (Task/Reminder/ProjectInternalNote) still render a label correctly.
export const CONVERSION_TARGETS = ["Task", "Reminder", "CommunicationLog", "ProjectInternalNote"] as const;

export type ConversionTarget = (typeof CONVERSION_TARGETS)[number];

// Phase 3.2 — the only target the Convert panel can actually create today.
// Task/Reminder/ProjectInternalNote were removed from the UI (and the
// backend) because converting a note into one left no way to ever find it
// again. Re-add a target here only once it has a real retrieval surface.
export const ACTIONABLE_CONVERSION_TARGETS = ["CommunicationLog"] as const;

export type OwnerNoteConversion = {
  id: number;
  targetType: ConversionTarget;
  targetId: number;
  createdAt: string;
};

export type OwnerNote = {
  id: number;
  title: string;
  content: string;
  status: OwnerNoteStatus;
  priority: Priority;
  pinned: boolean;
  companyId: number;
  userId: number;
  projectId: number | null;
  customerId: number | null;
  employeeId: number | null;
  project?: { id: number; name: string } | null;
  customer?: { id: number; name: string } | null;
  employee?: { id: number; firstName: string; lastName: string } | null;
  conversions?: OwnerNoteConversion[];
  createdAt: string;
  updatedAt: string;
};

export type DetectedEntities = {
  customers: { id: number; name: string }[];
  projects: { id: number; name: string }[];
  employees: { id: number; firstName: string; lastName: string }[];
  intents: IntentType[];
};

export type OwnerNoteDashboard = {
  total: number;
  inbox: number;
  reviewed: number;
  readyToConvert: number;
  archived: number;
  urgent: number;
  pinned: number;
};

export type ProjectContext = {
  project: { id: number; name: string; status: string };
  customer: { id: number; name: string } | null;
  assignedEmployees: { id: number; firstName: string; lastName: string }[];
  totalHours: number;
  openTasks: number;
  recentActivity: { id: number; type: string; metadata: string | null; createdAt: string }[];
};

export type ConversionAction = {
  type: "CommunicationLog";
  communicationType?: CommunicationType;
  content: string;
  customerId?: number | null;
  projectId?: number | null;
};

export type CommunicationLogEntry = {
  id: number;
  type: CommunicationType;
  content: string;
  occurredAt: string;
  projectId: number | null;
};
