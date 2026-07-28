import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { API_BASE_URL, apiGet, apiPatch, apiPost } from "../lib/api.js";
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
  const [description, setDescription] = useState("Repair and modernize the Kul ancestral house.");
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
  const [expenseDescription, setExpenseDescription] = useState("Sankalp implementation expense");
  const [billFile, setBillFile] = useState(null);
  const [billInputKey, setBillInputKey] = useState(0);
  const [rejectionReason, setRejectionReason] = useState("Needs more detail before approval");
  const canCreateProjects = hasPermission(session, "projects.create");
  const canManageProjects = hasPermission(session, "projects.manage");
  const canLoadMembers = canCreateProjects || canManageProjects;
  const canViewExpenses = hasPermission(session, "expenses.view");
  const canSubmitExpenses = hasPermission(session, "expenses.submit");
  const canApproveExpenses = hasPermission(session, "expenses.approve");
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const canSubmitForSelectedProject =
    canSubmitExpenses && selectedProject && selectedProject.isFullyFunded && selectedProject.availableToSpendPaise > 0;

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
      setMessage("Create or select a Kul first.");
      return;
    }

    try {
      const response = await apiGet(`/projects/family/${familyId}`);
      setProjects(response.data);
      setMessage(response.data.length ? "Loaded Sankalp." : "No Sankalp yet.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadMembers() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a Kul first.");
      return;
    }

    try {
      const response = await apiGet(`/members/family/${familyId}`);
      setMembers(response.data);
      setMessage("Loaded members for Sankalp lead selection.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createProject(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a Kul first.");
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
      setMessage("Sankalp created.");
      await loadProjects();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateProject(projectId, patch) {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a Kul first.");
      return;
    }

    try {
      await apiPatch(`/projects/family/${familyId}/${projectId}`, patch);
      setMessage("Sankalp updated.");
      await loadProjects();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadExpenses(projectId = selectedProjectId) {
    const familyId = getFamilyId();
    if (!familyId || !projectId) {
      setMessage("Select a Sankalp first.");
      return;
    }

    try {
      const response = await apiGet(`/expenses/family/${familyId}/project/${projectId}`);
      setSelectedProjectId(projectId);
      setExpenses(response.data);
      setMessage(response.data.length ? "Loaded expenses." : "No expenses recorded for this Sankalp.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId || !selectedProjectId) {
      setMessage("Select a Sankalp first.");
      return;
    }

    try {
      const response = await apiPost(`/expenses/family/${familyId}/project/${selectedProjectId}`, {
        amountRupees: expenseAmountRupees,
        category: expenseCategory,
        vendorName: expenseVendorName,
        expenseDate,
        description: expenseDescription
      });

      if (billFile) {
        await uploadExpenseBill({ familyId, expenseId: response.data.id, file: billFile });
        setBillFile(null);
        setBillInputKey((current) => current + 1);
      }

      await Promise.all([loadExpenses(selectedProjectId), loadProjects()]);
      setMessage(billFile ? "Expense submitted with bill for approval." : "Expense submitted for approval.");
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

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read bill file."));
      reader.readAsDataURL(file);
    });
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

      if (!response.ok) {
        throw new Error(`Document download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = document.originalName || "expense-bill";
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function approveExpense(expenseId) {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      await apiPost(`/expenses/family/${familyId}/${expenseId}/approve`, {});
      setMessage("Expense approved and posted to Sankalp spending.");
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
        rejectionReason
      });
      setMessage("Expense rejected.");
      await Promise.all([loadExpenses(selectedProjectId), loadProjects()]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Sankalp"
        title="Sankalp"
        description="Every Sankalp records purpose, funds, progress, expenses, documents, photos, and decisions."
      />
      <section className="content-band">
        <h2>{canCreateProjects ? "Create Sankalp" : "Sadasya Sankalp View"}</h2>
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
              Sankalp Lead
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
            <button type="submit">Create Sankalp</button>
          </form>
        ) : (
          <>
            <p>
              A general Sadasya can follow every Sankalp, see the target, allocated amount, spent amount, funding gap, and current
              progress. Owners/admins create Sankalp and assign leads. Members contribute from Kosh and allocate their own wallet balance
              to the Sankalp they want to support.
            </p>
            <div className="button-row">
              <Link className="secondary-button" to="/treasury">
                Add or Allocate Kosh
              </Link>
              <button type="button" className="secondary-button" onClick={loadProjects}>
                Load Sankalp
              </button>
            </div>
          </>
        )}
        {canCreateProjects ? (
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={loadProjects}>
              Load Sankalp
            </button>
            {canLoadMembers ? (
              <button type="button" className="secondary-button" onClick={loadMembers}>
                Load Sadasya
              </button>
            ) : null}
          </div>
        ) : null}
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="content-band spaced-band">
        <h2>Sankalp</h2>
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
                  <span>Spent {formatMoney(project.spentRupees)}</span>
                  <span>Budget Gap {formatMoney(project.targetRemainingRupees)}</span>
                  <span>Available {formatMoney(project.availableToSpendRupees)}</span>
                  <span>{formatLabel(project.implementationStatus)}</span>
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
                      <option value="implementation">Implementation</option>
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
          <p>Load Sankalp or create your first Kul Sankalp.</p>
        )}
      </section>

      {canViewExpenses ? (
        <section className="content-band spaced-band">
          <h2>Sankalp Expenses</h2>
          {selectedProject ? (
            <p>
              Reviewing expenses for <strong>{selectedProject.title}</strong>.
            </p>
          ) : (
            <p>Select a Sankalp to load its expenses.</p>
          )}

          {selectedProject ? (
            <div className="mission-financials">
              <div>
                <span>Target</span>
                <strong>{formatMoney(selectedProject.targetBudgetRupees)}</strong>
              </div>
              <div>
                <span>Allocated</span>
                <strong>{formatMoney(selectedProject.allocatedRupees)}</strong>
              </div>
              <div>
                <span>Spent</span>
                <strong>{formatMoney(selectedProject.spentRupees)}</strong>
              </div>
              <div>
                <span>Available</span>
                <strong>{formatMoney(selectedProject.availableToSpendRupees)}</strong>
              </div>
              <div>
                <span>Budget Gap</span>
                <strong>{formatMoney(selectedProject.targetRemainingRupees)}</strong>
              </div>
            </div>
          ) : null}

          {selectedProject && !selectedProject.isFullyFunded ? (
            <p className="section-note">
              This Sankalp is still collecting contributions. Expenses can be submitted after the target budget is fully allocated.
            </p>
          ) : null}

          {canSubmitForSelectedProject ? (
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
              <label>
                Bill or Photo
                <input
                  key={billInputKey}
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => setBillFile(event.target.files?.[0] || null)}
                  type="file"
                />
              </label>
              <button type="submit">Submit Expense</button>
            </form>
          ) : null}

          {selectedProject && canSubmitForSelectedProject ? (
            <p className="section-note">Submitted expenses appear in Sankalp spent totals and wait for owner/admin approval.</p>
          ) : null}

          {canApproveExpenses && selectedProject ? (
            <label className="reject-reason">
              Rejection reason
              <input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
            </label>
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
                    {expense.billDocuments?.length ? (
                      <div className="document-list">
                        {expense.billDocuments.map((document) => (
                          <button key={document.id || document._id} type="button" onClick={() => downloadDocument(document)}>
                            {document.originalName}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <small>No bill attached.</small>
                    )}
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
