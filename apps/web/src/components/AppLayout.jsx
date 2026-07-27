import { Archive, GitBranch, Home, Landmark, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ApiStatus } from "./ApiStatus.jsx";
import { SessionPanel } from "./SessionPanel.jsx";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/family", label: "Family", icon: Users },
  { to: "/treasury", label: "Kosh", icon: Landmark },
  { to: "/projects", label: "Missions", icon: GitBranch },
  { to: "/members", label: "Members", icon: Archive }
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <div>
            <strong>Nyasa</strong>
            <small>Family OS</small>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className="nav-link">
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <SessionPanel />
        <ApiStatus />
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
