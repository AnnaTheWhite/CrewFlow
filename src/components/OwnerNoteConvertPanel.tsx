import { useEffect, useState } from "react";
import {
  convertOwnerNote,
  detectOwnerNoteEntities,
  getOwnerNoteConversions,
  getProjectContext,
} from "../services/ownerNotes.service";
import type {
  ConversionAction,
  ConversionTarget,
  DetectedEntities,
  OwnerNote,
  OwnerNoteConversion,
  ProjectContext,
} from "../types/ownerNote";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orange-500";

const TARGET_LABEL: Record<ConversionTarget, string> = {
  Task: "Task",
  Reminder: "Reminder",
  CommunicationLog: "Communication Log",
  ProjectInternalNote: "Project Internal Note",
};

// Decision Preview Engine + Multi-Action Conversion + Owner Approval
// Workflow (Phase 3, Features 3-9). Nothing here calls the create API until
// the owner clicks "Confirm & Create" — detection only ever produces
// suggestions to prefill, never an automatic action.
export default function OwnerNoteConvertPanel({
  note,
  onConverted,
  onClose,
}: {
  note: OwnerNote;
  onConverted: () => void;
  onClose: () => void;
}) {
  const [detected, setDetected] = useState<DetectedEntities | null>(null);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [history, setHistory] = useState<OwnerNoteConversion[]>([]);
  const [selected, setSelected] = useState<Set<ConversionTarget>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [taskTitle, setTaskTitle] = useState(note.title);
  const [taskDescription, setTaskDescription] = useState(note.content);
  const [taskDueDate, setTaskDueDate] = useState("");

  const [reminderTitle, setReminderTitle] = useState(note.title);
  const [reminderDueDate, setReminderDueDate] = useState("");

  const [commContent, setCommContent] = useState(note.content);
  const [commType, setCommType] = useState<"PhoneCall" | "Email" | "Meeting" | "Other">("PhoneCall");

  const [internalNoteContent, setInternalNoteContent] = useState(note.content);

  useEffect(() => {
    detectOwnerNoteEntities(`${note.title} ${note.content}`).then(setDetected).catch(() => setDetected(null));
    getOwnerNoteConversions(note.id).then(setHistory).catch(() => setHistory([]));
    if (note.projectId) {
      getProjectContext(note.projectId).then(setContext).catch(() => setContext(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  function toggle(target: ConversionTarget) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    setError("");

    try {
      const actions: ConversionAction[] = [];

      if (selected.has("Task")) {
        actions.push({
          type: "Task",
          title: taskTitle,
          description: taskDescription,
          projectId: note.projectId,
          employeeId: note.employeeId,
          priority: note.priority,
          dueDate: taskDueDate || null,
        });
      }

      if (selected.has("Reminder")) {
        actions.push({
          type: "Reminder",
          title: reminderTitle,
          dueDate: reminderDueDate || null,
          projectId: note.projectId,
          customerId: note.customerId,
          priority: note.priority,
        });
      }

      if (selected.has("CommunicationLog")) {
        actions.push({
          type: "CommunicationLog",
          communicationType: commType,
          content: commContent,
          customerId: note.customerId,
          projectId: note.projectId,
        });
      }

      if (selected.has("ProjectInternalNote") && note.projectId) {
        actions.push({
          type: "ProjectInternalNote",
          content: internalNoteContent,
          projectId: note.projectId,
        });
      }

      await convertOwnerNote(note.id, actions);
      onConverted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert note");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-white">Decision Preview</h5>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-white">
          Close
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          <p className="font-medium text-orange-400">Already converted</p>
          <ul className="mt-1 space-y-1">
            {history.map((c) => (
              <li key={c.id}>
                {TARGET_LABEL[c.targetType]} #{c.targetId} — {new Date(c.createdAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {detected && (
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
          <div>
            <span className="text-slate-500">Detected Customer: </span>
            {note.customer?.name ?? detected.customers[0]?.name ?? "—"}
          </div>
          <div>
            <span className="text-slate-500">Detected Project: </span>
            {note.project?.name ?? detected.projects[0]?.name ?? "—"}
          </div>
          <div>
            <span className="text-slate-500">Detected Employee: </span>
            {note.employee ? `${note.employee.firstName} ${note.employee.lastName}` : detected.employees[0]?.firstName ?? "—"}
          </div>
          <div>
            <span className="text-slate-500">Detected Intents: </span>
            {detected.intents.length > 0 ? detected.intents.join(", ") : "—"}
          </div>
        </div>
      )}

      {context && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          <p className="font-medium text-slate-200">Project context</p>
          <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3">
            <span>Customer: {context.customer?.name ?? "—"}</span>
            <span>Assigned: {context.assignedEmployees.map((e) => e.firstName).join(", ") || "—"}</span>
            <span>Total hours: {context.totalHours}</span>
            <span>Open tasks: {context.openTasks}</span>
            <span>Recent activity: {context.recentActivity.length}</span>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs font-medium text-orange-400">Suggested actions — pick any, edit, then confirm:</p>

      <div className="mt-2 space-y-3">
        <label className="flex items-start gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={selected.has("Task")} onChange={() => toggle("Task")} className="mt-1" />
          <div className="flex-1 space-y-2">
            <span>Create Task</span>
            {selected.has("Task") && (
              <div className="space-y-2">
                <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={inputClass} placeholder="Title" />
                <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className={inputClass} rows={2} placeholder="Description" />
                <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={selected.has("Reminder")} onChange={() => toggle("Reminder")} className="mt-1" />
          <div className="flex-1 space-y-2">
            <span>Create Reminder</span>
            {selected.has("Reminder") && (
              <div className="space-y-2">
                <input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} className={inputClass} placeholder="Title" />
                <input type="date" value={reminderDueDate} onChange={(e) => setReminderDueDate(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={selected.has("CommunicationLog")} onChange={() => toggle("CommunicationLog")} className="mt-1" />
          <div className="flex-1 space-y-2">
            <span>Create Communication Log</span>
            {selected.has("CommunicationLog") && (
              <div className="space-y-2">
                <select value={commType} onChange={(e) => setCommType(e.target.value as typeof commType)} className={inputClass}>
                  <option value="PhoneCall">Phone Call</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Other">Other</option>
                </select>
                <textarea value={commContent} onChange={(e) => setCommContent(e.target.value)} className={inputClass} rows={2} />
              </div>
            )}
          </div>
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={selected.has("ProjectInternalNote")}
            onChange={() => toggle("ProjectInternalNote")}
            disabled={!note.projectId}
            className="mt-1"
          />
          <div className="flex-1 space-y-2">
            <span>Create Project Internal Note {!note.projectId && "(requires linked project)"}</span>
            {selected.has("ProjectInternalNote") && (
              <textarea value={internalNoteContent} onChange={(e) => setInternalNoteContent(e.target.value)} className={inputClass} rows={2} />
            )}
          </div>
        </label>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0 || isSubmitting}
          className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Confirm & Create"}
        </button>
      </div>
    </div>
  );
}
