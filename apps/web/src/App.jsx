import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { FamilyPage } from "./pages/FamilyPage.jsx";
import { InviteAcceptPage } from "./pages/InviteAcceptPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { MembersPage } from "./pages/MembersPage.jsx";
import { ProjectsPage } from "./pages/ProjectsPage.jsx";
import { TreasuryPage } from "./pages/TreasuryPage.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/family" element={<FamilyPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/treasury" element={<TreasuryPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
      </Route>
    </Routes>
  );
}
