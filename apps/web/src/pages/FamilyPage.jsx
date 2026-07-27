import { PageHeader } from "../components/PageHeader.jsx";

export function FamilyPage() {
  return (
    <section>
      <PageHeader
        eyebrow="Workspace"
        title="Family"
        description="Manage family profile, members, roles, and tree structure."
      />
      <section className="content-band">
        <h2>Family Workspace</h2>
        <p>Owner and admin controls will appear here in Sprint 1.</p>
      </section>
    </section>
  );
}
