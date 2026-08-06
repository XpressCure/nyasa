import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
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
import { loadCurrentSession } from "../lib/session.js";

const MIN_WALLET_TOP_UP_RUPEES = 2000;
const presetAmounts = [2000, 5100, 11000, 21000, 51000];

function formatMoney(amountRupees = 0) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amountRupees || 0);
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

function loadCashfreeCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const script = window.document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Cashfree Checkout."));
    window.document.body.appendChild(script);
  });
}

function getContributionHint(project) {
  const policy = getContributionPolicy(project);
  if (!policy) return "This Sankalp does not have a funding limit yet.";
  if (policy.maxRupees <= 0) return `Your ${policy.maxPercent}% individual limit for this Sankalp is complete. Choose another Sankalp.`;
  return `Your total so far is ${formatMoney(policy.memberAllocatedRupees)}. You can add ${formatMoney(policy.minRupees)} to ${formatMoney(policy.maxRupees)} now.`;
}

export function ContributePage() {
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [amountRupees, setAmountRupees] = useState("2100");
  const [allocationProjectId, setAllocationProjectId] = useState("");
  const [allocationAmountRupees, setAllocationAmountRupees] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState(null);
  const [paymentProviders, setPaymentProviders] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const allocationSectionRef = useRef(null);
  const cashfreeReturnHandledRef = useRef(false);

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!session?.familyId) return;
    loadPaymentProviders(session.familyId);
  }, [session?.familyId]);

  useEffect(() => {
    if (!session?.familyId || cashfreeReturnHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const providerOrderId = params.get("order_id");
    if (params.get("cashfree_return") !== "1" || !providerOrderId) return;

    cashfreeReturnHandledRef.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    confirmCashfreeReturn(session.familyId, providerOrderId);
  }, [session?.familyId]);

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  async function loadPage() {
    setMessage("");

    try {
      const currentSession = await loadCurrentSession();
      setSession(currentSession);

      if (!currentSession?.familyId) {
        setMessage("Sign in once, then you can add Yogdaan to Kosh.");
        return;
      }

      const [summaryResponse, projectsResponse] = await Promise.all([
        apiGet(`/treasury/family/${currentSession.familyId}/summary`),
        apiGet(`/projects/family/${currentSession.familyId}`)
      ]);
      const fundingProjects = rankFundingProjects(projectsResponse.data);
      setSummary(summaryResponse.data);
      setProjects(fundingProjects);
      setAllocationProjectId((current) => fundingProjects.some((project) => project.id === current) ? current : fundingProjects[0]?.id || "");
      setAllocationAmountRupees((current) => current || (fundingProjects[0] ? String(getDefaultAllocationAmount(fundingProjects[0], amountRupees)) : ""));
      return fundingProjects;
    } catch (error) {
      setMessage(error.message);
      return [];
    }
  }

  async function loadPaymentProviders(familyId) {
    try {
      const response = await apiGet(`/payments/family/${familyId}/providers`);
      setPaymentProviders(response.data);
    } catch (error) {
      setPaymentProviders({ cashfree: { enabled: false }, razorpay: { enabled: false } });
      setMessage(error.message);
    }
  }

  async function confirmCashfreeReturn(familyId, providerOrderId) {
    setIsPaying(true);
    setMessage("Cashfree payment received. Verifying it securely...");
    try {
      const response = await apiPost(`/payments/family/${familyId}/cashfree-orders/status`, { providerOrderId });
      const creditedAmount = response.data.amountRupees;
      setPaymentComplete(true);
      const refreshedProjects = await loadPage();
      const selectedProject = refreshedProjects?.find((project) => project.id === allocationProjectId) || refreshedProjects?.[0];
      setAllocationAmountRupees(String(selectedProject ? getDefaultAllocationAmount(selectedProject, creditedAmount) : creditedAmount));
      setNotice({
        amount: formatMoney(creditedAmount),
        body: "Your Cashfree payment is verified and safely available in your personal Kosh wallet. Choose a Sankalp to carry it forward.",
        primaryLabel: "Choose a Sankalp",
        title: "Yogdaan received with gratitude",
        type: "success"
      });
      setMessage(`Done: ${formatMoney(creditedAmount)} has been added to your Kosh wallet.`);
    } catch (error) {
      setMessage(error.message);
      setNotice({ body: error.message, title: "Payment needs attention", type: "error" });
    } finally {
      setIsPaying(false);
    }
  }

  function selectProject(project, preferredAmount = allocationAmountRupees || amountRupees) {
    setAllocationProjectId(project?.id || "");
    setAllocationAmountRupees(project ? String(getDefaultAllocationAmount(project, preferredAmount)) : "");
  }

  function closeNotice() {
    setNotice(null);
  }

  function continueFromNotice() {
    if (notice?.nextProject) selectProject(notice.nextProject, summary?.wallet?.balanceRupees || amountRupees);
    setNotice(null);
    window.setTimeout(() => allocationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function startPayment(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    const topUpAmount = Number(amountRupees || 0);

    if (!familyId) {
      setMessage("Please sign in before adding Yogdaan.");
      return;
    }

    if (topUpAmount < MIN_WALLET_TOP_UP_RUPEES) {
      setMessage(`Minimum wallet top-up is ${formatMoney(MIN_WALLET_TOP_UP_RUPEES)}.`);
      return;
    }

    if (paymentProviders?.cashfree?.enabled) {
      await startCashfreePayment(familyId, topUpAmount);
      return;
    }

    if (!paymentProviders?.razorpay?.enabled) {
      setMessage("No online payment provider is available right now. Please contact the Nyas Kosh team.");
      return;
    }

    try {
      setIsPaying(true);
      setMessage("Creating secure Razorpay payment...");
      const orderResponse = await apiPost(`/payments/family/${familyId}/razorpay-orders`, {
        amountRupees,
        description: "Nyasa Kosh Yogdaan"
      });
      await loadRazorpayCheckout();

      const paymentOrder = orderResponse.data;
      const checkout = new window.Razorpay({
        key: paymentOrder.razorpayKeyId,
        amount: paymentOrder.amountPaise,
        currency: paymentOrder.currency,
        name: "Nyasa Trust",
        description: paymentOrder.description,
        order_id: paymentOrder.providerOrderId,
        prefill: {
          name: paymentOrder.user.fullName,
          email: paymentOrder.user.email,
          contact: paymentOrder.user.phone
        },
        notes: {
          familyId,
          paymentOrderId: paymentOrder.paymentOrderId,
          purpose: "nyasa_kosh_yogdaan"
        },
        handler: async (response) => {
          try {
            await apiPost(`/payments/family/${familyId}/razorpay-payments/verify`, {
              paymentOrderId: paymentOrder.paymentOrderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            setPaymentComplete(true);
            const selectedProject = projects.find((project) => project.id === allocationProjectId) || projects[0];
            setAllocationAmountRupees(String(selectedProject ? getDefaultAllocationAmount(selectedProject, paymentOrder.amountRupees) : paymentOrder.amountRupees));
            setMessage(`Done: ${formatMoney(paymentOrder.amountRupees)} has been added to your Kosh wallet. Now choose the Sankalp you want to support.`);
            setNotice({
              amount: formatMoney(paymentOrder.amountRupees),
              body: "Your payment is verified and safely available in your personal Kosh wallet. Choose a Sankalp to carry it forward.",
              primaryLabel: "Choose a Sankalp",
              title: "Yogdaan received with gratitude",
              type: "success"
            });
            setIsPaying(false);
            await loadPage();
          } catch (error) {
            setIsPaying(false);
            setMessage(error.message);
            setNotice({ body: error.message, title: "Payment needs attention", type: "error" });
          }
        },
        modal: {
          backdropclose: false,
          confirm_close: true,
          escape: false,
          ondismiss: () => {
            setIsPaying(false);
            setMessage("Payment was not completed. Nothing was deducted by Nyas.");
          }
        },
        theme: {
          color: "#17211c"
        },
        retry: {
          enabled: true,
          max_count: 3
        }
      });

      checkout.on("payment.failed", (response) => {
        setIsPaying(false);
        const failureMessage = response?.error?.description || "Razorpay could not complete this payment. Please try another payment method.";
        setMessage(failureMessage);
        setNotice({ body: failureMessage, title: "Payment was not completed", type: "error" });
      });
      checkout.open();
    } catch (error) {
      setIsPaying(false);
      setMessage(error.message);
      setNotice({ body: error.message, title: "Could not start payment", type: "error" });
    }
  }

  async function startCashfreePayment(familyId, topUpAmount) {
    try {
      setIsPaying(true);
      setMessage("Creating secure Cashfree payment...");
      const orderResponse = await apiPost(`/payments/family/${familyId}/cashfree-orders`, {
        amountRupees: topUpAmount,
        description: "Nyasa Kosh Yogdaan",
        returnPath: "/contribute"
      });
      await loadCashfreeCheckout();
      const cashfree = window.Cashfree({ mode: orderResponse.data.mode });
      const checkoutResult = await cashfree.checkout({
        paymentSessionId: orderResponse.data.paymentSessionId,
        redirectTarget: "_self"
      });
      if (checkoutResult?.error) {
        setIsPaying(false);
        const errorMessage = checkoutResult.error.message || "Please try again.";
        setMessage(errorMessage);
        setNotice({ body: errorMessage, title: "Cashfree checkout could not open", type: "error" });
      }
    } catch (error) {
      setIsPaying(false);
      setMessage(error.message);
      setNotice({ body: error.message, title: "Could not start Cashfree payment", type: "error" });
    }
  }

  async function allocateToSankalp(event) {
    event.preventDefault();
    const familyId = getFamilyId();

    if (!familyId || !allocationProjectId) {
      setMessage("Choose a Sankalp before allocating.");
      return;
    }

    try {
      setIsAllocating(true);
      const response = await apiPost(`/treasury/family/${familyId}/allocations`, {
        projectId: allocationProjectId,
        amountRupees: allocationAmountRupees,
        description: "Allocated from QR Yogdaan flow"
      });
      const acceptedAmountRupees = Number(response.data?.amountPaise || 0) / 100 || Number(allocationAmountRupees);
      const updatedProjects = rankFundingProjects(projects.map((project) => (
        project.id === allocationProjectId ? projectAfterAllocation(project, acceptedAmountRupees) : project
      )));
      const nextProject = recommendNextFundingProject(updatedProjects, allocationProjectId);
      setPaymentComplete(true);
      setMessage(response.message || "Done: Yogdaan allocated to Sankalp.");
      setNotice({
        amount: formatMoney(acceptedAmountRupees),
        body: nextProject
          ? `${nextProject.title} is now the closest eligible Sankalp to its funding goal.`
          : "Your allocation is complete. There is no other eligible Sankalp awaiting your support right now.",
        nextProject,
        primaryLabel: nextProject ? "See next Sankalp" : "Done for now",
        projectTitle: projects.find((project) => project.id === allocationProjectId)?.title,
        title: "Your Sankalp moved forward",
        type: "success"
      });
      await loadPage();
    } catch (error) {
      setMessage(error.message);
      setNotice({ body: error.message, title: "Allocation was not completed", type: "error" });
    } finally {
      setIsAllocating(false);
    }
  }

  if (!session?.user) {
    return (
      <section>
        <PageHeader
          eyebrow="Nyasa Yogdaan"
          title="Kosh Yogdaan"
          description="Sign in with your name first. After that you can add money and choose the Sankalp you want to support."
        />
        <section className="content-band contribute-hero-band">
          <h2>Scan se seedha Yogdaan</h2>
          <p className="section-note">QR code should point to this page: {window.location.origin}/contribute</p>
          <Link className="secondary-button" to="/login?next=/contribute">
            Sign in and contribute
          </Link>
          {message ? <p className="form-message">{message}</p> : null}
        </section>
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        eyebrow="Nyasa Yogdaan"
        title="Kosh Yogdaan"
        description="Add money once, then decide which Sankalp should receive your support."
      />

      {notice ? (
        <div className={`feedback-overlay ${notice.type === "success" ? "is-celebrating" : ""}`} role="presentation">
          <div className={`feedback-dialog ${notice.type} ${notice.type === "success" ? "celebration allocation" : ""}`} role="alertdialog" aria-modal="true">
            {notice.type === "success" ? (
              <div className="feedback-celebration-stage" aria-hidden="true">
                <div className="celebration-halo" />
                <div className="celebration-seal">N</div>
                <div className="celebration-petals">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
              </div>
            ) : null}
            <span className="feedback-eyebrow">Yogdaan • Vishwas • Sankalp</span>
            <h2>{notice.title}</h2>
            {notice.amount ? <strong className="feedback-amount">{notice.amount}</strong> : null}
            {notice.projectTitle ? <div className="feedback-project"><span>Allocated to</span><strong>{notice.projectTitle}</strong></div> : null}
            <p>{notice.body}</p>
            <div className="feedback-actions">
              <button type="button" onClick={continueFromNotice}>{notice.primaryLabel}</button>
              {notice.nextProject ? <button type="button" className="feedback-secondary-action" onClick={closeNotice}>Finish for now</button> : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="content-band contribute-hero-band">
        <div>
          <h2>1. Add money to your Kosh wallet</h2>
          <p className="section-note">
            Signed in as <strong>{session.user.fullName}</strong>. Current wallet balance is{" "}
            <strong>{formatMoney(summary?.wallet?.balanceRupees || 0)}</strong>.
          </p>
        </div>
        {paymentProviders?.cashfree?.enabled && paymentProviders.cashfree.mode === "sandbox" ? (
          <p className="payment-test-banner" role="status"><strong>Cashfree Sandbox</strong> Test payments only. No real money will move.</p>
        ) : null}
        <form className="contribution-panel" onSubmit={startPayment}>
          <div className="amount-preset-row">
            {presetAmounts.map((amount) => (
              <button type="button" key={amount} className={String(amount) === String(amountRupees) ? "active" : ""} onClick={() => setAmountRupees(String(amount))}>
                {formatMoney(amount)}
              </button>
            ))}
          </div>
          <label>
            Custom amount
            <input
              type="number"
              min={MIN_WALLET_TOP_UP_RUPEES}
              value={amountRupees}
              onChange={(event) => setAmountRupees(event.target.value)}
            />
            <small>Minimum wallet top-up is {formatMoney(MIN_WALLET_TOP_UP_RUPEES)}.</small>
          </label>
          <button type="submit" disabled={isPaying || !paymentProviders}>
            {isPaying
              ? "Opening secure payment..."
              : paymentProviders?.cashfree?.enabled ? "Continue With Cashfree" : "Continue With Razorpay"}
          </button>
        </form>
      </section>

      <section className={`content-band spaced-band ${paymentComplete ? "workspace-opened" : ""}`} ref={allocationSectionRef}>
        <div className="section-heading-row">
          <div>
            <h2>2. Allocate to a Sankalp</h2>
            <p className="section-note">You may allocate now, or keep money in your wallet and decide later from Kosh.</p>
          </div>
          <Link className="secondary-button" to="/treasury">
            Open Kosh
          </Link>
        </div>

        {projects.length ? (
          <>
            <SankalpFundingCarousel
              formatMoney={formatMoney}
              onSelect={selectProject}
              projects={projects}
              selectedProjectId={allocationProjectId}
            />
            <form className="form-grid" onSubmit={allocateToSankalp}>
              <label>
                Sankalp
                <select
                  value={allocationProjectId}
                  onChange={(event) => {
                    const project = projects.find((item) => item.id === event.target.value);
                    selectProject(project);
                  }}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title} - needs {formatMoney(getFundingNeed(project))}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount to allocate
                <input
                  type="number"
                  min={getContributionPolicy(projects.find((project) => project.id === allocationProjectId))?.minRupees || 1}
                  max={getContributionPolicy(projects.find((project) => project.id === allocationProjectId))?.maxRupees || undefined}
                  value={allocationAmountRupees}
                  onChange={(event) => setAllocationAmountRupees(event.target.value)}
                />
                <small>{getContributionHint(projects.find((project) => project.id === allocationProjectId))}</small>
              </label>
              <button type="submit" disabled={isAllocating || getContributionPolicy(projects.find((project) => project.id === allocationProjectId))?.maxRupees <= 0}>
                {isAllocating ? "Allocating securely..." : "Allocate to Sankalp"}
              </button>
            </form>
          </>
        ) : (
          <p className="empty-copy">No Sankalp currently needs funding. Your Yogdaan can remain in your Kosh wallet.</p>
        )}
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="content-band spaced-band">
        <h2>QR sharing link</h2>
        <p className="section-note">Use this URL while creating the QR image for family sharing.</p>
        <div className="copy-box">
          <span>{window.location.origin}/contribute</span>
          <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/contribute`)}>
            Copy
          </button>
        </div>
      </section>
    </section>
  );
}
