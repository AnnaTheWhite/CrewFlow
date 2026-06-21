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

// Kept broad (not just the actionable target) so history rows created
// before Phase 3.2 still render a readable label.
const TARGET_LABEL: Record<ConversionTarget, string> = {
  Task: "Task",
  Reminder: "Reminder",
  CommunicationLog: "Communication Log",
  ProjectInternalNote: "Project Internal Note",
};

// Decision Preview Engine + Owner Approval Workflow. Nothing here calls the
// create API until the owner clicks "Confirm & Create" — detection only
// ever produces suggestions to prefill, never an automatic action.
//
// Phase 3.2 product review: Task, Reminder, and Project Internal Note were
// removed from this panel (and disabled server-side) because converting a
// note into one of them left no way to ever see the result again — no
// list, no project/customer tab. Communication Log is the only target kept
// active, since it now has a real retrieval surface (Customer Details →
// "View communication history").
export default function OwnerNoteConvertPanel({
  note,
  onConverted,
  onClose,
}: {
  note: OwnerNote;
  onConverted: (created: { type: ConversionTarget; id: number }[]) => void;
  onClose: () => void;
}) {
  const [detected, setDetected] = useState<DetectedEntities | null>(null);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [history, setHistory] = useState<OwnerNoteConversion[]>([]);
  const [includeCommLog, setIncludeCommLog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [commContent, setCommContent] = useState(note.content);
  const [commType, setCommType] = useState<"PhoneCall" | "Email" | "Meeting" | "Other">("PhoneCall");

  useEffect(() => {
    detectOwnerNoteEntities(`${note.title} ${note.content}`).then(setDetected).catch(() => setDetected(null));
    getOwnerNoteConversions(note.id).then(setHistory).catch(() => setHistory([]));
    if (note.projectId) {
      getProjectContext(note.projectId).then(setContext).catch(() => setContext(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  async function handleConfirm() {
    if (!includeCommLog) return;
    setIsSubmitting(true);
    setError("");

    try {
      const actions: ConversionAction[] = [
        {
          type: "CommunicationLog",
          communicationType: commType,
          content: commContent,
          customerId: note.customerId,
          projectId: note.projectId,
        },
      ];

      const result = await convertOwnerNote(note.id, actions);
      onConverted(result.conversions as { type: ConversionTarget; id: number }[]);
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
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {(() => {
            const customerName = note.customer?.name ?? detected.customers[0]?.name;
            const projectName = note.project?.name ?? detected.projects[0]?.name;
            const employeeName = note.employee
              ? `${note.employee.firstName} ${note.employee.lastName}`
              : detected.employees[0]
                ? `${detected.employees[0].firstName} ${detected.employees[0].lastName}`
                : undefined;
            const hasIntents = detected.intents.length > 0;

            return (
              <>
                <div>
                  <span className="text-slate-500">Detected Customer: </span>
                  <span className={customerName ? "text-slate-300" : "italic text-slate-500"}>
                    {customerName ?? "Not identified"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Detected Project: </span>
                  <span className={projectName ? "text-slate-300" : "italic text-slate-500"}>
                    {projectName ?? "Not identified"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Detected Employee: </span>
                  <span className={employeeName ? "text-slate-300" : "italic text-slate-500"}>
                    {employeeName ?? "Not identified"}
                  </span>
                </div>
                <div>
                  {/* Schedule Suggestion (if present) shows up inside this
                      list as plain text — informational only, it never
                      creates a record. */}
                  <span className="text-slate-500">Detected Intents: </span>
                  <span className={hasIntents ? "text-slate-300" : "italic text-slate-500"}>
                    {hasIntents ? detected.intents.join(", ") : "No strong match"}
                  </span>
                </div>
                {!customerName && !projectName && !employeeName && !hasIntents && (
                  <p className="col-span-full text-orange-400">Detection uncertain — review and fill in manually below.</p>
                )}
              </>
            );
          })()}
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

      <p className="mt-4 text-xs font-medium text-orange-400">Suggested action — review, edit, then confirm:</p>

      <div className="mt-2">
        <label className="flex items-start gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={includeCommLog}
            onChange={() => setIncludeCommLog((v) => !v)}
            className="mt-1"
          />
          <div className="flex-1 space-y-2">
            <span>Create Communication Log</span>
            {includeCommLog && (
              <div className="space-y-2">
                <select value={commType} onChange={(e) => setCommType(e.target.value as typeof commType)} className={inputClass}>
                  <option value="PhoneCall">Phone Call</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Other">Other</option>
                </select>
                <textarea value={commContent} onChange={(e) => setCommContent(e.target.value)} className={inputClass} rows={2} />
                {note.customer ? (
                  <p className="text-xs text-slate-500">
                    Will appear under {note.customer.name} → communication history.
                  </p>
                ) : (
                  <p className="text-xs text-orange-400">
                    No customer linked — link this note to a customer to find it again later.
                  </p>
                )}
              </div>
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
          disabled={!includeCommLog || isSubmitting}
          className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Confirm & Create"}
        </button>
      </div>
    </div>
  );
}
