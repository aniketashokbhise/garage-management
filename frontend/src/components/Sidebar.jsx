import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/customers", label: "Customers", icon: "👤" },
  { to: "/employees", label: "Employees", icon: "🧑‍🔧" },
  { to: "/attendance", label: "Attendance", icon: "🗓️" },
  { to: "/vehicles", label: "Vehicles", icon: "🚗" },
  { to: "/inventory", label: "Inventory", icon: "🔧" },
  // { to: "/services", label: "Services", icon: "🛠️" },
  // { to: "/job-cards", label: "Job Cards", icon: "📋" },
  { to: "/invoices", label: "Invoices", icon: "🧾" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({ open, setOpen }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:static z-30 top-0 left-0 h-full w-64 bg-slate-900 text-slate-100 transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-5 text-xl font-bold border-b border-slate-700">
          🔧 Workshop Manager
        </div>
        <nav className="p-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
