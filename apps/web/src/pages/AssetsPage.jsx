import { ExternalLink, LandPlot, MapPin, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

const emptyAsset = { title: "", assetType: "agricultural_land", state: "", district: "", tehsil: "", village: "", khasraNumber: "", khataNumber: "", surveyNumber: "", ulpin: "", area: "", recordedOwners: "", caretaker: "", officialPortalUrl: "", notes: "" };
const labels = { agricultural_land: "Agricultural land", house: "Family house", plot: "Plot", commercial: "Commercial", temple: "Temple / trust", vehicle: "Vehicle", other: "Other" };

export function AssetsPage() {
  const familyId = localStorage.getItem("nyasa_family_id");
  const [assets, setAssets] = useState([]); const [form, setForm] = useState(emptyAsset); const [message, setMessage] = useState(""); const [showForm, setShowForm] = useState(false);
  async function load() { const response = await apiGet(`/product/families/${familyId}/assets`); setAssets(response.data || []); }
  useEffect(() => { if (familyId) load().catch((e) => setMessage(e.message)); }, [familyId]);
  async function submit(event) { event.preventDefault(); try { await apiPost(`/product/families/${familyId}/assets`, { ...form, recordedOwners: form.recordedOwners.split(",").map((v) => v.trim()).filter(Boolean) }); setForm(emptyAsset); setShowForm(false); setMessage("Asset added with Family declared status."); await load(); } catch (e) { setMessage(e.message); } }
  async function recordCheck(asset) { const sourceUrl = window.prompt("Official portal URL used for this check", asset.officialPortalUrl || ""); if (sourceUrl === null) return; const note = window.prompt("What did you confirm? Do not claim legal title.", "Record details matched on the official portal.") || ""; try { await apiPost(`/product/families/${familyId}/assets/${asset._id}/verifications`, { status: "official_portal_checked", sourceName: "Government land records portal", sourceUrl, note }); await load(); } catch (e) { setMessage(e.message); } }
  return <div className="product-page"><PageHeader eyebrow="ग्रामीण संपत्ति • Rural assets" title="Virasat Assets" description="Keep land identifiers, caretakers, official-source checks and family knowledge together—without confusing a portal check with legal title certification." />
    <div className="page-actions"><button className="primary-action" onClick={() => setShowForm(!showForm)}><Plus size={17} /> Add asset</button></div>{message && <p className="form-message">{message}</p>}
    {showForm && <section className="product-panel"><form className="product-form" onSubmit={submit}>
      <label>Asset name<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Type<select value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>{Object.entries(labels).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      {[["state","State"],["district","District"],["tehsil","Tehsil"],["village","Village"],["khasraNumber","Khasra number"],["khataNumber","Khata number"],["surveyNumber","Survey number"],["ulpin","ULPIN / Bhu-Aadhaar"],["area","Area"],["recordedOwners","Recorded owners (comma separated)"],["caretaker","Caretaker"]].map(([key,label]) => <label key={key}>{label}<input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
      <label className="wide-field">Official portal URL<input type="url" value={form.officialPortalUrl} onChange={(e) => setForm({ ...form, officialPortalUrl: e.target.value })} /></label><label className="wide-field">Family notes<textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><button className="primary-action">Save asset</button>
    </form></section>}
    <section className="product-grid">{assets.map((asset) => <article className="product-card asset-card" key={asset._id}><div className="card-icon"><LandPlot /></div><span className={`status-pill status-${asset.verificationStatus}`}><ShieldCheck size={14}/>{asset.verificationStatus.replaceAll("_", " ")}</span><h2>{asset.title}</h2><p><MapPin size={15}/>{[asset.village, asset.tehsil, asset.district, asset.state].filter(Boolean).join(", ") || "Location not recorded"}</p><dl><div><dt>Type</dt><dd>{labels[asset.assetType]}</dd></div><div><dt>Land ID</dt><dd>{asset.khasraNumber || asset.surveyNumber || asset.ulpin || "Not added"}</dd></div><div><dt>Caretaker</dt><dd>{asset.caretaker || "Not assigned"}</dd></div></dl><div className="card-actions">{asset.officialPortalUrl && <a href={asset.officialPortalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Official portal</a>}<button onClick={() => recordCheck(asset)}>Record portal check</button></div></article>)}</section>
    {!assets.length && <div className="empty-state"><LandPlot size={34}/><h2>No rural assets yet</h2><p>Add the first property without uploading sensitive originals until family permissions are agreed.</p></div>}
  </div>;
}
