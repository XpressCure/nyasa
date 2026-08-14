import { CalendarDays, Camera, ImagePlus, Lock, MapPin, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiDownload, apiGet, apiPost } from "../lib/api.js";

const emptyMoment = { title: "", story: "", eventDate: new Date().toISOString().slice(0, 10), location: "", category: "everyday", visibility: "family", photoUrl: "", photoCaption: "" };

export function MomentsPage() {
  const familyId = localStorage.getItem("nyasa_family_id");
  const [moments, setMoments] = useState([]); const [form, setForm] = useState(emptyMoment); const [showForm, setShowForm] = useState(false); const [message, setMessage] = useState("");
  async function load() { const response = await apiGet(`/product/families/${familyId}/moments`); setMoments(response.data || []); }
  useEffect(() => { if (familyId) load().catch((e) => setMessage(e.message)); }, [familyId]);
  const [photoFile, setPhotoFile] = useState(null);
  async function submit(event) { event.preventDefault(); try { const photos = form.photoUrl ? [{ url: form.photoUrl, caption: form.photoCaption }] : []; const response = await apiPost(`/product/families/${familyId}/moments`, { ...form, photos, selectedMemberIds: [], taggedMemberIds: [], photoUrl: undefined, photoCaption: undefined }); if (photoFile) { const dataBase64 = await fileToBase64(photoFile); await apiPost(`/product/families/${familyId}/moments/${response.data._id}/photos`, { originalName: photoFile.name, mimeType: photoFile.type, sizeBytes: photoFile.size, dataBase64, caption: form.photoCaption }); } setForm(emptyMoment); setPhotoFile(null); setShowForm(false); await load(); } catch (e) { setMessage(e.message); } }
  return <div className="product-page moments-page"><PageHeader eyebrow="परिवार की यादें • Family memories" title="Moments" description="Capture a day, its photographs and its story in the private family timeline." />
    <div className="page-actions"><button className="primary-action" onClick={() => setShowForm(!showForm)}><Camera size={17}/> Capture a moment</button></div>{message && <p className="form-message">{message}</p>}
    {showForm && <section className="product-panel"><form className="product-form" onSubmit={submit}><label>Moment title<input required value={form.title} onChange={(e) => setForm({...form,title:e.target.value})}/></label><label>Date<input required type="date" value={form.eventDate} onChange={(e) => setForm({...form,eventDate:e.target.value})}/></label><label>Location<input value={form.location} onChange={(e) => setForm({...form,location:e.target.value})}/></label><label>Category<select value={form.category} onChange={(e) => setForm({...form,category:e.target.value})}>{["everyday","celebration","festival","wedding","village_visit","milestone","memorial","other"].map(v=><option value={v} key={v}>{v.replaceAll("_"," ")}</option>)}</select></label><label>Who can see it?<select value={form.visibility} onChange={(e)=>setForm({...form,visibility:e.target.value})}><option value="family">Everyone in this family</option><option value="private">Only me</option></select></label><label className="wide-field">Story<textarea rows="4" value={form.story} onChange={(e)=>setForm({...form,story:e.target.value})}/></label><label className="wide-field">Upload photograph<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>setPhotoFile(e.target.files?.[0] || null)}/><small>Up to 8 MB. Stored inside this family space.</small></label><label className="wide-field">Or use an existing secure photo URL<input type="url" value={form.photoUrl} onChange={(e)=>setForm({...form,photoUrl:e.target.value})}/></label>{(photoFile || form.photoUrl) && <label className="wide-field">Photo caption<input value={form.photoCaption} onChange={(e)=>setForm({...form,photoCaption:e.target.value})}/></label>}<button className="primary-action"><Plus size={17}/> Share moment</button></form></section>}
    <section className="timeline">{moments.map((moment) => <article className="moment-card" key={moment._id}><MomentPhoto familyId={familyId} moment={moment}/><div className="moment-body"><div className="moment-meta"><span><CalendarDays size={14}/>{new Date(moment.eventDate).toLocaleDateString()}</span>{moment.location && <span><MapPin size={14}/>{moment.location}</span>}<span>{moment.visibility === "private" ? <Lock size={14}/> : <Users size={14}/>} {moment.visibility.replaceAll("_"," ")}</span></div><h2>{moment.title}</h2><p>{moment.story || "A family moment worth remembering."}</p>{moment.photos?.[0]?.caption && <small>{moment.photos[0].caption}</small>}</div></article>)}</section>
    {!moments.length && <div className="empty-state"><Camera size={34}/><h2>Your family timeline starts here</h2><p>Share the first festival, village visit, milestone or everyday memory.</p></div>}
  </div>;
}

function MomentPhoto({ familyId, moment }) {
  const photo = moment.photos?.[0]; const [source, setSource] = useState(photo?.url || "");
  useEffect(() => { if (!photo?.documentId) return undefined; let objectUrl = ""; apiDownload(`/product/families/${familyId}/moments/${moment._id}/photos/${photo.documentId}`).then((blob) => { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); }).catch(() => setSource("")); return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [familyId, moment._id, photo?.documentId]);
  return source ? <img src={source} alt={photo?.caption || moment.title}/> : <div className="moment-placeholder"><ImagePlus size={34}/></div>;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); });
}
