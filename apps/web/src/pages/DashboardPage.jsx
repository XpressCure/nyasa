import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet } from "../lib/api.js";

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value || 0);
}

async function getSelectedFamilyId() {
  const storedFamilyId = localStorage.getItem("nyasa_family_id");
  if (storedFamilyId) return storedFamilyId;

  const response = await apiGet("/families");
  const firstMembership = response.data[0];

  if (firstMembership?.familyId?._id) {
    localStorage.setItem("nyasa_family_id", firstMembership.familyId._id);
    return firstMembership.familyId._id;
  }

  return null;
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setMessage("");

    try {
      const familyId = await getSelectedFamilyId();
      if (!familyId) {
        setMessage("Join or create the Alahdadpur family workspace first.");
        return;
      }

      const response = await apiGet(`/families/${familyId}/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = dashboard?.metrics;
  const stats = [
    ["Family Members", metrics?.memberCount ?? 0],
    ["Active Missions", metrics?.activeProjects ?? 0],
    ["Completed Missions", metrics?.completedProjects ?? 0],
    ["Family Kosh", formatMoney(metrics?.treasuryBalance)],
    ["This Year", formatMoney(metrics?.contributionThisYear)]
  ];

  return (
    <section>
      <PageHeader
        eyebrow={dashboard?.family?.name || "Nyasa Trust - Alahdadpur"}
        title="Dashboard"
        description="A live overview of the Alahdadpur family workspace, Kosh, missions, decisions, and legacy."
      />
      <div className="metric-grid">
        {stats.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="content-band">
        <h2>Launch Workspace</h2>
        <p>
          The live database is prepared with Alahdadpur family profile, Kosh, and launch missions. Invite family members and ask them to complete
          their profile first.
        </p>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadDashboard}>
            Refresh Dashboard
          </button>
          <Link className="secondary-button" to="/profile">
            Complete Profile
          </Link>
          <Link className="secondary-button" to="/projects">
            View Missions
          </Link>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
    </section>
  );
}
