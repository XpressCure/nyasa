import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPatch } from "../lib/api.js";

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [profession, setProfession] = useState("");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState("");

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  async function loadProfile() {
    const familyId = getFamilyId();

    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      const response = await apiGet(`/members/family/${familyId}/me`);
      const member = response.data;
      setProfile(member);
      setDisplayName(member.displayName || "");
      setCity(member.city || "");
      setState(member.state || "");
      setCountry(member.country || "");
      setProfession(member.profession || "");
      setBio(member.bio || "");
      setMessage("Profile loaded.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const familyId = getFamilyId();

    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      const response = await apiPatch(`/members/family/${familyId}/me`, {
        displayName,
        city,
        state,
        country,
        profession,
        bio
      });
      setProfile(response.data);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <section>
      <PageHeader eyebrow="My Account" title="Profile" description="Keep your family profile, location, profession, and personal bio current." />
      <section className="content-band">
        <h2>My Profile</h2>
        {profile ? (
          <p className="section-note">
            Signed in as <strong>{profile.displayName}</strong>. Your role is <strong>{profile.role?.replaceAll("_", " ")}</strong>.
          </p>
        ) : null}
        <form className="form-grid profile-form" onSubmit={saveProfile}>
          <label>
            Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>
            Profession
            <input value={profession} onChange={(event) => setProfession(event.target.value)} />
          </label>
          <label>
            City
            <input value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label>
            State
            <input value={state} onChange={(event) => setState(event.target.value)} />
          </label>
          <label>
            Country
            <input value={country} onChange={(event) => setCountry(event.target.value)} />
          </label>
          <label className="wide-field">
            Bio
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows="5" />
          </label>
          <button type="submit">Save Profile</button>
        </form>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadProfile}>
            Reload Profile
          </button>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
    </section>
  );
}
