import { useEffect, useState } from "react";

import ShiftModal from "../components/shifts/ShiftModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import Toast from "../components/ui/Toast";

import { useToast } from "../hooks/useToast";
import { getShifts, deleteShift } from "../services/shift.service";

import type { Shift } from "../types/shifts";

export default function SchedulePage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  const { show, message, triggerToast } = useToast();

  const loadShifts = async () => {
    try {
      const data = await getShifts();
      setShifts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const confirmDelete = async () => {
    if (!shiftToDelete) return;

    try {
      await deleteShift(shiftToDelete.id);
      setShiftToDelete(null);
      triggerToast("Shift deleted");
      await loadShifts();
    } catch (error) {
      console.error(error);
      triggerToast("Failed to delete shift");
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-4xl">Schedule</h1>
          <p className="mt-2 text-slate-400">Total Shifts: {shifts.length}</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full rounded-xl bg-orange-500 px-5 py-3 font-medium text-white transition hover:bg-orange-600 sm:w-auto"
        >
          Add Shift
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Mobile: cards (no horizontal scroll). Desktop: table. */}
          <div className="space-y-3 sm:hidden">
            {shifts.map((shift) => (
              <div key={shift.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">
                  {shift.employee
                    ? `${shift.employee.firstName} ${shift.employee.lastName}`
                    : shift.employeeId}
                </p>
                <p className="mt-1 text-sm text-slate-400">{shift.project?.name ?? "-"}</p>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Start</span>
                  <span className="text-white">{new Date(shift.start).toLocaleString("hu-HU")}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">End</span>
                  <span className="text-white">{new Date(shift.end).toLocaleString("hu-HU")}</span>
                </div>
                {shift.notes && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Notes</span>
                    <span className="text-right text-white">{shift.notes}</span>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setShiftToEdit(shift)}
                    className="flex-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400 hover:bg-blue-500/20"
                  >
                    ✏ Edit
                  </button>

                  <button
                    onClick={() => setShiftToDelete(shift)}
                    className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Start</th>
                    <th className="p-4">End</th>
                    <th className="p-4">Notes</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {shifts.map((shift) => (
                    <tr key={shift.id} className="border-b border-white/5">
                      <td className="p-4">
                        {shift.employee
                          ? `${shift.employee.firstName} ${shift.employee.lastName}`
                          : shift.employeeId}
                      </td>

                      <td className="p-4">{shift.project?.name ?? "-"}</td>

                      <td className="p-4">
                        {new Date(shift.start).toLocaleString("hu-HU")}
                      </td>

                      <td className="p-4">
                        {new Date(shift.end).toLocaleString("hu-HU")}
                      </td>

                      <td className="p-4">{shift.notes || "-"}</td>

                      <td className="p-4 flex gap-2">
                        <button
                          onClick={() => setShiftToEdit(shift)}
                          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400 hover:bg-blue-500/20"
                        >
                          ✏ Edit
                        </button>

                        <button
                          onClick={() => setShiftToDelete(shift)}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add modal */}
      <ShiftModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          triggerToast("Shift created");
          loadShifts();
        }}
      />

      {/* Edit modal */}
      <ShiftModal
        open={shiftToEdit !== null}
        shift={shiftToEdit}
        onClose={() => setShiftToEdit(null)}
        onSuccess={() => {
          triggerToast("Shift updated");
          setShiftToEdit(null);
          loadShifts();
        }}
      />

      <ConfirmModal
        open={shiftToDelete !== null}
        title="Delete Shift"
        message="Are you sure you want to delete this shift?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onClose={() => setShiftToDelete(null)}
      />

      <Toast show={show} message={message} />
    </div>
  );
}
