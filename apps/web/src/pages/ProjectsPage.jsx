import { PageHeader } from "../components/PageHeader.jsx";

export function ProjectsPage() {
  return (
    <section>
      <PageHeader
        eyebrow="Missions"
        title="Projects"
        description="Every project records purpose, funds, progress, expenses, documents, photos, and decisions."
      />
      <section className="content-band">
        <h2>Ancestral House Renovation</h2>
        <div className="project-summary">
          <span>In Progress</span>
          <span>Target ₹8,00,000</span>
          <span>Raised ₹5,65,000</span>
          <span>Completion 70%</span>
        </div>
      </section>
    </section>
  );
}
