import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { getMyShifts } from "../services/shift.service";

type MyShift = {
  id: number;
  start: string;
  end: string | null;
  notes?: string;
  project?: {
    name: string;
    address?: string | null;
    customer?: { address?: string | null } | null;
  } | null;
};

// Project address, falling back to the customer's address — employees need
// to know where to go, not the project's raw GPS coordinates.
function workAddress(project: MyShift["project"]): string | null {
  if (!project) return null;
  return project.address || project.customer?.address || null;
}

export default function MySchedulePage() {
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyShifts()
      .then(setShifts)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-8">
      <PageHeader title="My Schedule" subtitle="Your upcoming and past shifts." />

      {isLoading ? null : shifts.length === 0 ? (
        <EmptyState title="No shifts yet" description="Your shifts will show up here." />
      ) : (
        <>
          {/* Mobile: cards (no horizontal scroll). Desktop: table. */}
          <div className="space-y-3 sm:hidden">
            {shifts.map((shift) => (
              <div key={shift.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Start</span>
                  <span className="text-white">{new Date(shift.start).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">End</span>
                  <span className="text-white">
                    {shift.end ? new Date(shift.end).toLocaleString() : "In progress"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Project</span>
                  <span className="text-white">{shift.project?.name ?? "—"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Location</span>
                  <span className="text-right text-white">{workAddress(shift.project) ?? "—"}</span>
                </div>
                {shift.notes && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Notes</span>
                    <span className="text-right text-white">{shift.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="p-4">Start</th>
                    <th className="p-4">End</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => (
                    <tr key={shift.id} className="border-b border-white/5">
                      <td className="p-4">{new Date(shift.start).toLocaleString()}</td>
                      <td className="p-4">
                        {shift.end ? new Date(shift.end).toLocaleString() : "In progress"}
                      </td>
                      <td className="p-4">{shift.project?.name ?? "—"}</td>
                      <td className="p-4">{workAddress(shift.project) ?? "—"}</td>
                      <td className="p-4">{shift.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
