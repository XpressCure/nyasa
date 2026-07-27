import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";
import { hasPermission, loadCurrentSession } from "../lib/session.js";

function formatMoney(amountRupees = 0) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    style: "currency"
  }).format(amountRupees);
}

function formatRole(role = "") {
  return role.replaceAll("_", " ");
}

export function TreasuryPage() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [selfContributionAmountRupees, setSelfContributionAmountRupees] = useState("5000");
  const [selfContributionDescription, setSelfContributionDescription] = useState("Added to my Kosh wallet");
  const [amountRupees, setAmountRupees] = useState("5000");
  const [description, setDescription] = useState("Manual family contribution");
  const [contributionMemberId, setContributionMemberId] = useState("");
  const [allocationAmountRupees, setAllocationAmountRupees] = useState("1000");
  const [allocationProjectId, setAllocationProjectId] = useState("");
  const [allocationDescription, setAllocationDescription] = useState("Allocated from Kosh wallet");
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const canRecordManualContribution = hasPermission(session, "treasury.view_ledger");
  const canContribute = hasPermission(session, "treasury.contribute");
  const canAllocateFunds = hasPermission(session, "treasury.allocate_own");

  useEffect(() => {
    loadCurrentSession()
      .then(setSession)
      .catch((error) => setMessage(error.message));
  }, []);

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  async function loadTreasury() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      const [summaryResponse, transactionResponse] = await Promise.all([
        apiGet(`/treasury/family/${familyId}/summary`),
        apiGet(`/treasury/family/${familyId}/transactions`)
      ]);
      setSummary(summaryResponse.data);
      setTransactions(transactionResponse.data);
      setMessage("Treasury loaded.");
    } catch (error) {
      setMessage(error.message);
    }
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
      setMessage(response.data.length ? "Loaded missions for allocation." : "Create a mission before allocating funds.");
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
      setMessage("Loaded members for contribution entry.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function recordContribution(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      await apiPost(`/treasury/family/${familyId}/manual-contributions`, {
        amountRupees,
        description,
        memberId: contributionMemberId || undefined
      });
      setMessage("Manual contribution recorded.");
      await loadTreasury();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addToMyWallet(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      await apiPost(`/treasury/family/${familyId}/my-contributions`, {
        amountRupees: selfContributionAmountRupees,
        description: selfContributionDescription
      });
      setMessage("Money added to your wallet.");
      await loadTreasury();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function allocateToProject(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    if (!allocationProjectId) {
      setMessage("Choose a mission to allocate funds.");
      return;
    }

    try {
      await apiPost(`/treasury/family/${familyId}/allocations`, {
        projectId: allocationProjectId,
        amountRupees: allocationAmountRupees,
        description: allocationDescription
      });
      setMessage("Funds allocated to mission.");
      await loadTreasury();
      await loadProjects();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Kosh"
        title="Treasury"
        description="Contribute once, then allocate funds across family missions."
      />
      <div className="metric-grid">
        <article className="metric-card">
          <span>My Wallet Balance</span>
          <strong>{formatMoney(summary?.wallet.balanceRupees || 0)}</strong>
        </article>
        <article className="metric-card">
          <span>Available Treasury</span>
          <strong>{formatMoney(summary?.treasury.balanceRupees || 0)}</strong>
        </article>
        <article className="metric-card">
          <span>This Year</span>
          <strong>{formatMoney(summary?.contributionThisYearRupees || 0)}</strong>
        </article>
      </div>

      <section className="content-band">
        <h2>Add To My Wallet</h2>
        <p className="section-note">Members add money here first. Then they allocate wallet balance to a specific mission.</p>
        {canContribute ? (
          <form className="form-grid" onSubmit={addToMyWallet}>
            <label>
              Amount
              <input
                value={selfContributionAmountRupees}
                onChange={(event) => setSelfContributionAmountRupees(event.target.value)}
                type="number"
                min="1"
              />
            </label>
            <label>
              Description
              <input value={selfContributionDescription} onChange={(event) => setSelfContributionDescription(event.target.value)} />
            </label>
            <button type="submit">Add To My Wallet</button>
          </form>
        ) : (
          <p>Your current role cannot add money to a wallet.</p>
        )}
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadTreasury}>
            Load Treasury
          </button>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="content-band spaced-band">
        <h2>Admin Contribution Entry</h2>
        <p className="section-note">Owner/admin tool for recording offline or corrected contributions for a selected member.</p>
        {canRecordManualContribution ? (
          <form className="form-grid" onSubmit={recordContribution}>
            <label>
              Credit Wallet
              <select value={contributionMemberId} onChange={(event) => setContributionMemberId(event.target.value)}>
                <option value="">Current signed-in member</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.displayName} ({formatRole(member.role)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input value={amountRupees} onChange={(event) => setAmountRupees(event.target.value)} type="number" min="1" />
            </label>
            <label>
              Description
              <input value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <button type="submit">Record Contribution</button>
          </form>
        ) : (
          <p>Your current role cannot record contributions for other members.</p>
        )}
        <div className="button-row">
          {canRecordManualContribution ? (
            <button type="button" className="secondary-button" onClick={loadMembers}>
              Load Members
            </button>
          ) : null}
        </div>
      </section>

      <section className="content-band spaced-band">
        <h2>Allocate To Mission</h2>
        <p className="section-note">Allocations spend the wallet of the current signed-in member shown in the sidebar.</p>
        {canAllocateFunds ? (
          <form className="form-grid" onSubmit={allocateToProject}>
            <label>
              Mission
              <select value={allocationProjectId} onChange={(event) => setAllocationProjectId(event.target.value)}>
                <option value="">Select mission</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} ({formatMoney(project.allocatedRupees)} allocated)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                value={allocationAmountRupees}
                onChange={(event) => setAllocationAmountRupees(event.target.value)}
                type="number"
                min="1"
              />
            </label>
            <label>
              Description
              <input value={allocationDescription} onChange={(event) => setAllocationDescription(event.target.value)} />
            </label>
            <button type="submit">Allocate Funds</button>
          </form>
        ) : (
          <p>Your current role cannot allocate funds.</p>
        )}
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadProjects}>
            Load Missions
          </button>
        </div>
      </section>

      <section className="content-band spaced-band">
        <h2>Ledger</h2>
        {transactions.length ? (
          <div className="list-stack">
            {transactions.map((transaction) => (
              <div className="ledger-row" key={transaction.id}>
                <div>
                  <strong>{formatMoney(transaction.amountRupees)}</strong>
                  <span>
                    {transaction.type} - {transaction.direction} - {transaction.status}
                  </span>
                  {transaction.description ? <small>{transaction.description}</small> : null}
                </div>
                <div className="ledger-member">
                  <strong>{transaction.member?.displayName || "Family"}</strong>
                  <span>{formatRole(transaction.member?.role || "")}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Load treasury to see ledger transactions.</p>
        )}
      </section>
    </section>
  );
}
