import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { FamilyPage } from "./pages/FamilyPage.jsx";
import { InviteAcceptPage } from "./pages/InviteAcceptPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { MembersPage } from "./pages/MembersPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { ProjectsPage } from "./pages/ProjectsPage.jsx";
import { TreasuryPage } from "./pages/TreasuryPage.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/family" element={<FamilyPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/treasury" element={<TreasuryPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
      </Route>
    </Routes>
  );
}
