import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { BankContributionPanel } from "../components/BankContributionPanel.jsx";
import { SankalpFundingCarousel } from "../components/SankalpFundingCarousel.jsx";
import { apiGet, apiPost } from "../lib/api.js";
import {
  getContributionPolicy,
  getDefaultAllocationAmount,
  getFundingNeed,
  projectAfterAllocation,
  rankFundingProjects,
  recommendNextFundingProject
} from "../lib/sankalpFunding.js";
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

function getContributionHint(project) {
  const policy = getContributionPolicy(project);
  if (!policy) return "No funding limit is set for this Sankalp yet.";
  const contributorText = `${project.contributorCount || 0} ${project.contributorCount === 1 ? "member has" : "members have"} contributed so far; names remain private.`;
  if (getFundingNeed(project) <= 0) {
    return `This Sankalp is fully funded. ${contributorText}`;
  }
  if (policy.memberRemainingLimitRupees <= 0) {
    return `You have contributed ${formatMoney(policy.memberAllocatedRupees)} and reached your ${policy.maxPercent}% individual limit. ${contributorText}`;
  }
  return `Your contribution: ${formatMoney(policy.memberAllocatedRupees)}. You can add up to ${formatMoney(policy.maxRupees)} more. ${contributorText}`;
}

export function TreasuryPage({ simple = false }) {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("3m");
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState("");
  const [analyticsDateTo, setAnalyticsDateTo] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allocationAmountRupees, setAllocationAmountRupees] = useState("1000");
  const [allocationProjectId, setAllocationProjectId] = useState("");
  const [allocationDescription, setAllocationDescription] = useState("Allocated from Kosh wallet");
  const [reductionAmounts, setReductionAmounts] = useState({});
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const allocationSectionRef = useRef(null);
  const canAllocateFunds = hasPermission(session, "treasury.allocate_own");
  const canReverseLedger = ["owner", "admin"].includes(session?.member?.role);
  const passwordVerified = session?.authLevel === "password";
  const selectedAllocationProject = projects.find((project) => project.id === allocationProjectId);
  const selectedContributionPolicy = getContributionPolicy(selectedAllocationProject);
  const allocationBlocked = Boolean(selectedContributionPolicy && selectedContributionPolicy.maxRupees <= 0);
  const personalLimitReached = Boolean(selectedContributionPolicy && selectedContributionPolicy.memberRemainingLimitRupees <= 0);

  useEffect(() => {
    loadCurrentSession()
      .then(setSession)
      .catch((error) => setMessage(error.message));
    loadTreasury();
    loadProjects();
    if (!simple) loadKoshAnalytics();
  }, [simple]);

  useEffect(() => {
    if (!notice) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setNotice(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [notice]);

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  function notify(type, title, body, details = {}) {
    const readableBody = body || title;
    setMessage(readableBody);
    setNotice({ body: readableBody, title, type, ...details });
  }

  function closeNotice() {
    setNotice(null);
  }

  function continueFromNotice() {
    const action = notice?.action;
    const nextProject = notice?.nextProject;
    setNotice(null);

    if (nextProject) selectAllocationProject(nextProject, walletBalanceRupees);

    if (action === "allocate" || action === "next_sankalp") {
      window.setTimeout(() => allocationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }

  function selectAllocationProject(project, preferredAmount = allocationAmountRupees) {
    setAllocationProjectId(project?.id || "");
    setAllocationAmountRupees(project ? String(getDefaultAllocationAmount(project, preferredAmount)) : "");
  }

  async function loadTreasury() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a Kul first.");
      return;
    }

    try {
      const [summaryResponse, transactionResponse] = await Promise.all([
        apiGet(`/treasury/family/${familyId}/summary`),
        simple ? Promise.resolve({ data: [] }) : apiGet(`/treasury/family/${familyId}/transactions`)
      ]);
      setSummary(summaryResponse.data);
      setTransactions(transactionResponse.data);
      setMessage("Kosh loaded.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadKoshAnalytics() {
    const familyId = getFamilyId();
    if (!familyId) return;

    const params = new URLSearchParams();
    if (analyticsDateFrom || analyticsDateTo) {
      if (analyticsDateFrom) params.set("dateFrom", analyticsDateFrom);
      if (analyticsDateTo) params.set("dateTo", analyticsDateTo);
    } else {
      params.set("range", analyticsRange);
    }

    try {
      const response = await apiGet(`/treasury/family/${familyId}/analytics?${params.toString()}`);
      setAnalytics(response.data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadProjects() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a Kul first.");
      return;
    }

    try {
      const response = await apiGet(`/projects/family/${familyId}`);
      const liveProjects = rankFundingProjects(response.data);
      setProjects(liveProjects);
      setAllocationProjectId((current) => liveProjects.some((project) => project.id === current) ? current : liveProjects[0]?.id || "");
      setAllocationAmountRupees((current) => current || (liveProjects[0] ? String(getDefaultAllocationAmount(liveProjects[0], 0)) : ""));
      setMessage(liveProjects.length ? "Loaded live Sankalp for allocation." : "Publish a Sankalp before allocating funds.");
      return liveProjects;
    } catch (error) {
      setMessage(error.message);
      return [];
    }
  }

  async function allocateToProject(event) {
    event.preventDefault();
    if (isAllocating) return;
    const familyId = getFamilyId();
    if (!familyId) {
      notify("error", "Kul not selected", "Create or select a Kul before allocating funds.");
      return;
    }

    if (!allocationProjectId) {
      notify("error", "Choose a Sankalp", "Select the Sankalp where this wallet money should go.");
      return;
    }

    if (allocationBlocked) {
      notify(
        "warning",
        personalLimitReached ? "Individual contribution limit reached" : "Sankalp is fully funded",
        personalLimitReached
          ? `You have already contributed ${formatMoney(selectedContributionPolicy.memberAllocatedRupees)} to this Sankalp. Please support another Sankalp.`
          : "This Sankalp has received its full target amount. Please support another Sankalp."
      );
      return;
    }

    try {
      setIsAllocating(true);
      const projectTitle = selectedAllocationProject?.title || "चुने गए Sankalp";
      const response = await apiPost(`/treasury/family/${familyId}/allocations`, {
        projectId: allocationProjectId,
        amountRupees: allocationAmountRupees,
        description: allocationDescription
      });
      const acceptedAmountRupees = Number(response.data?.amountPaise || 0) / 100 || Number(allocationAmountRupees);
      const updatedProjects = rankFundingProjects(projects.map((project) => (
        project.id === allocationProjectId ? projectAfterAllocation(project, acceptedAmountRupees) : project
      )));
      const nextProject = recommendNextFundingProject(updatedProjects, allocationProjectId);
      notify("success", "आपके सहयोग से Sankalp आगे बढ़ा", nextProject
        ? `${nextProject.title} अब अपने लक्ष्य के सबसे करीब है। आप चाहें तो इसे अगला सहयोग दे सकते हैं।`
        : response.message || "आपकी राशि सफलतापूर्वक Sankalp को आवंटित हो गई है।", {
        action: nextProject ? "next_sankalp" : undefined,
        amount: formatMoney(acceptedAmountRupees),
        balance: formatMoney(Math.max(walletBalanceRupees - acceptedAmountRupees, 0)),
        celebration: "allocation",
        eyebrow: "एक परिवार • एक विश्वास • एक प्रयास",
        nextProject,
        primaryLabel: nextProject ? "अगला Sankalp देखें" : "बहुत सुंदर",
        projectTitle
      });
      await Promise.all([loadTreasury(), loadProjects(), loadKoshAnalytics()]);
    } catch (error) {
      notify("error", "Allocation not done", error.message);
    } finally {
      setIsAllocating(false);
    }
  }

  async function reduceAllocation(transactionId) {
    const familyId = getFamilyId();
    const amountRupees = reductionAmounts[transactionId];

    if (!familyId || !amountRupees) {
      notify("error", "Return amount needed", "Enter the amount to return from Sankalp allocation.");
      return;
    }

    try {
      const response = await apiPost(`/treasury/family/${familyId}/allocations/${transactionId}/reduce`, {
        amountRupees,
        description: "Reduced Sankalp allocation"
      });
      setReductionAmounts((current) => ({ ...current, [transactionId]: "" }));
      await Promise.all([loadTreasury(), loadProjects(), loadKoshAnalytics()]);
      notify("success", "Returned to wallet", response.message || "Allocation reduced and returned to wallet.");
    } catch (error) {
      notify("error", "Return failed", error.message);
    }
  }

  async function reverseTransaction(transactionId) {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      const response = await apiPost(`/treasury/family/${familyId}/transactions/${transactionId}/reverse`, {});
      await Promise.all([loadTreasury(), loadProjects(), loadKoshAnalytics()]);
      notify("success", "Kosh entry reversed", response.message || "This ledger entry has been reversed.");
    } catch (error) {
      notify("error", "Reverse failed", error.message);
    }
  }

  const walletBalanceRupees = summary?.wallet?.balanceRupees || 0;
  const availableKoshRupees = summary?.treasury?.balanceRupees || 0;
  const thisYearRupees = summary?.contributionThisYearRupees || 0;

  return (
    <section>
      <PageHeader
        eyebrow={simple ? "Yogdaan" : "Kosh"}
        title={simple ? "Add and allot your contribution" : "Kosh"}
        description={simple ? "A simple path from your bank account to the Sankalp you care about." : "Contribute once, then allocate funds across Kul Sankalp."}
      />
      {message && !notice ? <p className="status-message" role="status">{message}</p> : null}
      {notice ? (
        <div className={`feedback-overlay ${notice.celebration ? "is-celebrating" : ""}`} role="presentation">
          <div
            className={`feedback-dialog ${notice.type} ${notice.celebration ? `celebration ${notice.celebration}` : ""}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="kosh-feedback-title"
          >
            {notice.celebration ? (
              <div className="feedback-celebration-stage" aria-hidden="true">
                <div className="celebration-halo" />
                <div className="celebration-seal">ॐ</div>
                <div className="celebration-petals">
                  {Array.from({ length: 12 }, (_, index) => (
                    <i key={index} />
                  ))}
                </div>
              </div>
            ) : null}
            <span className="feedback-eyebrow">
              {notice.eyebrow || (notice.type === "success" ? "Completed" : notice.type === "warning" ? "Please check" : "Needs attention")}
            </span>
            <h2 id="kosh-feedback-title">{notice.title}</h2>
            {notice.amount ? <strong className="feedback-amount">{notice.amount}</strong> : null}
            {notice.projectTitle ? (
              <div className="feedback-project">
                <span>Sankalp</span>
                <strong>{notice.projectTitle}</strong>
              </div>
            ) : null}
            <p>{notice.body}</p>
            {notice.balance ? (
              <p className="feedback-balance">
                Wallet में शेष <strong>{notice.balance}</strong>
              </p>
            ) : null}
            <div className="feedback-actions">
              <button type="button" onClick={continueFromNotice}>
                {notice.primaryLabel || "ठीक है"}
              </button>
              {notice.action ? (
                <button type="button" className="feedback-secondary-action" onClick={closeNotice}>
                  बाद में
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {simple ? (
        <section className="contribution-steps" aria-label="Contribution steps">
          <div><span>1</span><strong>Send money</strong><small>Use the official QR or UPI link.</small></div>
          <div><span>2</span><strong>Record it</strong><small>Enter the same amount in Nyas.</small></div>
          <div><span>3</span><strong>Choose Sankalp</strong><small>Allot any available wallet balance.</small></div>
        </section>
      ) : null}
      <section className="wallet-spotlight">
        <div>
          <span>My Kosh Wallet</span>
          <strong>{formatMoney(walletBalanceRupees)}</strong>
          <p>This is your personal wallet balance. Add money here first, then allocate it to a Sankalp.</p>
        </div>
        <div className="wallet-spotlight-metrics">
          <span>Available Kosh: {formatMoney(availableKoshRupees)}</span>
          <span>This year: {formatMoney(thisYearRupees)}</span>
        </div>
      </section>
      {walletBalanceRupees < 0 ? (
        <section className="transaction-security-callout wallet-shortfall-callout" role="alert">
          <div>
            <strong>Kosh wallet correction pending</strong>
            <span>Your bank-confirmed contributions are {formatMoney(Math.abs(walletBalanceRupees))} below money already allocated. New allocations are paused until this shortfall is resolved.</span>
          </div>
        </section>
      ) : null}
      {!simple ? <div className="metric-grid">
        <article className="metric-card">
          <span>My Wallet Balance</span>
          <strong>{formatMoney(walletBalanceRupees)}</strong>
        </article>
        <article className="metric-card">
          <span>Available Kosh</span>
          <strong>{formatMoney(availableKoshRupees)}</strong>
        </article>
        <article className="metric-card">
          <span>This Year</span>
          <strong>{formatMoney(thisYearRupees)}</strong>
        </article>
      </div> : null}

      {session && !passwordVerified ? (
        <section className="transaction-security-callout" aria-live="polite">
          <div>
            <strong>Secure Kosh access required</strong>
            <span>Set your password in Parichay before adding, allocating, returning, or correcting real money.</span>
          </div>
          <Link className="secondary-button" to="/profile">Secure my account</Link>
        </section>
      ) : null}

      {!simple ? <section className="content-band">
        <div className="section-heading-row">
          <div>
            <h2>Kosh Darshan</h2>
            <p className="section-note">Track collected family money, what is still in Kosh, what is allotted, and what has been spent.</p>
          </div>
          <button type="button" className="secondary-button" onClick={loadKoshAnalytics}>
            Refresh
          </button>
        </div>
        <div className="kosh-filter-row">
          <label>
            Quick range
            <select
              value={analyticsRange}
              onChange={(event) => {
                setAnalyticsRange(event.target.value);
                setAnalyticsDateFrom("");
                setAnalyticsDateTo("");
              }}
            >
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="12m">Last 12 months</option>
            </select>
          </label>
          <label>
            From
            <input type="date" value={analyticsDateFrom} onChange={(event) => setAnalyticsDateFrom(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={analyticsDateTo} onChange={(event) => setAnalyticsDateTo(event.target.value)} />
          </label>
          <button type="button" onClick={loadKoshAnalytics}>
            Apply Dates
          </button>
        </div>
        <div className="mission-financials kosh-analytics-grid">
          <div>
            <span>Total collected</span>
            <strong>{formatMoney(analytics?.totalCollected?.amountRupees || 0)}</strong>
          </div>
          <div>
            <span>Allotted to Sankalp</span>
            <strong>{formatMoney(analytics?.totalAllocated?.amountRupees || 0)}</strong>
          </div>
          <div>
            <span>Still in Kosh</span>
            <strong>{formatMoney(analytics?.unallocated?.amountRupees || 0)}</strong>
          </div>
          <div>
            <span>In implementation</span>
            <strong>{formatMoney(analytics?.implementationAllocated?.amountRupees || 0)}</strong>
          </div>
          <div>
            <span>Spent</span>
            <strong>{formatMoney(analytics?.totalSpent?.amountRupees || 0)}</strong>
          </div>
        </div>
      </section> : null}

      <BankContributionPanel
        compact={simple}
        notify={notify}
        onLedgerChanged={loadTreasury}
        passwordVerified={passwordVerified}
      />

      <section className="content-band spaced-band" ref={allocationSectionRef}>
        <div className="section-heading-row">
          <div>
            <h2>Allocate To Sankalp</h2>
            <p className="section-note">Start with the Sankalp closest to its goal, or slide to choose another.</p>
          </div>
          <strong className="allocation-wallet-pill">Wallet {formatMoney(walletBalanceRupees)}</strong>
        </div>
        {canAllocateFunds && passwordVerified ? (
          <>
            {projects.length ? (
              <SankalpFundingCarousel
                formatMoney={formatMoney}
                onSelect={selectAllocationProject}
                projects={projects}
                selectedProjectId={allocationProjectId}
              />
            ) : <p className="empty-copy">No live Sankalp currently needs funding.</p>}
            <form className="form-grid sankalp-allocation-form" onSubmit={allocateToProject}>
            <label>
              Sankalp
              <select
                value={allocationProjectId}
                onChange={(event) => {
                  const project = projects.find((item) => item.id === event.target.value);
                  selectAllocationProject(project);
                }}
              >
                <option value="">Select Sankalp</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} ({formatMoney(getFundingNeed(project))} remaining)
                  </option>
                ))}
              </select>
              {selectedAllocationProject ? <small>{getContributionHint(selectedAllocationProject)}</small> : null}
            </label>
            <label>
              Amount
              <input
                value={allocationAmountRupees}
                onChange={(event) => setAllocationAmountRupees(event.target.value)}
                type="number"
                min={getContributionPolicy(selectedAllocationProject)?.minRupees || 1}
                max={getContributionPolicy(selectedAllocationProject)?.maxRupees || undefined}
                disabled={allocationBlocked}
              />
            </label>
            <label>
              Description
              <input value={allocationDescription} onChange={(event) => setAllocationDescription(event.target.value)} />
            </label>
            <button type="submit" disabled={isAllocating || allocationBlocked}>
              {isAllocating ? "Allocating..." : personalLimitReached ? "Individual limit reached" : allocationBlocked ? "Sankalp fully funded" : "Allocate Funds"}
            </button>
            </form>
          </>
        ) : canAllocateFunds ? (
          <p>Secure your account in Parichay to allocate wallet money.</p>
        ) : (
          <p>Your current role cannot allocate funds.</p>
        )}
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadProjects}>
            Load Sankalp
          </button>
        </div>
      </section>

      {!simple ? <section className="content-band spaced-band">
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
                  {transaction.project?.title ? (
                    <small><strong>Sankalp:</strong> {transaction.project.title}</small>
                  ) : null}
                  {transaction.type === "contribution" && transaction.source ? (
                    <small>
                      <strong>Received via:</strong>{" "}
                      {transaction.source.replaceAll("_", " ")}
                    </small>
                  ) : null}
                  {transaction.description ? <small>{transaction.description}</small> : null}
                </div>
                <div className="ledger-member">
                  <strong>{transaction.member?.displayName || "Kul"}</strong>
                  <span>{formatRole(transaction.member?.role || "")}</span>
                </div>
                {transaction.type === "allocation" && transaction.direction === "debit" && transaction.status === "posted" ? (
                  <div className="row-actions allocation-adjustment">
                    <input
                      min="1"
                      placeholder="Return amount"
                      type="number"
                      value={reductionAmounts[transaction.id] || ""}
                      onChange={(event) => setReductionAmounts((current) => ({ ...current, [transaction.id]: event.target.value }))}
                    />
                    <button type="button" className="secondary-button" onClick={() => reduceAllocation(transaction.id)}>
                      Return to Wallet
                    </button>
                  </div>
                ) : null}
                {canReverseLedger && transaction.status === "posted" ? (
                  <button type="button" className="secondary-button" onClick={() => reverseTransaction(transaction.id)}>
                    Reverse Entry
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p>Load Kosh to see ledger transactions.</p>
        )}
      </section> : (
        <section className="simple-kosh-footer">
          <p>Want to see every transaction and Kosh report?</p>
          <Link className="secondary-button" to="/treasury">Open detailed Kosh</Link>
        </section>
      )}
    </section>
  );
}
