import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout.jsx";
import { RequireAuth } from "./components/RequireAuth.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { AssetsPage } from "./pages/AssetsPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { DeleteAccountPage } from "./pages/DeleteAccountPage.jsx";
import { DownloadAppPage } from "./pages/DownloadAppPage.jsx";
import { FamilyPage } from "./pages/FamilyPage.jsx";
import { FamilySpacesPage } from "./pages/FamilySpacesPage.jsx";
import { FamilyTreePage } from "./pages/FamilyTreePage.jsx";
import { InviteAcceptPage } from "./pages/InviteAcceptPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { GetStartedPage } from "./pages/GetStartedPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { LegalPage } from "./pages/LegalPage.jsx";
import { KoshReconciliationPage } from "./pages/KoshReconciliationPage.jsx";
import { FinancialAccountsPage } from "./pages/FinancialAccountsPage.jsx";
import { MembersPage } from "./pages/MembersPage.jsx";
import { MomentsPage } from "./pages/MomentsPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { ProjectsPage } from "./pages/ProjectsPage.jsx";
import { PrivacyPage } from "./pages/PrivacyPage.jsx";
import { SankalpSabhaPage } from "./pages/SankalpSabhaPage.jsx";
import { TermsPage } from "./pages/TermsPage.jsx";
import { TreasuryPage } from "./pages/TreasuryPage.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/get-started" element={<GetStartedPage />} />
      <Route path="/download-app" element={<DownloadAppPage />} />
      <Route path="/delete-account" element={<DeleteAccountPage />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/families" element={<FamilySpacesPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/moments" element={<MomentsPage />} />
          <Route path="/financial-accounts" element={<FinancialAccountsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/contribute" element={<TreasuryPage simple />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/family-tree" element={<FamilyTreePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/treasury" element={<TreasuryPage />} />
          <Route path="/kosh-reconciliation" element={<KoshReconciliationPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/sankalp-sabha" element={<SankalpSabhaPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
