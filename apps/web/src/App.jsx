import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { ContributePage } from "./pages/ContributePage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { FamilyPage } from "./pages/FamilyPage.jsx";
import { FamilyTreePage } from "./pages/FamilyTreePage.jsx";
import { InviteAcceptPage } from "./pages/InviteAcceptPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { MembersPage } from "./pages/MembersPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { ProjectsPage } from "./pages/ProjectsPage.jsx";
import { SankalpSabhaPage } from "./pages/SankalpSabhaPage.jsx";
import { TreasuryPage } from "./pages/TreasuryPage.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/family" element={<FamilyPage />} />
        <Route path="/family-tree" element={<FamilyTreePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/treasury" element={<TreasuryPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/sankalp-sabha" element={<SankalpSabhaPage />} />
      </Route>
    </Routes>
  );
}
