import { Archive, BookOpenText, CalendarDays, GitBranch, HeartHandshake, Home, Images, Landmark, Search, UserCircle, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ApiStatus } from "./ApiStatus.jsx";
import { SessionPanel } from "./SessionPanel.jsx";

const navSections = [
  {
    title: "कार्यस्थल",
    items: [
      { to: "/dashboard", label: "Darshan", icon: Home },
      { to: "/calendar", label: "Panchang", icon: CalendarDays },
      { to: "/family", label: "Kul", icon: Users },
      { to: "/profile", label: "Parichay", icon: UserCircle },
      { to: "/treasury", label: "Kosh", icon: Landmark },
      { to: "/projects", label: "Sankalp", icon: GitBranch },
      { to: "/members", label: "Sadasya", icon: Archive }
    ]
  },
  {
    title: "आगे आने वाला",
    items: [
      { label: "Kul Gallery", icon: Images, planned: true },
      { label: "Kul Research", icon: Search, planned: true },
      { label: "Seva Works", icon: HeartHandshake, planned: true },
      { label: "Virasat Library", icon: BookOpenText, planned: true }
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
            <small>Kul OS</small>
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
