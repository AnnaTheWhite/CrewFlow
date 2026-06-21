export const OWNER_NOTE_STATUSES = ["Inbox", "Reviewed", "ReadyToConvert", "Archived"] as const;

export type OwnerNoteStatus = (typeof OWNER_NOTE_STATUSES)[number];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const INTENT_TYPES = ["Task", "CommunicationLog", "Reminder", "ScheduleSuggestion"] as const;

export type IntentType = (typeof INTENT_TYPES)[number];

export const COMMUNICATION_TYPES = ["PhoneCall", "Email", "Meeting", "Other"] as const;

export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export const CONVERSION_TARGETS = ["Task", "Reminder", "CommunicationLog", "ProjectInternalNote"] as const;

export type ConversionTarget = (typeof CONVERSION_TARGETS)[number];

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

export type ConversionAction =
  | {
      type: "Task";
      title: string;
      description?: string;
      projectId?: number | null;
      employeeId?: number | null;
      priority?: Priority;
      dueDate?: string | null;
    }
  | {
      type: "Reminder";
      title: string;
      dueDate?: string | null;
      projectId?: number | null;
      customerId?: number | null;
      priority?: Priority;
    }
  | {
      type: "CommunicationLog";
      communicationType?: CommunicationType;
      content: string;
      customerId?: number | null;
      projectId?: number | null;
    }
  | {
      type: "ProjectInternalNote";
      content: string;
      projectId: number;
    };
