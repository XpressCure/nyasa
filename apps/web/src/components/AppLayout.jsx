import { Archive, BookOpenText, Building2, CalendarDays, Camera, ClipboardCheck, GitBranch, HandCoins, HeartHandshake, Home, Images, LandPlot, Landmark, Menu, MoreHorizontal, Search, UserCircle, Users, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiStatus } from "./ApiStatus.jsx";
import { SessionPanel } from "./SessionPanel.jsx";
import { FamilySwitcher } from "./FamilySwitcher.jsx";
import { hasPermission, loadCurrentSession } from "../lib/session.js";
import nyasLogo from "../assets/nyasa-logo.png";

const navSections = [
  {
    title: "कार्यस्थल",
    items: [
      { to: "/", label: "Home", icon: Home, end: true },
      { to: "/dashboard", label: "Darshan", icon: Home },
      { to: "/calendar", label: "Panchang", icon: CalendarDays },
      { to: "/family", label: "Kul", icon: Users },
      { to: "/families", label: "Family Spaces", icon: Building2 },
      { to: "/moments", label: "Moments", icon: Camera },
      { to: "/assets", label: "Virasat Assets", icon: LandPlot },
      { to: "/financial-accounts", label: "My Finances", icon: WalletCards },
      { to: "/profile", label: "Parichay", icon: UserCircle },
      { to: "/treasury", label: "Kosh", icon: Landmark },
      { to: "/contribute", label: "Yogdaan", icon: HandCoins },
      { to: "/kosh-reconciliation", label: "Kosh Milan", icon: ClipboardCheck, permission: "treasury.reconcile" },
      { to: "/projects", label: "Sankalp", icon: GitBranch },
      { to: "/sankalp-sabha", label: "Sankalp Sabha", icon: Users },
      { to: "/members", label: "Sadasya", icon: Archive, permission: "members.manage" }
    ]
  },
  {
    title: "आगे आने वाला",
    items: [
      { to: "/moments", label: "Kul Gallery", icon: Images },
      { label: "Kul Research", icon: Search, planned: true },
      { label: "Seva Works", icon: HeartHandshake, planned: true },
      { label: "Virasat Library", icon: BookOpenText, planned: true }
    ]
  }
];

const mobilePrimaryItems = [
  { to: "/dashboard", label: "Darshan", icon: Home },
  { to: "/family", label: "Kul", icon: Users },
  { to: "/contribute", label: "Yogdaan", icon: HandCoins },
  { to: "/projects", label: "Sankalp", icon: GitBranch }
];

export function AppLayout() {
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadCurrentSession()
      .then(setSession)
      .catch(() => setSession(null));
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app-shell ${menuOpen ? "sidebar-open" : ""}`}>
      <button type="button" className="mobile-menu-button" onClick={() => setMenuOpen((current) => !current)}>
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
        <span>{menuOpen ? "Close" : "Menu"}</span>
      </button>
      <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><img src={nyasLogo} alt="" /></span>
          <div>
            <strong>न्यास</strong>
            <small>Kul OS</small>
          </div>
        </div>
        <FamilySwitcher />
        <nav className="nav-list">
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              {section.items.filter((item) => !item.permission || hasPermission(session, item.permission)).map((item) => {
                const Icon = item.icon;
                if (item.planned) {
                  return (
                    <span className="nav-link nav-link-planned" key={item.label}>
                      <span className="nav-icon"><Icon size={18} /></span>
                      <span>{item.label}</span>
                      <small>soon</small>
                    </span>
                  );
                }

                return (
                  <NavLink
                    end={item.end}
                    key={item.to}
                    to={item.to}
                    className={`nav-link ${mobilePrimaryItems.some((primaryItem) => primaryItem.to === item.to) ? "mobile-primary-duplicate" : ""}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="nav-icon"><Icon size={18} /></span>
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
      <nav className="mobile-bottom-nav" aria-label="Main app navigation">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className="mobile-bottom-link" onClick={() => setMenuOpen(false)}>
              <Icon size={22} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          className={`mobile-bottom-link mobile-more-button ${menuOpen ? "active" : ""}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal size={23} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
