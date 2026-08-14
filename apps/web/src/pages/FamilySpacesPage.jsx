import { Check, Copy, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

const emptyForm = { name: "", slug: "", primaryLocation: "", description: "" };

export function FamilySpacesPage() {
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() { const response = await apiGet("/families"); setMemberships(response.data || []); }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  function select(membership) {
    localStorage.setItem("nyasa_family_id", membership.familyId._id);
    navigate("/dashboard");
    window.location.reload();
  }

  async function createFamily(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await apiPost("/families", form);
      localStorage.setItem("nyasa_family_id", response.data.family._id);
      setForm(emptyForm); await load(); setMessage("Family space created. You are its first steward.");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  return <div className="product-page">
    <PageHeader eyebrow="Your private spaces" title="Families" description="One Nyas identity can belong to your birth family, spouse's family, or another family asset group." />
    {message && <p className="form-message">{message}</p>}
    <section className="product-grid family-space-grid">
      {memberships.map((membership) => <article className="product-card" key={membership._id}>
        <span className="status-pill"><Users size={14} /> {membership.role.replaceAll("_", " ")}</span>
        <h2>{membership.familyId?.name}</h2>
        <p>{membership.familyId?.primaryLocation || "Private family workspace"}</p>
        <button className="primary-action" onClick={() => select(membership)}><Check size={17} /> Open family</button>
      </article>)}
    </section>
    <section className="product-panel">
      <div><span className="section-kicker">New family</span><h2>Create a private family space</h2><p>Use a recognizable name. The family slug becomes its stable Nyas identifier.</p></div>
      <form className="product-form" onSubmit={createFamily}>
        <label>Family name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} /></label>
        <label>Family ID<input required pattern="[a-z0-9-]+" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} /></label>
        <label>Primary location<input value={form.primaryLocation} onChange={(e) => setForm({ ...form, primaryLocation: e.target.value })} /></label>
        <label className="wide-field">Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button className="primary-action" disabled={busy}><Plus size={17} /> {busy ? "Creating…" : "Create family"}</button>
      </form>
    </section>
    <section className="privacy-note"><Copy size={18} /><div><strong>Joining another family</strong><p>Ask a Family Steward for a Nyas invitation link. Opening it while signed in adds a separate membership; it never combines the two families' data.</p></div></section>
  </div>;
}
