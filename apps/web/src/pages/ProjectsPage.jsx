import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPatch, apiPost } from "../lib/api.js";
import { hasPermission, loadCurrentSession } from "../lib/session.js";

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
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [expenseAmountRupees, setExpenseAmountRupees] = useState("25000");
  const [expenseCategory, setExpenseCategory] = useState("material");
  const [expenseVendorName, setExpenseVendorName] = useState("Local vendor");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseDescription, setExpenseDescription] = useState("Mission implementation expense");
  const canCreateProjects = hasPermission(session, "projects.create");
  const canManageProjects = hasPermission(session, "projects.manage");
  const canViewExpenses = hasPermission(session, "expenses.view");
  const canSubmitExpenses = hasPermission(session, "expenses.submit");
  const canApproveExpenses = hasPermission(session, "expenses.approve");
  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  useEffect(() => {
    loadCurrentSession()
      .then(setSession)
      .catch((error) => setMessage(error.message));
  }, []);

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

  async function loadExpenses(projectId = selectedProjectId) {
    const familyId = getFamilyId();
    if (!familyId || !projectId) {
      setMessage("Select a mission first.");
      return;
    }

    try {
      const response = await apiGet(`/expenses/family/${familyId}/project/${projectId}`);
      setSelectedProjectId(projectId);
      setExpenses(response.data);
      setMessage(response.data.length ? "Loaded expenses." : "No expenses recorded for this mission.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId || !selectedProjectId) {
      setMessage("Select a mission first.");
      return;
    }

    try {
      await apiPost(`/expenses/family/${familyId}/project/${selectedProjectId}`, {
        amountRupees: expenseAmountRupees,
        category: expenseCategory,
        vendorName: expenseVendorName,
        expenseDate,
        description: expenseDescription
      });
      setMessage("Expense submitted for approval.");
      await loadExpenses(selectedProjectId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function approveExpense(expenseId) {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      await apiPost(`/expenses/family/${familyId}/${expenseId}/approve`, {});
      setMessage("Expense approved and posted to mission spending.");
      await Promise.all([loadExpenses(selectedProjectId), loadProjects()]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function rejectExpense(expenseId) {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      await apiPost(`/expenses/family/${familyId}/${expenseId}/reject`, {
        rejectionReason: "Rejected during review"
      });
      setMessage("Expense rejected.");
      await loadExpenses(selectedProjectId);
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
        {canCreateProjects ? (
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
          </form>
        ) : (
          <p>Your current role can view missions but cannot create them.</p>
        )}
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadProjects}>
            Load Missions
          </button>
          <button type="button" className="secondary-button" onClick={loadMembers}>
            Load Members
          </button>
        </div>
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
                  <span>Funding {project.fundingPercent || 0}%</span>
                  <span>{project.isFullyFunded ? "Ready to begin" : "Collecting contributions"}</span>
                  <span>Spent {formatMoney(project.spentRupees)}</span>
                  <span>Completion {project.completionPercent}%</span>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${project.fundingPercent || 0}%` }} />
                </div>
                {canManageProjects ? (
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
                ) : null}
                {canViewExpenses ? (
                  <div className="button-row">
                    <button type="button" className="secondary-button" onClick={() => loadExpenses(project.id)}>
                      Load Expenses
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p>Load missions or create your first family mission.</p>
        )}
      </section>

      {canViewExpenses ? (
        <section className="content-band spaced-band">
          <h2>Mission Expenses</h2>
          {selectedProject ? (
            <p>
              Reviewing expenses for <strong>{selectedProject.title}</strong>.
            </p>
          ) : (
            <p>Select a mission to load its expenses.</p>
          )}

          {canSubmitExpenses && selectedProject ? (
            <form className="form-grid" onSubmit={submitExpense}>
              <label>
                Amount
                <input
                  value={expenseAmountRupees}
                  onChange={(event) => setExpenseAmountRupees(event.target.value)}
                  type="number"
                  min="1"
                />
              </label>
              <label>
                Category
                <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}>
                  <option value="material">Material</option>
                  <option value="labor">Labor</option>
                  <option value="travel">Travel</option>
                  <option value="professional_fee">Professional Fee</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="document">Document</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Vendor
                <input value={expenseVendorName} onChange={(event) => setExpenseVendorName(event.target.value)} />
              </label>
              <label>
                Date
                <input value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} type="date" />
              </label>
              <label>
                Description
                <input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} />
              </label>
              <button type="submit">Submit Expense</button>
            </form>
          ) : null}

          {expenses.length ? (
            <div className="list-stack">
              {expenses.map((expense) => (
                <div className="ledger-row" key={expense.id}>
                  <div>
                    <strong>{formatMoney(expense.amountRupees)}</strong>
                    <span>
                      {formatLabel(expense.category)} - {expense.vendorName || "No vendor"} - {formatLabel(expense.status)}
                    </span>
                    <small>{expense.description || "No description added."}</small>
                  </div>
                  <div className="ledger-member">
                    <strong>{expense.submittedBy?.displayName || "Member"}</strong>
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
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
