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
    <div className="p-8">
      <PageHeader title="My Schedule" subtitle="Your upcoming and past shifts." />

      {isLoading ? null : shifts.length === 0 ? (
        <EmptyState title="No shifts yet" description="Your shifts will show up here." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
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
      )}
    </div>
  );
}
