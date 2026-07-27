import { PageHeader } from "../components/PageHeader.jsx";

export function MembersPage() {
  return (
    <section>
      <PageHeader
        eyebrow="Directory"
        title="Members"
        description="Profiles, relationships, professions, cities, skills, and contribution history."
      />
      <section className="content-band">
        <h2>Skills Directory</h2>
        <p>Find architects, doctors, lawyers, CAs, engineers, farmers, teachers, and business owners within the family.</p>
      </section>
    </section>
  );
}
