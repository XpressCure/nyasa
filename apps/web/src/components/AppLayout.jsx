import { Archive, BookOpenText, CalendarDays, GitBranch, HeartHandshake, Home, Images, Landmark, Search, UserCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiStatus } from "./ApiStatus.jsx";
import { SessionPanel } from "./SessionPanel.jsx";
import { hasPermission, loadCurrentSession } from "../lib/session.js";

const navSections = [
  {
    title: "कार्यस्थल",
    items: [
      { to: "/", label: "Home", icon: Home, end: true },
      { to: "/dashboard", label: "Darshan", icon: Home },
      { to: "/calendar", label: "Panchang", icon: CalendarDays },
      { to: "/family", label: "Kul", icon: Users },
      { to: "/profile", label: "Parichay", icon: UserCircle },
      { to: "/contribute", label: "Yogdaan", icon: HeartHandshake },
      { to: "/treasury", label: "Kosh", icon: Landmark },
      { to: "/projects", label: "Sankalp", icon: GitBranch },
      { to: "/members", label: "Sadasya", icon: Archive, permission: "members.manage" }
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
  const location = useLocation();
  const [session, setSession] = useState(null);

  useEffect(() => {
    loadCurrentSession()
      .then(setSession)
      .catch(() => setSession(null));
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <div>
            <strong>न्यास</strong>
            <small>Kul OS</small>
          </div>
        </div>
        <nav className="nav-list">
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              {section.items.filter((item) => !item.permission || hasPermission(session, item.permission)).map((item) => {
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
                  <NavLink end={item.end} key={item.to} to={item.to} className="nav-link">
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
