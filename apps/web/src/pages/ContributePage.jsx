import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";
import { loadCurrentSession } from "../lib/session.js";

const presetAmounts = [501, 1001, 2100, 5100, 11000];

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

function getFundingNeed(project) {
  return Math.max(project.targetRemainingRupees || 0, 0);
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

  useEffect(() => {
    loadPage();
  }, []);

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
      const fundingProjects = projectsResponse.data.filter(
        (project) => !project.isDraft && project.budgetRequired && getFundingNeed(project) > 0
      );
      setSummary(summaryResponse.data);
      setProjects(fundingProjects);
      setAllocationProjectId((current) => current || fundingProjects[0]?.id || "");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function startPayment(event) {
    event.preventDefault();
    const familyId = getFamilyId();

    if (!familyId) {
      setMessage("Please sign in before adding Yogdaan.");
      return;
    }

    try {
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
          email: paymentOrder.user.email
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
            setAllocationAmountRupees(String(paymentOrder.amountRupees));
            setMessage("Payment verified. Now choose the Sankalp you want to support.");
            await loadPage();
          } catch (error) {
            setMessage(error.message);
          }
        },
        modal: {
          ondismiss: () => setMessage("Payment was not completed.")
        },
        theme: {
          color: "#17211c"
        }
      });

      checkout.open();
    } catch (error) {
      setMessage(error.message);
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
      const response = await apiPost(`/treasury/family/${familyId}/allocations`, {
        projectId: allocationProjectId,
        amountRupees: allocationAmountRupees,
        description: "Allocated from QR Yogdaan flow"
      });
      setMessage(response.message || "Yogdaan allocated to Sankalp.");
      await loadPage();
    } catch (error) {
      setMessage(error.message);
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

      <section className="content-band contribute-hero-band">
        <div>
          <h2>1. Add money to your Kosh wallet</h2>
          <p className="section-note">
            Signed in as <strong>{session.user.fullName}</strong>. Current wallet balance is{" "}
            <strong>{formatMoney(summary?.wallet?.balanceRupees || 0)}</strong>.
          </p>
        </div>
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
            <input type="number" min="1" value={amountRupees} onChange={(event) => setAmountRupees(event.target.value)} />
          </label>
          <button type="submit">Pay Securely</button>
        </form>
      </section>

      <section className={`content-band spaced-band ${paymentComplete ? "workspace-opened" : ""}`}>
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
            <div className="contribute-project-grid">
              {projects.map((project) => (
                <button
                  type="button"
                  className={allocationProjectId === project.id ? "contribute-project-card active" : "contribute-project-card"}
                  key={project.id}
                  onClick={() => {
                    setAllocationProjectId(project.id);
                    setAllocationAmountRupees(String(Math.min(Number(allocationAmountRupees || amountRupees || 0), getFundingNeed(project)) || getFundingNeed(project)));
                  }}
                >
                  <strong>{project.title}</strong>
                  <span>Needed {formatMoney(getFundingNeed(project))}</span>
                  <small>{project.fundingPercent || 0}% funded</small>
                </button>
              ))}
            </div>
            <form className="form-grid" onSubmit={allocateToSankalp}>
              <label>
                Sankalp
                <select value={allocationProjectId} onChange={(event) => setAllocationProjectId(event.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title} - needs {formatMoney(getFundingNeed(project))}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount to allocate
                <input type="number" min="1" value={allocationAmountRupees} onChange={(event) => setAllocationAmountRupees(event.target.value)} />
              </label>
              <button type="submit">Allocate to Sankalp</button>
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
