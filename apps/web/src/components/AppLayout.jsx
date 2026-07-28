import { Archive, BookOpenText, CalendarDays, GitBranch, HeartHandshake, Home, Images, Landmark, Network, Search, UserCircle, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ApiStatus } from "./ApiStatus.jsx";
import { SessionPanel } from "./SessionPanel.jsx";

const navSections = [
  {
    title: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: Home },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/family", label: "Family", icon: Users },
      { to: "/profile", label: "Profile", icon: UserCircle },
      { to: "/family-tree", label: "Family Tree", icon: Network },
      { to: "/treasury", label: "Kosh", icon: Landmark },
      { to: "/projects", label: "Missions", icon: GitBranch },
      { to: "/members", label: "Members", icon: Archive }
    ]
  },
  {
    title: "Coming Next",
    items: [
      { label: "Family Gallery", icon: Images, planned: true },
      { label: "Family Research", icon: Search, planned: true },
      { label: "Social Works", icon: HeartHandshake, planned: true },
      { label: "Legacy Library", icon: BookOpenText, planned: true }
    ]
  }
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
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.planned) {
                  return (
                    <span className="nav-link nav-link-planned" key={item.label}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                      <small>soon</small>
                    </span>
                  );
                }

                return (
                  <NavLink key={item.to} to={item.to} className="nav-link">
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
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
