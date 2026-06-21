import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, type Role } from "../types/auth";

const menusByRole: Record<Role, { label: string; path: string }[]> = {
  [ROLES.DEVELOPER]: [
    { label: "Platform Dashboard", path: "/admin" },
    { label: "Companies", path: "/admin/companies" },
    { label: "Users", path: "/admin/users" },
    { label: "Billing", path: "/admin/billing" },
    { label: "Logs", path: "/admin/logs" },
    { label: "Command Center", path: "/command-center" },
  ],
  [ROLES.BUSINESS_OWNER]: [
    { label: "Dashboard", path: "/" },
    { label: "Employees", path: "/employees" },
    { label: "Projects", path: "/projects" },
    { label: "Customers", path: "/customers" },
    { label: "Schedule", path: "/schedule" },
    { label: "Time Tracking", path: "/time-tracking" },
    { label: "Command Center", path: "/command-center" },
    { label: "Subscription", path: "/subscription" },
    { label: "Settings", path: "/settings" },
  ],
  [ROLES.EMPLOYEE]: [
    { label: "My Schedule", path: "/my-schedule" },
    { label: "My Time", path: "/my-time" },
    { label: "My Projects", path: "/my-projects" },
    { label: "Profile", path: "/profile" },
  ],
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const menuItems = user ? menusByRole[user.role] : [];

  return (
    <>
      {/* Backdrop — mobile/tablet only, closes the drawer on tap outside it. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-white/10 bg-slate-950/95 backdrop-blur-xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:bg-white/5 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Axeriva</h1>
            <p className="mt-1 text-sm text-slate-400">Workforce Management</p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="px-3">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/" || item.path === "/admin"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block w-full rounded-xl px-4 py-3 text-base transition ${
                      isActive
                        ? "bg-orange-500 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
