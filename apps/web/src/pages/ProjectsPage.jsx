import { useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPatch, apiPost } from "../lib/api.js";

function formatMoney(amountRupees = 0) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amountRupees);
}

function formatLabel(value = "") {
  return value.replaceAll("_", " ");
}

export function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [title, setTitle] = useState("Ancestral House Renovation");
  const [slug, setSlug] = useState("ancestral-house-renovation");
  const [description, setDescription] = useState("Repair and modernize the family ancestral house.");
  const [category, setCategory] = useState("renovation");
  const [targetBudgetRupees, setTargetBudgetRupees] = useState("800000");
  const [projectLeadMemberId, setProjectLeadMemberId] = useState("");
  const [message, setMessage] = useState("");

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  async function loadProjects() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      const response = await apiGet(`/projects/family/${familyId}`);
      setProjects(response.data);
      setMessage(response.data.length ? "Loaded missions." : "No missions yet.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadMembers() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      const response = await apiGet(`/members/family/${familyId}`);
      setMembers(response.data);
      setMessage("Loaded members for project lead selection.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createProject(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      await apiPost(`/projects/family/${familyId}`, {
        title,
        slug,
        description,
        category,
        status: "active",
        targetBudgetRupees,
        projectLeadMemberId: projectLeadMemberId || undefined
      });
      setMessage("Mission created.");
      await loadProjects();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateProject(projectId, patch) {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      await apiPatch(`/projects/family/${familyId}/${projectId}`, patch);
      setMessage("Mission updated.");
      await loadProjects();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Missions"
        title="Projects"
        description="Every project records purpose, funds, progress, expenses, documents, photos, and decisions."
      />
      <section className="content-band">
        <h2>Create Mission</h2>
        <form className="form-grid" onSubmit={createProject}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Slug
            <input value={slug} onChange={(event) => setSlug(event.target.value)} />
          </label>
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="renovation">Renovation</option>
              <option value="education">Education</option>
              <option value="health">Health</option>
              <option value="event">Event</option>
              <option value="asset_maintenance">Asset Maintenance</option>
              <option value="community">Community</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Target Budget
            <input value={targetBudgetRupees} onChange={(event) => setTargetBudgetRupees(event.target.value)} type="number" min="0" />
          </label>
          <label>
            Project Lead
            <select value={projectLeadMemberId} onChange={(event) => setProjectLeadMemberId(event.target.value)}>
              <option value="">Select lead</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.displayName} ({formatLabel(member.role)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button type="submit">Create Mission</button>
          <button type="button" className="secondary-button" onClick={loadProjects}>
            Load Missions
          </button>
          <button type="button" className="secondary-button" onClick={loadMembers}>
            Load Members
          </button>
        </form>
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="content-band spaced-band">
        <h2>Missions</h2>
        {projects.length ? (
          <div className="project-list">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-card-header">
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.description || "No description added."}</p>
                  </div>
                  <span>{formatLabel(project.status)}</span>
                </div>
                <div className="project-summary">
                  <span>Target {formatMoney(project.targetBudgetRupees)}</span>
                  <span>Allocated {formatMoney(project.allocatedRupees)}</span>
                  <span>Spent {formatMoney(project.spentRupees)}</span>
                  <span>Completion {project.completionPercent}%</span>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${project.completionPercent}%` }} />
                </div>
                <div className="row-actions">
                  <select value={project.status} onChange={(event) => updateProject(project.id, { status: event.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="proposed">Proposed</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => updateProject(project.id, { completionPercent: Math.min(project.completionPercent + 10, 100) })}
                  >
                    +10%
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>Load missions or create your first family mission.</p>
        )}
      </section>
    </section>
  );
}
