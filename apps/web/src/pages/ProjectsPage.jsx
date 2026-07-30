import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { API_BASE_URL, apiGet, apiPatch, apiPost } from "../lib/api.js";
import { hasPermission, loadCurrentSession } from "../lib/session.js";

const lifecycleStages = [
  ["concept", "Vichar"],
  ["research", "Khoj"],
  ["estimate_pending", "Estimate Pending"],
  ["estimate_received", "Estimate Received"],
  ["fundraising", "Kosh Sangrah"],
  ["ready_for_implementation", "Ready"],
  ["implementation", "Karya"],
  ["completed", "Poorn"],
  ["paused", "Paused"]
];

const projectTypes = [
  ["implementation", "Implementation"],
  ["research", "Research"],
  ["business_study", "Business Study"],
  ["asset_management", "Asset Management"],
  ["community", "Community"],
  ["event", "Event"],
  ["other", "Other"]
];

const categories = [
  ["renovation", "Renovation"],
  ["education", "Education"],
  ["health", "Health"],
  ["event", "Event"],
  ["asset_maintenance", "Asset Maintenance"],
  ["community", "Community"],
  ["other", "Other"]
];

const expenseCategories = [
  ["material", "Material"],
  ["labor", "Labor"],
  ["travel", "Travel"],
  ["professional_fee", "Professional Fee"],
  ["maintenance", "Maintenance"],
  ["document", "Document"],
  ["other", "Other"]
];

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

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function firstLiveStageForProject(projectType) {
  return projectType === "research" || projectType === "business_study" ? "research" : "estimate_pending";
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read selected file."));
    reader.readAsDataURL(file);
  });
}

export function ProjectsPage() {
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [message, setMessage] = useState("");

  const [draft, setDraft] = useState({
    title: "Alahdadpur House Repair Sankalp",
    slug: "alahdadpur-house-repair",
    description: "Repair scope, estimate, funding, implementation and bills for the ancestral house.",
    rules: "Only approved repair material, labour, travel for inspection, and documented vendor payments are covered.",
    category: "renovation",
    projectType: "implementation",
    budgetRequired: true,
    tentativeBudgetRupees: "800000",
    estimatedBudgetRupees: "",
    projectLeadMemberId: "",
    auditorMemberId: "",
    implementationLeadMemberId: "",
    startDate: "",
    targetCompletionDate: ""
  });

  const [projectPatch, setProjectPatch] = useState({
    lifecycleStage: "estimate_pending",
    estimatedBudgetRupees: "",
    completionPercent: "0"
  });

  const [milestoneForm, setMilestoneForm] = useState({
    title: "Estimate received",
    description: "Upload and verify vendor estimate before fundraising starts.",
    dueDate: "",
    budgetRupees: ""
  });

  const [updateForm, setUpdateForm] = useState({
    title: "Progress update",
    updateType: "progress",
    progressPercent: "",
    milestoneId: "",
    body: "Work update, decision, blocker, or completed milestone details."
  });

  const [expenseForm, setExpenseForm] = useState({
    amountRupees: "25000",
    category: "material",
    vendorName: "Local vendor",
    expenseDate: new Date().toISOString().slice(0, 10),
    description: "Sankalp implementation expense"
  });
  const [billFile, setBillFile] = useState(null);
  const [billInputKey, setBillInputKey] = useState(0);
  const [rejectionReason, setRejectionReason] = useState("Needs more detail before approval");

  const canCreateProjects = hasPermission(session, "projects.create");
  const canManageProjects = hasPermission(session, "projects.manage") || hasPermission(session, "projects.manage_assigned");
  const canViewExpenses = hasPermission(session, "expenses.view");
  const canSubmitExpenses = hasPermission(session, "expenses.submit");
  const canApproveExpenses = hasPermission(session, "expenses.approve");
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || selectedDetails?.project;
  const canSubmitForSelectedProject =
    canSubmitExpenses && selectedProject && (!selectedProject.budgetRequired || selectedProject.isFullyFunded) && selectedProject.availableToSpendPaise > 0;

  useEffect(() => {
    loadCurrentSession()
      .then(setSession)
      .catch((error) => setMessage(error.message));
    loadProjects();
    loadMembers();
  }, []);

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  function updateDraft(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "title" ? { slug: slugify(value) } : {})
    }));
  }

  async function loadProjects() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a Kul first.");
      return;
    }

    try {
      const response = await apiGet(`/projects/family/${familyId}`);
      setProjects(response.data);
      setMessage(response.data.length ? "Sankalp loaded." : "No Sankalp yet.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadMembers() {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      const response = await apiGet(`/members/family/${familyId}`);
      const livingMembers = response.data.filter((member) => (member.livingStatus || "living") === "living");
      setMembers(livingMembers);
      setMessage("Living Sadasya loaded for Sankalp role selection.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createProject(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) return;

    const publishNow = event.nativeEvent?.submitter?.value === "publish";

    try {
      await apiPost(`/projects/family/${familyId}`, {
        ...draft,
        budgetRequired: Boolean(draft.budgetRequired),
        projectLeadMemberId: draft.projectLeadMemberId || undefined,
        auditorMemberId: draft.auditorMemberId || undefined,
        implementationLeadMemberId: draft.implementationLeadMemberId || undefined,
        estimatedBudgetRupees: draft.estimatedBudgetRupees || undefined,
        lifecycleStage: publishNow ? firstLiveStageForProject(draft.projectType) : "concept",
        status: publishNow ? "proposed" : "draft"
      });
      setMessage(
        publishNow
          ? "Sankalp is live. Members can now see its purpose, rules, team and stage."
          : "Draft Sankalp saved. It is not live for all members yet."
      );
      await loadProjects();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadProjectDetails(projectId) {
    const familyId = getFamilyId();
    if (!familyId || !projectId) return;

    try {
      const [detailsResponse, expensesResponse] = await Promise.all([
        apiGet(`/projects/family/${familyId}/${projectId}`),
        canViewExpenses ? apiGet(`/expenses/family/${familyId}/project/${projectId}`) : Promise.resolve({ data: [] })
      ]);
      setSelectedProjectId(projectId);
      setSelectedDetails(detailsResponse.data);
      setExpenses(expensesResponse.data);
      setProjectPatch({
        lifecycleStage: detailsResponse.data.project.lifecycleStage || "estimate_pending",
        estimatedBudgetRupees: detailsResponse.data.project.estimatedBudgetRupees || "",
        completionPercent: detailsResponse.data.project.completionPercent || "0"
      });
      setMessage("Sankalp workspace loaded.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateProject(projectId, patch) {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      await apiPatch(`/projects/family/${familyId}/${projectId}`, patch);
      setMessage("Sankalp updated.");
      await loadProjects();
      await loadProjectDetails(projectId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createMilestone(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId || !selectedProjectId) return;

    try {
      await apiPost(`/projects/family/${familyId}/${selectedProjectId}/milestones`, {
        ...milestoneForm,
        budgetRupees: milestoneForm.budgetRupees || undefined
      });
      setMessage("Milestone added.");
      await loadProjectDetails(selectedProjectId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateMilestone(milestoneId, patch) {
    const familyId = getFamilyId();
    if (!familyId || !selectedProjectId) return;

    try {
      await apiPatch(`/projects/family/${familyId}/${selectedProjectId}/milestones/${milestoneId}`, patch);
      setMessage("Milestone updated.");
      await loadProjectDetails(selectedProjectId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createProgressUpdate(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId || !selectedProjectId) return;

    try {
      await apiPost(`/projects/family/${familyId}/${selectedProjectId}/updates`, {
        ...updateForm,
        milestoneId: updateForm.milestoneId || undefined,
        progressPercent: updateForm.progressPercent === "" ? undefined : Number(updateForm.progressPercent)
      });
      setMessage("Progress report added.");
      await Promise.all([loadProjects(), loadProjectDetails(selectedProjectId)]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function uploadExpenseBill({ familyId, expenseId, file }) {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("Bill file must be 8 MB or smaller.");
    }

    const token = localStorage.getItem("nyasa_token");
    const dataBase64 = await readFileAsBase64(file);
    const response = await fetch(`${API_BASE_URL}/documents/family/${familyId}/expenses/${expenseId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        dataBase64
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error?.message || `Bill upload failed: ${response.status}`);
    }

    return payload;
  }

  async function submitExpense(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId || !selectedProjectId) return;

    try {
      const response = await apiPost(`/expenses/family/${familyId}/project/${selectedProjectId}`, expenseForm);

      if (billFile) {
        await uploadExpenseBill({ familyId, expenseId: response.data.id, file: billFile });
        setBillFile(null);
        setBillInputKey((current) => current + 1);
      }

      setMessage(billFile ? "Expense submitted with bill for approval." : "Expense submitted for approval.");
      await Promise.all([loadProjects(), loadProjectDetails(selectedProjectId)]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function approveExpense(expenseId) {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      await apiPost(`/expenses/family/${familyId}/${expenseId}/approve`, {});
      setMessage("Expense approved and posted.");
      await Promise.all([loadProjects(), loadProjectDetails(selectedProjectId)]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function rejectExpense(expenseId) {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      await apiPost(`/expenses/family/${familyId}/${expenseId}/reject`, { rejectionReason });
      setMessage("Expense rejected.");
      await loadProjectDetails(selectedProjectId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function downloadDocument(document) {
    const familyId = getFamilyId();
    const token = localStorage.getItem("nyasa_token");
    const documentId = document.id || document._id;

    try {
      const response = await fetch(`${API_BASE_URL}/documents/family/${familyId}/${documentId}/download`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error(`Document download failed: ${response.status}`);

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = document.originalName || "sankalp-document";
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function renderMemberOption(member) {
    return `${member.displayName} (${formatLabel(member.role)})`;
  }

  return (
    <section>
      <PageHeader
        eyebrow="Sankalp"
        title="Sankalp Prabandhan"
        description="Create, estimate, fund, implement, audit, and close every Kul Sankalp with visible rules and progress."
      />

      <section className="content-band">
        <h2>Sankalp Lifecycle</h2>
        <div className="lifecycle-strip">
          {lifecycleStages.slice(0, 8).map(([stage, label], index) => (
            <div key={stage}>
              <strong>{index + 1}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="section-note">
          Create a sample in Draft first, refine the purpose, rules, roles and budget, then publish it live for all members. Fundraising and
          expenses open only when the rules, estimate, and budget path are clear.
        </p>
      </section>

      <section className="content-band spaced-band">
        <div className="section-heading-row">
          <div>
            <h2>{canCreateProjects ? "Create Sankalp" : "Sadasya View"}</h2>
            <p>{canCreateProjects ? "Define purpose, rules, roles, tentative budget, and timeline." : "Follow each Sankalp, progress, rules, Kosh, and expenses."}</p>
          </div>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={loadProjects}>
              Refresh
            </button>
            {canCreateProjects ? (
              <button type="button" className="secondary-button" onClick={loadMembers}>
                Load Sadasya
              </button>
            ) : null}
          </div>
        </div>

        {canCreateProjects ? (
          <form className="form-grid sankalp-create-form" onSubmit={createProject}>
            <label>
              Sankalp name
              <input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} />
            </label>
            <label>
              Slug
              <input value={draft.slug} onChange={(event) => updateDraft("slug", event.target.value)} />
            </label>
            <label>
              Category
              <select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sankalp type
              <select value={draft.projectType} onChange={(event) => updateDraft("projectType", event.target.value)}>
                {projectTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tentative budget
              <input type="number" min="0" value={draft.tentativeBudgetRupees} onChange={(event) => updateDraft("tentativeBudgetRupees", event.target.value)} />
            </label>
            <label>
              Budget required?
              <select value={draft.budgetRequired ? "yes" : "no"} onChange={(event) => updateDraft("budgetRequired", event.target.value === "yes")}>
                <option value="yes">Yes</option>
                <option value="no">No / research only</option>
              </select>
            </label>
            <label>
              Tentative start
              <input type="date" value={draft.startDate} onChange={(event) => updateDraft("startDate", event.target.value)} />
            </label>
            <label>
              Tentative finish
              <input type="date" value={draft.targetCompletionDate} onChange={(event) => updateDraft("targetCompletionDate", event.target.value)} />
            </label>
            <label>
              Project manager
              <select value={draft.projectLeadMemberId} onChange={(event) => updateDraft("projectLeadMemberId", event.target.value)}>
                <option value="">Select manager</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {renderMemberOption(member)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Progress auditor
              <select value={draft.auditorMemberId} onChange={(event) => updateDraft("auditorMemberId", event.target.value)}>
                <option value="">Select auditor</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {renderMemberOption(member)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Implementation lead
              <select value={draft.implementationLeadMemberId} onChange={(event) => updateDraft("implementationLeadMemberId", event.target.value)}>
                <option value="">Select implementation lead</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {renderMemberOption(member)}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide-field">
              Description
              <textarea rows="3" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
            </label>
            <label className="wide-field">
              Sankalp rules
              <textarea rows="4" value={draft.rules} onChange={(event) => updateDraft("rules", event.target.value)} />
            </label>
            <button type="submit" name="intent" value="draft">
              Save Draft
            </button>
            <button type="submit" name="intent" value="publish" className="secondary-button">
              Publish Live
            </button>
          </form>
        ) : (
          <div className="sadasya-sankalp-note">
            <p>
              You can see all Sankalp, rules, team, funding status, milestones, progress reports, and submitted bills. To support a
              Sankalp, add money in Kosh and allocate your wallet balance.
            </p>
            <Link className="secondary-button" to="/treasury">
              Open Kosh
            </Link>
          </div>
        )}
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="content-band spaced-band">
        <h2>All Sankalp</h2>
        {projects.length ? (
          <div className="sankalp-board">
            {projects.map((project) => (
              <article className="project-card sankalp-card" key={project.id}>
                <div className="project-card-header">
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.description || "No description added."}</p>
                  </div>
                  <span className={project.isDraft ? "draft-pill" : ""}>{project.isDraft ? "Draft" : formatLabel(project.lifecycleStage || project.status)}</span>
                </div>
                <div className="project-summary">
                  <span>Type {formatLabel(project.projectType || "implementation")}</span>
                  <span>Tentative {formatMoney(project.tentativeBudgetRupees)}</span>
                  <span>Estimate {formatMoney(project.estimatedBudgetRupees || project.targetBudgetRupees)}</span>
                  <span>Allocated {formatMoney(project.allocatedRupees)}</span>
                  <span>Spent {formatMoney(project.spentRupees)}</span>
                  <span>Progress {project.completionPercent || 0}%</span>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${project.budgetRequired ? project.fundingPercent || 0 : project.completionPercent || 0}%` }} />
                </div>
                <div className="sankalp-team-row">
                  <span>PM: {project.projectLeadMember?.displayName || "Pending"}</span>
                  <span>Audit: {project.auditorMember?.displayName || "Pending"}</span>
                  <span>Karya: {project.implementationLeadMember?.displayName || "Pending"}</span>
                </div>
                <div className="button-row">
                  <button type="button" className="secondary-button" onClick={() => loadProjectDetails(project.id)}>
                    Open Workspace
                  </button>
                  {canManageProjects && project.isDraft ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        updateProject(project.id, {
                          status: "proposed",
                          lifecycleStage: firstLiveStageForProject(project.projectType)
                        })
                      }
                    >
                      Publish Live
                    </button>
                  ) : null}
                  {canManageProjects && !project.isDraft ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => updateProject(project.id, { lifecycleStage: "implementation" })}
                    >
                      Start Karya
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>Load Sankalp or create the first Kul Sankalp.</p>
        )}
      </section>

      {selectedDetails ? (
        <section className="content-band spaced-band sankalp-workspace">
          <div className="section-heading-row">
            <div>
              <h2>{selectedDetails.project.title}</h2>
              <p>{selectedDetails.project.rules || "Rules are pending. Add scope clearly before estimate and fundraising."}</p>
            </div>
            <span className={`status-pill ${selectedDetails.project.isDraft ? "draft-pill" : ""}`}>
              {selectedDetails.project.isDraft ? "Draft Sample" : formatLabel(selectedDetails.project.lifecycleStage)}
            </span>
          </div>

          <div className="mission-financials">
            <div>
              <span>Tentative</span>
              <strong>{formatMoney(selectedDetails.project.tentativeBudgetRupees)}</strong>
            </div>
            <div>
              <span>Estimate</span>
              <strong>{formatMoney(selectedDetails.project.estimatedBudgetRupees || selectedDetails.project.targetBudgetRupees)}</strong>
            </div>
            <div>
              <span>Allocated</span>
              <strong>{formatMoney(selectedDetails.project.allocatedRupees)}</strong>
            </div>
            <div>
              <span>Spent</span>
              <strong>{formatMoney(selectedDetails.project.spentRupees)}</strong>
            </div>
            <div>
              <span>Available</span>
              <strong>{formatMoney(selectedDetails.project.availableToSpendRupees)}</strong>
            </div>
          </div>

          <div className="sankalp-detail-grid">
            <div>
              <h3>Team</h3>
              <div className="list-stack">
                {(selectedDetails.projectMembers || []).map((projectMember) => (
                  <div className="compact-row" key={projectMember._id}>
                    <strong>{projectMember.memberId?.displayName || "Member"}</strong>
                    <span>{formatLabel(projectMember.role)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>Timeline</h3>
              <div className="list-stack">
                <div className="compact-row">
                  <strong>Start</strong>
                  <span>{toInputDate(selectedDetails.project.startDate) || "Tentative date pending"}</span>
                </div>
                <div className="compact-row">
                  <strong>Finish</strong>
                  <span>{toInputDate(selectedDetails.project.targetCompletionDate) || "Tentative date pending"}</span>
                </div>
              </div>
            </div>
          </div>

          {canManageProjects ? (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                updateProject(selectedProjectId, {
                  lifecycleStage: projectPatch.lifecycleStage,
                  estimatedBudgetRupees: projectPatch.estimatedBudgetRupees || undefined,
                  completionPercent: projectPatch.completionPercent === "" ? undefined : Number(projectPatch.completionPercent)
                });
              }}
            >
              <label>
                Stage
                <select value={projectPatch.lifecycleStage} onChange={(event) => setProjectPatch((current) => ({ ...current, lifecycleStage: event.target.value }))}>
                  {lifecycleStages.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estimated budget
                <input
                  type="number"
                  min="0"
                  value={projectPatch.estimatedBudgetRupees}
                  onChange={(event) => setProjectPatch((current) => ({ ...current, estimatedBudgetRupees: event.target.value }))}
                />
              </label>
              <label>
                Completion %
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={projectPatch.completionPercent}
                  onChange={(event) => setProjectPatch((current) => ({ ...current, completionPercent: event.target.value }))}
                />
              </label>
              <button type="submit">Update Sankalp</button>
              {selectedDetails.project.isDraft ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    updateProject(selectedProjectId, {
                      status: "proposed",
                      lifecycleStage: firstLiveStageForProject(selectedDetails.project.projectType)
                    })
                  }
                >
                  Publish Live
                </button>
              ) : null}
            </form>
          ) : null}

          <h3>Milestones</h3>
          <div className="list-stack">
            {selectedDetails.milestones?.length ? (
              selectedDetails.milestones.map((milestone) => (
                <div className="ledger-row" key={milestone._id}>
                  <div>
                    <strong>{milestone.title}</strong>
                    <span>{milestone.description || "No description added."}</span>
                    <small>
                      {formatLabel(milestone.status)} {milestone.dueDate ? `- due ${toInputDate(milestone.dueDate)}` : ""}
                    </small>
                  </div>
                  {canManageProjects ? (
                    <div className="row-actions">
                      <button type="button" className="secondary-button" onClick={() => updateMilestone(milestone._id, { status: "in_progress" })}>
                        Start
                      </button>
                      <button type="button" className="secondary-button" onClick={() => updateMilestone(milestone._id, { status: "completed" })}>
                        Complete
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p>No milestones yet.</p>
            )}
          </div>

          {canManageProjects ? (
            <form className="form-grid" onSubmit={createMilestone}>
              <label>
                Milestone title
                <input value={milestoneForm.title} onChange={(event) => setMilestoneForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Due date
                <input type="date" value={milestoneForm.dueDate} onChange={(event) => setMilestoneForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </label>
              <label>
                Milestone budget
                <input type="number" min="0" value={milestoneForm.budgetRupees} onChange={(event) => setMilestoneForm((current) => ({ ...current, budgetRupees: event.target.value }))} />
              </label>
              <label className="wide-field">
                Description
                <textarea rows="2" value={milestoneForm.description} onChange={(event) => setMilestoneForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <button type="submit">Add Milestone</button>
            </form>
          ) : null}

          <h3>Progress Reports</h3>
          <div className="list-stack">
            {selectedDetails.updates?.length ? (
              selectedDetails.updates.map((update) => (
                <div className="ledger-row" key={update._id}>
                  <div>
                    <strong>{update.title || formatLabel(update.updateType)}</strong>
                    <span>{update.body}</span>
                    <small>
                      {formatLabel(update.updateType)} {update.progressPercent !== undefined ? `- ${update.progressPercent}%` : ""}
                    </small>
                  </div>
                  <div className="ledger-member">
                    <strong>{update.createdByMember?.displayName || "Sadasya"}</strong>
                    <span>{new Date(update.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
              ))
            ) : (
              <p>No progress report yet.</p>
            )}
          </div>

          {canManageProjects ? (
            <form className="form-grid" onSubmit={createProgressUpdate}>
              <label>
                Update type
                <select value={updateForm.updateType} onChange={(event) => setUpdateForm((current) => ({ ...current, updateType: event.target.value }))}>
                  {["note", "research", "estimate", "progress", "risk", "decision", "completion"].map((value) => (
                    <option key={value} value={value}>
                      {formatLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Linked milestone
                <select value={updateForm.milestoneId} onChange={(event) => setUpdateForm((current) => ({ ...current, milestoneId: event.target.value }))}>
                  <option value="">No milestone</option>
                  {(selectedDetails.milestones || []).map((milestone) => (
                    <option key={milestone._id} value={milestone._id}>
                      {milestone.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Progress %
                <input type="number" min="0" max="100" value={updateForm.progressPercent} onChange={(event) => setUpdateForm((current) => ({ ...current, progressPercent: event.target.value }))} />
              </label>
              <label>
                Title
                <input value={updateForm.title} onChange={(event) => setUpdateForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="wide-field">
                Report
                <textarea rows="4" value={updateForm.body} onChange={(event) => setUpdateForm((current) => ({ ...current, body: event.target.value }))} />
              </label>
              <button type="submit">Add Progress Report</button>
            </form>
          ) : null}

          {canViewExpenses ? (
            <>
              <h3>Expenses</h3>
              {selectedProject && !canSubmitForSelectedProject ? (
                <p className="section-note">
                  Expenses open after the Sankalp is fully funded. Research Sankalp may be marked as no-budget by admins if only ideas are being collected.
                </p>
              ) : null}
              {canSubmitForSelectedProject ? (
                <form className="form-grid" onSubmit={submitExpense}>
                  <label>
                    Amount
                    <input type="number" min="1" value={expenseForm.amountRupees} onChange={(event) => setExpenseForm((current) => ({ ...current, amountRupees: event.target.value }))} />
                  </label>
                  <label>
                    Category
                    <select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}>
                      {expenseCategories.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Vendor
                    <input value={expenseForm.vendorName} onChange={(event) => setExpenseForm((current) => ({ ...current, vendorName: event.target.value }))} />
                  </label>
                  <label>
                    Date
                    <input type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm((current) => ({ ...current, expenseDate: event.target.value }))} />
                  </label>
                  <label>
                    Bill or photo
                    <input key={billInputKey} accept="application/pdf,image/jpeg,image/png,image/webp" type="file" onChange={(event) => setBillFile(event.target.files?.[0] || null)} />
                  </label>
                  <label className="wide-field">
                    Description
                    <input value={expenseForm.description} onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))} />
                  </label>
                  <button type="submit">Submit Expense</button>
                </form>
              ) : null}
              {canApproveExpenses ? (
                <label className="reject-reason">
                  Rejection reason
                  <input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
                </label>
              ) : null}
              <div className="list-stack">
                {expenses.length ? (
                  expenses.map((expense) => (
                    <div className="ledger-row" key={expense.id}>
                      <div>
                        <strong>{formatMoney(expense.amountRupees)}</strong>
                        <span>
                          {formatLabel(expense.category)} - {expense.vendorName || "No vendor"} - {formatLabel(expense.status)}
                        </span>
                        <small>{expense.description || "No description added."}</small>
                        {expense.billDocuments?.length ? (
                          <div className="document-list">
                            {expense.billDocuments.map((document) => (
                              <button key={document.id || document._id} type="button" onClick={() => downloadDocument(document)}>
                                {document.originalName}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="ledger-member">
                        <strong>{expense.submittedBy?.displayName || "Sadasya"}</strong>
                        <span>{new Date(expense.expenseDate).toLocaleDateString("en-IN")}</span>
                      </div>
                      {canApproveExpenses && expense.status === "submitted" ? (
                        <div className="row-actions">
                          <button type="button" className="secondary-button" onClick={() => approveExpense(expense.id)}>
                            Approve
                          </button>
                          <button type="button" className="secondary-button" onClick={() => rejectExpense(expense.id)}>
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p>No expenses yet.</p>
                )}
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
