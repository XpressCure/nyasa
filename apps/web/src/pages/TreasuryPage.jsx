import { PageHeader } from "../components/PageHeader.jsx";

export function TreasuryPage() {
  return (
    <section>
      <PageHeader
        eyebrow="Kosh"
        title="Treasury"
        description="Contribute once, then allocate funds across family missions."
      />
      <div className="metric-grid">
        <article className="metric-card">
          <span>Wallet Balance</span>
          <strong>₹72,500</strong>
        </article>
        <article className="metric-card">
          <span>Available Treasury</span>
          <strong>₹12,84,000</strong>
        </article>
      </div>
    </section>
  );
}
