import { useEffect, useState } from "react";

import { createShift, updateShift } from "../../services/shift.service";
import { getEmployees } from "../../services/employee.service";
import { getProjects } from "../../services/project.service";

import { useToast } from "../../hooks/useToast";
import Toast from "../ui/Toast";
import DatePicker from "../ui/DatePicker";
import TimePicker from "../ui/TimePicker";

import type { Employee } from "../../types/employee";
import type { Project } from "../../types/project";
import type { Shift } from "../../types/shifts";

type ShiftFormProps = {
  shift?: Shift | null;
  onSuccess: () => void;
};

// "8h 30m" from two "HH:mm" strings on the same day. Returns null when
// either side is incomplete or the end isn't after the start, so the
// caller can show a validation message instead of a nonsense duration.
function formatDuration(startTime: string, endTime: string): string | null {
  if (!startTime || !endTime) return null;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const minutes = endH * 60 + endM - (startH * 60 + startM);
  if (minutes <= 0) return null;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default function ShiftForm({ shift = null, onSuccess }: ShiftFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  const { show, message, triggerToast } = useToast();

  const duration = formatDuration(startTime, endTime);
  const hasTimeRangeError = Boolean(startTime && endTime && !duration);

  useEffect(() => {
    if (shift) {
      setEmployeeId(String(shift.employeeId));
      setProjectId(shift.projectId ? String(shift.projectId) : "");
      setDate(shift.start.slice(0, 10));
      setStartTime(shift.start.slice(11, 16));
      setEndTime(shift.end.slice(11, 16));
      setNotes(shift.notes ?? "");
    } else {
      setEmployeeId("");
      setProjectId("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setNotes("");
    }
  }, [shift]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [employeesData, projectsData] = await Promise.all([
          getEmployees(),
          getProjects(),
        ]);
        setEmployees(employeesData);
        setProjects(projectsData);
      } catch (error) {
        console.error("Failed to load form data:", error);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!employeeId) {
      triggerToast("Please select an employee");
      return;
    }

    if (hasTimeRangeError) {
      triggerToast("End time must be after start time");
      return;
    }

    const data = {
      employeeId: Number(employeeId),
      projectId: projectId ? Number(projectId) : null,
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      notes,
    };

    try {
      if (shift) {
        await updateShift(shift.id, data);
      } else {
        await createShift(data);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      triggerToast(shift ? "Failed to update shift" : "Failed to create shift");
    }
  };

  const selectClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500";

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-slate-400">Employee</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className={selectClass}
            required
          >
            <option value="">Select Employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={selectClass}
          >
            <option value="">Select Project (optional)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Date</label>
          <DatePicker
            value={date}
            onChange={setDate}
            placeholder="Select date"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Start Time</label>
            <TimePicker
              value={startTime}
              onChange={setStartTime}
              placeholder="Select start time"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">End Time</label>
            <TimePicker
              value={endTime}
              onChange={setEndTime}
              placeholder="Select end time"
              required
            />
          </div>
        </div>

        {startTime && endTime && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm text-slate-400">
              {startTime} → {endTime}
            </p>
            {duration ? (
              <p className="mt-1 text-lg font-semibold text-white">
                Duration: {duration}
              </p>
            ) : (
              <p className="mt-1 text-sm text-red-400">
                End time must be after start time
              </p>
            )}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm text-slate-400">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-orange-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-orange-500 px-5 py-3 font-medium text-white transition hover:bg-orange-600"
        >
          {shift ? "Save Changes" : "Save Shift"}
        </button>
      </form>

      <Toast show={show} message={message} />
    </>
  );
}
