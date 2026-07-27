import { PageHeader } from "../components/PageHeader.jsx";

const stats = [
  ["Family Members", "48"],
  ["Active Missions", "6"],
  ["Family Treasury", "₹12,84,000"],
  ["This Year", "₹2,95,000"]
];

export function DashboardPage() {
  return (
    <section>
      <PageHeader
        eyebrow="The Singh Family Trust"
        title="Dashboard"
        description="A calm overview of the family treasury, missions, decisions, and legacy."
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
        <h2>Next Family Meeting</h2>
        <p>15 August</p>
      </section>
    </section>
  );
}
