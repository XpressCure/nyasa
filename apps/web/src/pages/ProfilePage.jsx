import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPatch, apiPost } from "../lib/api.js";

const initialForm = {
  displayName: "",
  gender: "prefer_not_to_say",
  photoUrl: "",
  photoDocumentId: "",
  dateOfBirth: "",
  livingStatus: "living",
  dateOfDeath: "",
  yearOfDeath: "",
  maritalStatus: "unknown",
  anniversaryDate: "",
  relationLabel: "",
  childrenCount: "",
  placeOfResidence: "",
  city: "",
  state: "",
  country: "",
  profession: "",
  bio: "",
  education: {
    intermediate: { institution: "", degree: "", year: "", details: "" },
    graduation: { institution: "", degree: "", year: "", details: "" },
    postGraduation: { institution: "", degree: "", year: "", details: "" }
  },
  work: {
    currentPlace: "",
    currentRole: "",
    previousPlaces: "",
    experienceYears: "",
    notes: ""
  },
  health: {
    bloodGroup: "",
    knownConditionsText: "",
    allergiesText: "",
    geneticNotes: ""
  }
};

const emptyRelative = {
  _id: "",
  photoUrl: "",
  photoDocumentId: "",
  displayName: "",
  gender: "prefer_not_to_say",
  dateOfBirth: "",
  livingStatus: "living",
  dateOfDeath: "",
  yearOfDeath: "",
  maritalStatus: "unknown",
  placeOfResidence: "",
  profession: "",
  bio: ""
};

const initialImmediateFamily = {
  father: { ...emptyRelative, gender: "male" },
  mother: { ...emptyRelative, gender: "female" },
  spouse: { ...emptyRelative, maritalStatus: "married" },
  children: [{ ...emptyRelative }]
};

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function listFromText(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function textFromList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function hydrateForm(member) {
  return {
    ...initialForm,
    displayName: member.displayName || "",
    gender: member.gender || "prefer_not_to_say",
    photoUrl: member.photoUrl || "",
    photoDocumentId: member.photoDocumentId || "",
    dateOfBirth: toInputDate(member.dateOfBirth),
    livingStatus: member.livingStatus || "living",
    dateOfDeath: toInputDate(member.dateOfDeath),
    yearOfDeath: member.yearOfDeath ?? "",
    maritalStatus: member.maritalStatus || "unknown",
    anniversaryDate: toInputDate(member.anniversaryDate),
    relationLabel: member.relationLabel || "",
    childrenCount: member.childrenCount ?? "",
    placeOfResidence: member.placeOfResidence || "",
    city: member.city || "",
    state: member.state || "",
    country: member.country || "",
    profession: member.profession || "",
    bio: member.bio || "",
    education: {
      intermediate: { ...initialForm.education.intermediate, ...(member.education?.intermediate || {}) },
      graduation: { ...initialForm.education.graduation, ...(member.education?.graduation || {}) },
      postGraduation: { ...initialForm.education.postGraduation, ...(member.education?.postGraduation || {}) }
    },
    work: { ...initialForm.work, ...(member.work || {}) },
    health: {
      bloodGroup: member.health?.bloodGroup || "",
      knownConditionsText: textFromList(member.health?.knownConditions),
      allergiesText: textFromList(member.health?.allergies),
      geneticNotes: member.health?.geneticNotes || ""
    }
  };
}

function hydrateRelative(member, fallback = emptyRelative) {
  if (!member) return { ...fallback };

  return {
    ...fallback,
    _id: member._id || "",
    photoUrl: member.photoUrl || "",
    photoDocumentId: member.photoDocumentId || "",
    displayName: member.displayName || "",
    gender: member.gender || fallback.gender || "prefer_not_to_say",
    dateOfBirth: toInputDate(member.dateOfBirth),
    livingStatus: member.livingStatus || "living",
    dateOfDeath: toInputDate(member.dateOfDeath),
    yearOfDeath: member.yearOfDeath ?? "",
    maritalStatus: member.maritalStatus || "unknown",
    placeOfResidence: member.placeOfResidence || "",
    profession: member.profession || "",
    bio: member.bio || ""
  };
}

function relativePayload(relative) {
  if (!relative.displayName.trim()) return null;
  return {
    displayName: relative.displayName,
    gender: relative.gender,
    dateOfBirth: relative.dateOfBirth,
    livingStatus: relative.livingStatus,
    dateOfDeath: relative.dateOfDeath,
    yearOfDeath: relative.yearOfDeath === "" ? undefined : Number(relative.yearOfDeath),
    maritalStatus: relative.maritalStatus,
    placeOfResidence: relative.placeOfResidence,
    profession: relative.profession,
    bio: relative.bio
  };
}

function relativePhotoKey(group, index = null) {
  return group === "children" ? `child-${index}` : group;
}

async function fileToUploadPayload(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read selected photo."));
    reader.readAsDataURL(file);
  });

  return {
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    dataBase64: String(dataUrl).split(",")[1]
  };
}

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [immediateFamily, setImmediateFamily] = useState(initialImmediateFamily);
  const [relativePhotoFiles, setRelativePhotoFiles] = useState({});
  const [message, setMessage] = useState("");

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateEducation(stage, field, value) {
    setForm((current) => ({
      ...current,
      education: {
        ...current.education,
        [stage]: { ...current.education[stage], [field]: value }
      }
    }));
  }

  function updateNested(section, field, value) {
    setForm((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value }
    }));
  }

  function updateRelative(group, field, value, index = null) {
    setImmediateFamily((current) => {
      if (group === "children") {
        const children = current.children.map((child, childIndex) => (childIndex === index ? { ...child, [field]: value } : child));
        return { ...current, children };
      }

      return { ...current, [group]: { ...current[group], [field]: value } };
    });
  }

  function addChildRow() {
    setImmediateFamily((current) => ({ ...current, children: [...current.children, { ...emptyRelative }] }));
  }

  function removeChildRow(index) {
    setImmediateFamily((current) => ({ ...current, children: current.children.filter((_, childIndex) => childIndex !== index) }));
    setRelativePhotoFiles((current) => {
      const next = { ...current };
      delete next[relativePhotoKey("children", index)];
      return next;
    });
  }

  async function uploadMemberPhoto(memberId, file) {
    if (!file) return null;
    const familyId = getFamilyId();
    const payload = await fileToUploadPayload(file);
    return apiPost(`/members/family/${familyId}/${memberId}/photo`, payload);
  }

  async function loadProfile() {
    let familyId = getFamilyId();

    if (!familyId) {
      try {
        const familiesResponse = await apiGet("/families");
        const firstMembership = familiesResponse.data[0];
        if (firstMembership?.familyId?._id) {
          familyId = firstMembership.familyId._id;
          localStorage.setItem("nyasa_family_id", familyId);
        }
      } catch (error) {
        setMessage(error.message);
        return;
      }
    }

    if (!familyId) {
      setMessage("Join the Alahdadpur Kul workspace first, then complete your Parichay.");
      return;
    }

    try {
      const response = await apiGet(`/members/family/${familyId}/me`);
      setProfile(response.data);
      setForm(hydrateForm(response.data));
      await loadImmediateFamily(familyId);
      setMessage("Parichay loaded.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadImmediateFamily(familyId = getFamilyId()) {
    if (!familyId) return;

    const response = await apiGet(`/members/family/${familyId}/immediate-family`);
    setImmediateFamily({
      father: hydrateRelative(response.data.father, initialImmediateFamily.father),
      mother: hydrateRelative(response.data.mother, initialImmediateFamily.mother),
      spouse: hydrateRelative(response.data.spouse, initialImmediateFamily.spouse),
      children: response.data.children.length
        ? response.data.children.map((child) => hydrateRelative(child))
        : [{ ...emptyRelative }]
    });
  }

  async function saveProfile(event) {
    event.preventDefault();
    const familyId = getFamilyId();

    if (!familyId) {
      setMessage("Join the Alahdadpur Kul workspace first.");
      return;
    }

    try {
      const response = await apiPatch(`/members/family/${familyId}/me`, {
        ...form,
        childrenCount: form.childrenCount === "" ? undefined : Number(form.childrenCount),
        yearOfDeath: form.yearOfDeath === "" ? undefined : Number(form.yearOfDeath),
        health: {
          bloodGroup: form.health.bloodGroup,
          knownConditions: listFromText(form.health.knownConditionsText),
          allergies: listFromText(form.health.allergiesText),
          geneticNotes: form.health.geneticNotes
        }
      });
      if (profilePhotoFile) {
        const photoResponse = await uploadMemberPhoto(response.data._id, profilePhotoFile);
        setProfile(photoResponse.data.member);
        setForm(hydrateForm(photoResponse.data.member));
        setProfilePhotoFile(null);
      } else {
        setProfile(response.data);
        setForm(hydrateForm(response.data));
      }
      setMessage("Parichay updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveImmediateFamily(event) {
    event.preventDefault();
    const familyId = getFamilyId();

    if (!familyId) {
      setMessage("Join the Alahdadpur Kul workspace first.");
      return;
    }

    try {
      const payload = {
        father: relativePayload(immediateFamily.father) || undefined,
        mother: relativePayload(immediateFamily.mother) || undefined,
        spouse: relativePayload(immediateFamily.spouse) || undefined,
        children: immediateFamily.children.map(relativePayload).filter(Boolean)
      };
      const response = await apiPost(`/members/family/${familyId}/immediate-family`, payload);
      const uploadTasks = [];

      if (response.data.father && relativePhotoFiles.father) {
        uploadTasks.push(uploadMemberPhoto(response.data.father._id, relativePhotoFiles.father));
      }
      if (response.data.mother && relativePhotoFiles.mother) {
        uploadTasks.push(uploadMemberPhoto(response.data.mother._id, relativePhotoFiles.mother));
      }
      if (response.data.spouse && relativePhotoFiles.spouse) {
        uploadTasks.push(uploadMemberPhoto(response.data.spouse._id, relativePhotoFiles.spouse));
      }
      response.data.children.forEach((child, index) => {
        const file = relativePhotoFiles[`child-${index}`];
        if (file) uploadTasks.push(uploadMemberPhoto(child._id, file));
      });

      await Promise.all(uploadTasks);
      setProfile(response.data.member);
      setForm(hydrateForm(response.data.member));
      await loadImmediateFamily(familyId);
      setRelativePhotoFiles({});
      setMessage("Immediate Kul saved. These Parichay records can be completed later from their own accounts.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveRelative(group, index = null) {
    const familyId = getFamilyId();

    if (!familyId) {
      setMessage("Join the Alahdadpur Kul workspace first.");
      return;
    }

    const relative = group === "children" ? immediateFamily.children[index] : immediateFamily[group];
    const payload = relativePayload(relative);

    if (!payload) {
      setMessage("Add a name before saving this Kul member.");
      return;
    }

    try {
      let savedMember = null;

      if (relative._id) {
        const response = await apiPatch(`/members/family/${familyId}/${relative._id}/profile`, payload);
        savedMember = response.data;
      } else {
        const response = await apiPost(`/members/family/${familyId}/immediate-family`, {
          father: group === "father" ? payload : undefined,
          mother: group === "mother" ? payload : undefined,
          spouse: group === "spouse" ? payload : undefined,
          children: group === "children" ? [payload] : []
        });
        savedMember = group === "children" ? response.data.children?.[0] : response.data[group];
        if (response.data.member) {
          setProfile(response.data.member);
          setForm(hydrateForm(response.data.member));
        }
      }

      const key = relativePhotoKey(group, index);
      if (savedMember?._id && relativePhotoFiles[key]) {
        await uploadMemberPhoto(savedMember._id, relativePhotoFiles[key]);
      }

      await loadImmediateFamily(familyId);
      setRelativePhotoFiles((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setMessage(`${payload.displayName} saved.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <section>
      <PageHeader
        eyebrow="My Account"
        title="Parichay"
        description="Fill what you know today. Nyasa will keep improving each Parichay as the Kul adds more details."
      />
      <section className="content-band">
        <h2>My Parichay</h2>
        {profile ? (
          <p className="section-note">
            Signed in as <strong>{profile.displayName}</strong>. Your role is <strong>{profile.role?.replaceAll("_", " ")}</strong>.
          </p>
        ) : (
          <div className="empty-state">
            <h3>Start with the Alahdadpur Kul workspace</h3>
            <p>Your Parichay becomes part of the Kul record, Kul tree, and future health tree.</p>
            <Link className="secondary-button" to="/family">
              Open Kul Workspace
            </Link>
          </div>
        )}

        <form className="form-grid profile-form" onSubmit={saveProfile}>
          <h3 className="form-section-title">Identity</h3>
          <label>
            Full name
            <input value={form.displayName} onChange={(event) => updateField("displayName", event.target.value)} />
          </label>
          <label>
            Gender
            <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label>
            Living status
            <select value={form.livingStatus} onChange={(event) => updateField("livingStatus", event.target.value)}>
              <option value="living">Living</option>
              <option value="deceased">No longer in this world</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            Date of birth
            <input type="date" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} />
          </label>
          {form.livingStatus === "deceased" ? (
            <>
              <label>
                Date of death if known
                <input type="date" value={form.dateOfDeath} onChange={(event) => updateField("dateOfDeath", event.target.value)} />
              </label>
              <label>
                Year of death if date is unknown
                <input type="number" min="1800" max="2100" value={form.yearOfDeath} onChange={(event) => updateField("yearOfDeath", event.target.value)} />
              </label>
            </>
          ) : null}
          <label>
            Parichay photo
            <input accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => setProfilePhotoFile(event.target.files[0] || null)} />
            {profilePhotoFile ? <small>{profilePhotoFile.name} selected</small> : form.photoUrl || form.photoDocumentId ? <small>Photo saved</small> : null}
          </label>
          <label>
            Relationship note
            <input value={form.relationLabel} onChange={(event) => updateField("relationLabel", event.target.value)} placeholder="Son of, daughter of, bua, chacha..." />
          </label>

          <h3 className="form-section-title">Kul Links</h3>
          <label>
            Marital status
            <select value={form.maritalStatus} onChange={(event) => updateField("maritalStatus", event.target.value)}>
              <option value="unknown">Unknown</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="divorced">Divorced</option>
              <option value="separated">Separated</option>
            </select>
          </label>
          <label>
            Anniversary date
            <input type="date" value={form.anniversaryDate} onChange={(event) => updateField("anniversaryDate", event.target.value)} />
          </label>
          <label>
            Number of children
            <input type="number" min="0" value={form.childrenCount} onChange={(event) => updateField("childrenCount", event.target.value)} />
          </label>
          <h3 className="form-section-title">Residence</h3>
          <label>
            Place of residence
            <input value={form.placeOfResidence} onChange={(event) => updateField("placeOfResidence", event.target.value)} />
          </label>
          <label>
            City
            <input value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          </label>
          <label>
            State
            <input value={form.state} onChange={(event) => updateField("state", event.target.value)} />
          </label>
          <label>
            Country
            <input value={form.country} onChange={(event) => updateField("country", event.target.value)} />
          </label>

          <h3 className="form-section-title">Education</h3>
          {[
            ["intermediate", "Intermediate"],
            ["graduation", "Graduation"],
            ["postGraduation", "Post graduation"]
          ].map(([stage, label]) => (
            <div className="nested-fieldset" key={stage}>
              <strong>{label}</strong>
              <input
                value={form.education[stage].institution}
                onChange={(event) => updateEducation(stage, "institution", event.target.value)}
                placeholder="School, college, or university"
              />
              <input
                value={form.education[stage].degree}
                onChange={(event) => updateEducation(stage, "degree", event.target.value)}
                placeholder="Course or degree"
              />
              <input
                type="number"
                value={form.education[stage].year}
                onChange={(event) => updateEducation(stage, "year", event.target.value)}
                placeholder="Year"
              />
              <input
                value={form.education[stage].details}
                onChange={(event) => updateEducation(stage, "details", event.target.value)}
                placeholder="Details"
              />
            </div>
          ))}

          <h3 className="form-section-title">Work</h3>
          <label>
            Profession
            <input value={form.profession} onChange={(event) => updateField("profession", event.target.value)} />
          </label>
          <label>
            Current place of work
            <input value={form.work.currentPlace} onChange={(event) => updateNested("work", "currentPlace", event.target.value)} />
          </label>
          <label>
            Current role
            <input value={form.work.currentRole} onChange={(event) => updateNested("work", "currentRole", event.target.value)} />
          </label>
          <label>
            Experience in years
            <input type="number" min="0" value={form.work.experienceYears} onChange={(event) => updateNested("work", "experienceYears", event.target.value)} />
          </label>
          <label className="wide-field">
            Earlier places of work
            <textarea value={form.work.previousPlaces} onChange={(event) => updateNested("work", "previousPlaces", event.target.value)} rows="3" />
          </label>

          <h3 className="form-section-title">Health Notes</h3>
          <p className="profile-help wide-field">
            Add only what you are comfortable sharing. These notes are stored for future health-tree analysis and are not shown in the public member list.
          </p>
          <label>
            Blood group
            <input value={form.health.bloodGroup} onChange={(event) => updateNested("health", "bloodGroup", event.target.value)} />
          </label>
          <label>
            Existing diseases
            <input
              value={form.health.knownConditionsText}
              onChange={(event) => updateNested("health", "knownConditionsText", event.target.value)}
              placeholder="Comma separated"
            />
          </label>
          <label>
            Allergies
            <input
              value={form.health.allergiesText}
              onChange={(event) => updateNested("health", "allergiesText", event.target.value)}
              placeholder="Comma separated"
            />
          </label>
          <label className="wide-field">
            Genetic or recurring Kul health notes
            <textarea value={form.health.geneticNotes} onChange={(event) => updateNested("health", "geneticNotes", event.target.value)} rows="3" />
          </label>

          <h3 className="form-section-title">Story</h3>
          <label className="wide-field">
            Bio
            <textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} rows="5" />
          </label>
          <button type="submit" disabled={!getFamilyId()}>
            Save Parichay
          </button>
        </form>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadProfile}>
            Reload Parichay
          </button>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
      <section className="content-band spaced-band">
        <h2>Immediate Kul</h2>
        <p className="section-note">
          Add father, mother, and children here. They can later sign in and complete their own education, work, health, and Kul details.
        </p>
        <form className="form-grid profile-form" onSubmit={saveImmediateFamily}>
          <h3 className="form-section-title">Father</h3>
          <RelativeFields
            label="Father"
            relative={immediateFamily.father}
            onChange={(field, value) => updateRelative("father", field, value)}
            onPhoto={(file) => setRelativePhotoFiles((current) => ({ ...current, father: file }))}
            onSave={() => saveRelative("father")}
            photoFile={relativePhotoFiles.father}
          />

          <h3 className="form-section-title">Mother</h3>
          <RelativeFields
            label="Mother"
            relative={immediateFamily.mother}
            onChange={(field, value) => updateRelative("mother", field, value)}
            onPhoto={(file) => setRelativePhotoFiles((current) => ({ ...current, mother: file }))}
            onSave={() => saveRelative("mother")}
            photoFile={relativePhotoFiles.mother}
          />

          <h3 className="form-section-title">Spouse</h3>
          <RelativeFields
            label="Spouse"
            relative={immediateFamily.spouse}
            onChange={(field, value) => updateRelative("spouse", field, value)}
            onPhoto={(file) => setRelativePhotoFiles((current) => ({ ...current, spouse: file }))}
            onSave={() => saveRelative("spouse")}
            photoFile={relativePhotoFiles.spouse}
          />

          <h3 className="form-section-title">Children</h3>
          {immediateFamily.children.map((child, index) => (
            <div className="relative-card" key={`child-${index}`}>
              <RelativeFields
                label={`Child ${index + 1}`}
                relative={child}
                onChange={(field, value) => updateRelative("children", field, value, index)}
                onPhoto={(file) => setRelativePhotoFiles((current) => ({ ...current, [`child-${index}`]: file }))}
                onSave={() => saveRelative("children", index)}
                photoFile={relativePhotoFiles[relativePhotoKey("children", index)]}
              />
              {immediateFamily.children.length > 1 ? (
                <button type="button" className="secondary-button" onClick={() => removeChildRow(index)}>
                  Remove Child
                </button>
              ) : null}
            </div>
          ))}
          <button type="button" className="secondary-button" onClick={addChildRow}>
            Add Another Child
          </button>
          <button type="submit" disabled={!getFamilyId()}>
            Save Immediate Kul
          </button>
        </form>
      </section>
    </section>
  );
}

function RelativeFields({ label, relative, onChange, onPhoto, onSave, photoFile }) {
  return (
    <>
      <label>
        Full name
        <input value={relative.displayName} onChange={(event) => onChange("displayName", event.target.value)} />
      </label>
      <label>
        Gender
        <select value={relative.gender} onChange={(event) => onChange("gender", event.target.value)}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </label>
      <label>
        Living status
        <select value={relative.livingStatus} onChange={(event) => onChange("livingStatus", event.target.value)}>
          <option value="living">Living</option>
          <option value="deceased">No longer in this world</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>
      <label>
        Date of birth
        <input type="date" value={relative.dateOfBirth} onChange={(event) => onChange("dateOfBirth", event.target.value)} />
      </label>
      {relative.livingStatus === "deceased" ? (
        <>
          <label>
            Date of death if known
            <input type="date" value={relative.dateOfDeath} onChange={(event) => onChange("dateOfDeath", event.target.value)} />
          </label>
          <label>
            Year of death if date is unknown
            <input type="number" min="1800" max="2100" value={relative.yearOfDeath} onChange={(event) => onChange("yearOfDeath", event.target.value)} />
          </label>
        </>
      ) : null}
      <label>
        Marital status
        <select value={relative.maritalStatus} onChange={(event) => onChange("maritalStatus", event.target.value)}>
          <option value="unknown">Unknown</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="widowed">Widowed</option>
          <option value="divorced">Divorced</option>
          <option value="separated">Separated</option>
        </select>
      </label>
      <label>
        Photo
        <input accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => onPhoto(event.target.files[0] || null)} />
        {photoFile ? <small>{photoFile.name} selected</small> : relative.photoUrl || relative.photoDocumentId ? <small>Photo saved</small> : null}
      </label>
      <label>
        Place of residence
        <input value={relative.placeOfResidence} onChange={(event) => onChange("placeOfResidence", event.target.value)} />
      </label>
      <label>
        Profession
        <input value={relative.profession} onChange={(event) => onChange("profession", event.target.value)} />
      </label>
      <label className="wide-field">
        Notes
        <textarea value={relative.bio} onChange={(event) => onChange("bio", event.target.value)} rows="3" />
      </label>
      <div className="relative-actions wide-field">
        <span>{relative._id ? "Existing Parichay" : "New Parichay"}</span>
        <button type="button" className="secondary-button" onClick={onSave}>
          {relative._id ? `Update ${label}` : `Create ${label}`}
        </button>
      </div>
    </>
  );
}
