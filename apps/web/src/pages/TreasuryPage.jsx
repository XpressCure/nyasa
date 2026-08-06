import { useEffect, useRef, useState } from "react";
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

const MIN_WALLET_TOP_UP_RUPEES = 2000;

function getFundingNeed(project) {
  return Math.max(project?.targetRemainingRupees || 0, 0);
}

function getContributionPolicy(project) {
  if (!project?.budgetRequired || !project.targetBudgetRupees) {
    return null;
  }

  const maxPercent = project.targetBudgetRupees > 200000 ? 5 : 10;
  const minRupees = Math.max(Math.ceil(project.targetBudgetRupees * 0.02), 500);
  const maxRupees = Math.floor(project.targetBudgetRupees * (maxPercent / 100));
  const remainingRupees = getFundingNeed(project);
  const effectiveMinRupees = Math.min(minRupees, maxRupees);

  return {
    maxPercent,
    minRupees: Math.min(effectiveMinRupees, remainingRupees || effectiveMinRupees),
    maxRupees: Math.min(maxRupees, remainingRupees || maxRupees)
  };
}

function getDefaultAllocationAmount(project, preferredAmount = 0) {
  const policy = getContributionPolicy(project);
  const remainingRupees = getFundingNeed(project);
  const upperLimit = policy?.maxRupees || remainingRupees || preferredAmount;
  const lowerLimit = policy?.minRupees || 1;
  const requestedAmount = Number(preferredAmount || 0);
  const amount = requestedAmount > 0 ? requestedAmount : lowerLimit;

  return Math.max(Math.min(amount, upperLimit), Math.min(lowerLimit, upperLimit));
}

function getContributionHint(project) {
  const policy = getContributionPolicy(project);
  if (!policy) return "No funding limit is set for this Sankalp yet.";
  return `Minimum ${formatMoney(policy.minRupees)}, maximum ${formatMoney(policy.maxRupees)} per member. Above INR 2L, max is 5%; otherwise max is 10%.`;
}

function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = window.document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    window.document.body.appendChild(script);
  });
}

export function TreasuryPage() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("3m");
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState("");
  const [analyticsDateTo, setAnalyticsDateTo] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [selfContributionAmountRupees, setSelfContributionAmountRupees] = useState("5000");
  const [selfContributionDescription, setSelfContributionDescription] = useState("Added to my Kosh wallet");
  const [amountRupees, setAmountRupees] = useState("5000");
  const [description, setDescription] = useState("Manual Kul contribution");
  const [contributionMemberId, setContributionMemberId] = useState("");
  const [allocationAmountRupees, setAllocationAmountRupees] = useState("1000");
  const [allocationProjectId, setAllocationProjectId] = useState("");
  const [allocationDescription, setAllocationDescription] = useState("Allocated from Kosh wallet");
  const [reductionAmounts, setReductionAmounts] = useState({});
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState(null);
  const allocationSectionRef = useRef(null);
  const canRecordManualContribution = hasPermission(session, "treasury.view_ledger");
  const canContribute = hasPermission(session, "treasury.contribute");
  const canAllocateFunds = hasPermission(session, "treasury.allocate_own");
  const canReverseLedger = ["owner", "admin"].includes(session?.member?.role);
  const selectedAllocationProject = projects.find((project) => project.id === allocationProjectId);

  useEffect(() => {
    loadCurrentSession()
      .then(setSession)
      .catch((error) => setMessage(error.message));
    loadTreasury();
    loadProjects();
    loadMembers();
    loadKoshAnalytics();
  }, []);

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
    setNotice(null);

    if (action === "allocate") {
      window.setTimeout(() => allocationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
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
        apiGet(`/treasury/family/${familyId}/transactions`)
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
      const liveProjects = response.data.filter((project) => !project.isDraft && (!project.budgetRequired || getFundingNeed(project) > 0));
      setProjects(liveProjects);
      setAllocationProjectId((current) => current || liveProjects[0]?.id || "");
      setAllocationAmountRupees((current) => current || (liveProjects[0] ? String(getDefaultAllocationAmount(liveProjects[0], 0)) : ""));
      setMessage(liveProjects.length ? "Loaded live Sankalp for allocation." : "Publish a Sankalp before allocating funds.");
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
      setMembers(response.data.filter((member) => (member.livingStatus || "living") === "living"));
      setMessage("Loaded living Sadasya for contribution entry.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function recordContribution(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a Kul first.");
      return;
    }

    try {
      await apiPost(`/treasury/family/${familyId}/manual-contributions`, {
        amountRupees,
        description,
        memberId: contributionMemberId || undefined
      });
      notify("success", "Contribution recorded", "The selected Sadasya wallet has been credited.");
      await Promise.all([loadTreasury(), loadKoshAnalytics()]);
    } catch (error) {
      notify("error", "Contribution not recorded", error.message);
    }
  }

  async function addToMyWallet(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    const topUpAmount = Number(selfContributionAmountRupees || 0);
    if (!familyId) {
      notify("error", "Kul not selected", "Create or select a Kul before adding money.");
      return;
    }

    if (topUpAmount < MIN_WALLET_TOP_UP_RUPEES) {
      notify("error", "Amount too small", `Minimum wallet top-up is ${formatMoney(MIN_WALLET_TOP_UP_RUPEES)}.`);
      return;
    }

    try {
      setMessage("Creating secure payment order...");
      const orderResponse = await apiPost(`/payments/family/${familyId}/razorpay-orders`, {
        amountRupees: selfContributionAmountRupees,
        description: selfContributionDescription
      });
      await loadRazorpayCheckout();

      const paymentOrder = orderResponse.data;
      const checkout = new window.Razorpay({
        key: paymentOrder.razorpayKeyId,
        amount: paymentOrder.amountPaise,
        currency: paymentOrder.currency,
        name: "Nyasa",
        description: paymentOrder.description,
        order_id: paymentOrder.providerOrderId,
        prefill: {
          name: paymentOrder.user.fullName,
          email: paymentOrder.user.email
        },
        notes: {
          familyId,
          paymentOrderId: paymentOrder.paymentOrderId
        },
        handler: async (response) => {
          try {
            await apiPost(`/payments/family/${familyId}/razorpay-payments/verify`, {
              paymentOrderId: paymentOrder.paymentOrderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            notify(
              "success",
              "धन्यवाद! आपका योगदान सुरक्षित है",
              "राशि आपके व्यक्तिगत Nyas Wallet में जुड़ गई है। अब आप इसे अपनी पसंद के Sankalp को समर्पित कर सकते हैं।",
              {
                action: "allocate",
                amount: formatMoney(topUpAmount),
                balance: formatMoney(walletBalanceRupees + topUpAmount),
                celebration: "wallet",
                eyebrow: "सहयोग • विश्वास • संकल्प",
                primaryLabel: "Sankalp को आवंटित करें"
              }
            );
            await Promise.all([loadTreasury(), loadKoshAnalytics()]);
          } catch (error) {
            notify("error", "Payment verification failed", error.message);
          }
        },
        modal: {
          ondismiss: () => notify("warning", "Payment not completed", "The Razorpay window was closed. No money was added to your wallet.")
        },
        theme: {
          color: "#17211c"
        }
      });

      checkout.on("payment.failed", (response) => {
        notify(
          "error",
          "Payment failed",
          response?.error?.description || "Razorpay could not complete the payment. Please try again or use another payment method."
        );
      });
      checkout.open();
    } catch (error) {
      notify("error", "Could not start payment", error.message);
    }
  }

  async function allocateToProject(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) {
      notify("error", "Kul not selected", "Create or select a Kul before allocating funds.");
      return;
    }

    if (!allocationProjectId) {
      notify("error", "Choose a Sankalp", "Select the Sankalp where this wallet money should go.");
      return;
    }

    try {
      const projectTitle = selectedAllocationProject?.title || "चुने गए Sankalp";
      const response = await apiPost(`/treasury/family/${familyId}/allocations`, {
        projectId: allocationProjectId,
        amountRupees: allocationAmountRupees,
        description: allocationDescription
      });
      const acceptedAmountRupees = Number(response.data?.amountPaise || 0) / 100 || Number(allocationAmountRupees);
      notify("success", "आपके सहयोग से Sankalp आगे बढ़ा", response.message || "आपकी राशि सफलतापूर्वक Sankalp को आवंटित हो गई है।", {
        amount: formatMoney(acceptedAmountRupees),
        balance: formatMoney(Math.max(walletBalanceRupees - acceptedAmountRupees, 0)),
        celebration: "allocation",
        eyebrow: "एक परिवार • एक विश्वास • एक प्रयास",
        primaryLabel: "बहुत सुंदर",
        projectTitle
      });
      await Promise.all([loadTreasury(), loadProjects(), loadKoshAnalytics()]);
    } catch (error) {
      notify("error", "Allocation not done", error.message);
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
        eyebrow="Kosh"
        title="Kosh"
        description="Contribute once, then allocate funds across Kul Sankalp."
      />
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
      <div className="metric-grid">
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
      </div>

      <section className="content-band">
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
      </section>

      <section className="content-band">
        <h2>Add To My Wallet</h2>
        <p className="section-note">Sadasya add money through Razorpay first. After verification, wallet balance can be allocated to a Sankalp.</p>
        {canContribute ? (
          <form className="form-grid" onSubmit={addToMyWallet}>
            <label>
              Amount
              <input
                value={selfContributionAmountRupees}
                onChange={(event) => setSelfContributionAmountRupees(event.target.value)}
                type="number"
                min={MIN_WALLET_TOP_UP_RUPEES}
              />
              <small>Minimum wallet top-up is {formatMoney(MIN_WALLET_TOP_UP_RUPEES)}.</small>
            </label>
            <label>
              Description
              <input value={selfContributionDescription} onChange={(event) => setSelfContributionDescription(event.target.value)} />
            </label>
            <button type="submit">Pay With Razorpay</button>
          </form>
        ) : (
          <p>Your current role cannot add money to a wallet.</p>
        )}
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadTreasury}>
            Load Kosh
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
              <input value={amountRupees} onChange={(event) => setAmountRupees(event.target.value)} type="number" min={MIN_WALLET_TOP_UP_RUPEES} />
              <small>Minimum wallet top-up is {formatMoney(MIN_WALLET_TOP_UP_RUPEES)}.</small>
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
              Load Sadasya
            </button>
          ) : null}
        </div>
      </section>

      <section className="content-band spaced-band" ref={allocationSectionRef}>
        <h2>Allocate To Sankalp</h2>
        <p className="section-note">Allocations spend the wallet of the current signed-in member shown in the sidebar.</p>
        {canAllocateFunds ? (
          <form className="form-grid" onSubmit={allocateToProject}>
            <label>
              Sankalp
              <select
                value={allocationProjectId}
                onChange={(event) => {
                  const project = projects.find((item) => item.id === event.target.value);
                  setAllocationProjectId(event.target.value);
                  setAllocationAmountRupees(project ? String(getDefaultAllocationAmount(project, allocationAmountRupees)) : "");
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
            Load Sankalp
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
      </section>
    </section>
  );
}
