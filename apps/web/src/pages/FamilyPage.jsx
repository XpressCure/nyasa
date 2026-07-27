import { useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

export function FamilyPage() {
  const [name, setName] = useState("The Singh Family Trust");
  const [slug, setSlug] = useState("singh-family-trust");
  const [primaryLocation, setPrimaryLocation] = useState("India");
  const [message, setMessage] = useState("");
  const [families, setFamilies] = useState([]);

  async function createFamily(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await apiPost("/families", { name, slug, primaryLocation });
      localStorage.setItem("nyasa_family_id", response.data.family._id);
      setMessage(`Created ${response.data.family.name}`);
      await loadFamilies();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadFamilies() {
    const response = await apiGet("/families");
    setFamilies(response.data);
  }

  function selectFamily(familyId) {
    localStorage.setItem("nyasa_family_id", familyId);
    setMessage("Selected family workspace");
  }

  return (
    <section>
      <PageHeader
        eyebrow="Workspace"
        title="Family"
        description="Manage family profile, members, roles, and tree structure."
      />
      <section className="content-band">
        <h2>Family Workspace</h2>
        <form className="form-grid" onSubmit={createFamily}>
          <label>
            Family name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Slug
            <input value={slug} onChange={(event) => setSlug(event.target.value)} />
          </label>
          <label>
            Location
            <input value={primaryLocation} onChange={(event) => setPrimaryLocation(event.target.value)} />
          </label>
          <button type="submit">Create Family</button>
          <button type="button" className="secondary-button" onClick={loadFamilies}>
            Load My Families
          </button>
        </form>
        {message ? <p className="form-message">{message}</p> : null}
        {families.length ? (
          <div className="list-stack">
            {families.map((membership) => (
              <button
                className="list-row"
                key={membership._id}
                type="button"
                onClick={() => selectFamily(membership.familyId._id)}
              >
                <span>{membership.familyId.name}</span>
                <strong>{membership.role}</strong>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
