import { useEffect, useState } from "react";
import { apiDownload, apiGet, apiPost } from "../lib/api.js";

function formatMoney(amountRupees = 0) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(amountRupees);
}

function formatStatus(status = "") {
  return status.replaceAll("_", " ");
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      dataBase64: String(reader.result).split(",")[1]
    });
    reader.onerror = () => reject(new Error("Could not read the selected proof."));
    reader.readAsDataURL(file);
  });
}

function highestConfidence(claim) {
  return Math.max(0, ...claim.evidence.map((item) => item.analysis?.confidence || 0));
}

export function BankContributionPanel({ canReview, onLedgerChanged, passwordVerified, notify }) {
  const [config, setConfig] = useState(null);
  const [claims, setClaims] = useState([]);
  const [reviewClaims, setReviewClaims] = useState([]);
  const [amountRupees, setAmountRupees] = useState("2000");
  const [activeClaimId, setActiveClaimId] = useState("");
  const [smsText, setSmsText] = useState("");
  const [utr, setUtr] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reviewValues, setReviewValues] = useState({});
  const [bankSmsValues, setBankSmsValues] = useState({});

  const familyId = localStorage.getItem("nyasa_family_id");
  const activeClaim = claims.find((claim) => claim.id === activeClaimId);

  useEffect(() => {
    if (!familyId) return;
    Promise.all([
      apiGet(`/bank-contributions/family/${familyId}/config`),
      apiGet(`/bank-contributions/family/${familyId}/mine`),
      canReview ? apiGet(`/bank-contributions/family/${familyId}/review`) : Promise.resolve({ data: [] })
    ]).then(([configResponse, mineResponse, reviewResponse]) => {
      setConfig(configResponse.data);
      setClaims(mineResponse.data);
      setReviewClaims(reviewResponse.data);
      setActiveClaimId(mineResponse.data.find((claim) => ["awaiting_payment", "pending_review"].includes(claim.status))?.id || "");
    }).catch((error) => notify("error", "Bank contribution unavailable", error.message));
  }, [familyId, canReview]);

  async function refresh() {
    const [mineResponse, reviewResponse] = await Promise.all([
      apiGet(`/bank-contributions/family/${familyId}/mine`),
      canReview ? apiGet(`/bank-contributions/family/${familyId}/review`) : Promise.resolve({ data: [] })
    ]);
    setClaims(mineResponse.data);
    setReviewClaims(reviewResponse.data);
    setActiveClaimId(mineResponse.data.find((claim) => ["awaiting_payment", "pending_review"].includes(claim.status))?.id || "");
  }

  async function createClaim(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await apiPost(`/bank-contributions/family/${familyId}/claims`, { amountRupees });
      setClaims((current) => [response.data, ...current]);
      setActiveClaimId(response.data.id);
      notify("success", "Bank payment reference ready", response.message);
    } catch (error) {
      notify("error", "Could not start contribution", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitEvidence(event) {
    event.preventDefault();
    if (!activeClaim) return;
    setBusy(true);
    try {
      const proof = proofFile ? await fileToPayload(proofFile) : undefined;
      const response = await apiPost(`/bank-contributions/family/${familyId}/claims/${activeClaim.id}/evidence`, {
        type: proof ? "payment_screenshot" : "contributor_sms",
        smsText,
        amountRupees: activeClaim.requestedAmountRupees,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        utr: utr || undefined,
        proof
      });
      setClaims((current) => current.map((claim) => claim.id === response.data.id ? response.data : claim));
      setSmsText("");
      setUtr("");
      setPaidAt("");
      setProofFile(null);
      notify("success", "Proof sent for verification", response.message);
      await refresh();
    } catch (error) {
      notify("error", "Proof not submitted", error.message);
    } finally {
      setBusy(false);
    }
  }

  function updateReviewValue(claimId, field, value) {
    setReviewValues((current) => ({ ...current, [claimId]: { ...current[claimId], [field]: value } }));
  }

  async function decide(claim, decision) {
    const values = reviewValues[claim.id] || {};
    setBusy(true);
    try {
      const response = await apiPost(`/bank-contributions/family/${familyId}/claims/${claim.id}/${decision}`, {
        amountRupees: values.amountRupees || claim.requestedAmountRupees,
        utr: values.utr || claim.utr || undefined,
        note: values.note || (decision === "approve" ? "Evidence checked by Kosh Pramukh." : "")
      });
      notify("success", decision === "approve" ? "Wallet credited" : "Claim returned", response.message);
      await refresh();
      if (decision === "approve") await onLedgerChanged?.();
    } catch (error) {
      notify("error", "Review not completed", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function addBankSms(claim) {
    const sms = bankSmsValues[claim.id] || "";
    if (!sms.trim()) return;
    setBusy(true);
    try {
      const response = await apiPost(`/bank-contributions/family/${familyId}/claims/${claim.id}/evidence`, {
        type: "bank_sms",
        smsText: sms,
        amountRupees: claim.requestedAmountRupees,
        utr: reviewValues[claim.id]?.utr || claim.utr || undefined
      });
      setBankSmsValues((current) => ({ ...current, [claim.id]: "" }));
      notify("success", "Bank SMS added", response.message);
      await refresh();
    } catch (error) {
      notify("error", "Bank SMS not added", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function openProof(documentId) {
    try {
      const blob = await apiDownload(`/documents/family/${familyId}/${documentId}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      notify("error", "Proof could not be opened", error.message);
    }
  }

  if (!config?.enabled) return null;

  return (
    <>
      <section className="content-band spaced-band bank-contribution-panel">
        <div className="section-heading-row">
          <div>
            <span className="section-kicker">Direct bank contribution</span>
            <h2>Bank se Kosh mein Yogdaan</h2>
            <p className="section-note">Pay from your bank, then submit the debit SMS or receipt. Money appears in your wallet only after Kosh verification.</p>
          </div>
          <span className="verification-badge">Human verified</span>
        </div>

        {!passwordVerified ? <p className="bank-security-note">Secure your account in Parichay before submitting a real payment.</p> : null}
        {passwordVerified && !activeClaim ? (
          <form className="bank-start-form" onSubmit={createClaim}>
            <label>
              Contribution amount
              <input type="number" min={config.minimumAmountRupees} value={amountRupees} onChange={(event) => setAmountRupees(event.target.value)} />
              <small>Minimum {formatMoney(config.minimumAmountRupees)}</small>
            </label>
            <button type="submit" disabled={busy}>{busy ? "Preparing..." : "Create payment reference"}</button>
          </form>
        ) : null}

        {activeClaim ? (
          <div className="bank-claim-workflow">
            <div className="bank-payment-card">
              <span>Pay exactly</span>
              <strong>{formatMoney(activeClaim.requestedAmountRupees)}</strong>
              <dl>
                <div><dt>Account name</dt><dd>{config.accountName || "Ask Kosh Pramukh"}</dd></div>
                <div><dt>Account number</dt><dd>{config.accountNumber || "Not configured"}</dd></div>
                <div><dt>IFSC</dt><dd>{config.ifsc || "Not configured"}</dd></div>
                {config.upiId ? <div><dt>UPI</dt><dd>{config.upiId}</dd></div> : null}
                <div><dt>Nyas reference</dt><dd>{activeClaim.paymentReference}</dd></div>
              </dl>
            </div>
            <form className="bank-proof-form" onSubmit={submitEvidence}>
              <h3>Submit payment proof</h3>
              <label>UTR / RRN<input value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="Bank transaction reference" /></label>
              <label>Payment time<input type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label>
              <label>Paste debit SMS<textarea value={smsText} onChange={(event) => setSmsText(event.target.value)} placeholder="Paste the complete bank SMS here" /></label>
              <label>Receipt screenshot or PDF<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setProofFile(event.target.files?.[0] || null)} /></label>
              <button type="submit" disabled={busy || (!smsText && !proofFile)}>{busy ? "Submitting..." : "Send for Kosh verification"}</button>
            </form>
          </div>
        ) : null}

        {claims.length ? (
          <div className="bank-claim-history">
            <h3>My bank contributions</h3>
            {claims.map((claim) => (
              <button className={`bank-claim-summary ${claim.status}`} key={claim.id} type="button" onClick={() => ["awaiting_payment", "pending_review"].includes(claim.status) && setActiveClaimId(claim.id)}>
                <span>{claim.paymentReference}</span><strong>{formatMoney(claim.approvedAmountRupees || claim.requestedAmountRupees)}</strong><em>{formatStatus(claim.status)}</em>
                {claim.reviewerNote ? <small>{claim.reviewerNote}</small> : null}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {canReview ? (
        <section className="content-band spaced-band bank-review-panel">
          <div className="section-heading-row"><div><h2>Kosh Verification Desk</h2><p className="section-note">Automated checks assist you. Compare bank records and proof before approving.</p></div><button type="button" className="secondary-button" onClick={refresh}>Refresh</button></div>
          {reviewClaims.length ? reviewClaims.map((claim) => (
            <article className="bank-review-card" key={claim.id}>
              <header><div><span>{claim.paymentReference}</span><h3>{claim.member?.displayName || "Sadasya"}</h3></div><strong>{formatMoney(claim.requestedAmountRupees)}</strong><span className="confidence-meter">Checks {highestConfidence(claim)}%</span></header>
              <div className="evidence-list">
                {claim.evidence.map((evidence) => (
                  <div className="evidence-item" key={evidence.id}>
                    <strong>{formatStatus(evidence.type)}</strong>
                    {evidence.smsText ? <blockquote>{evidence.smsText}</blockquote> : null}
                    <span>UTR: {evidence.analysis?.extractedUtr || evidence.declaredUtr || "not found"}</span>
                    <span>Amount read: {evidence.analysis?.extractedAmountRupees ? formatMoney(evidence.analysis.extractedAmountRupees) : "manual check"}</span>
                    {evidence.analysis?.warnings?.map((warning) => <small key={warning}>{warning}</small>)}
                    {evidence.proofDocumentId ? <button type="button" className="secondary-button" onClick={() => openProof(evidence.proofDocumentId)}>Open proof</button> : null}
                  </div>
                ))}
              </div>
              <div className="bank-review-fields">
                <label>Final amount<input type="number" min={config.minimumAmountRupees} value={reviewValues[claim.id]?.amountRupees ?? claim.requestedAmountRupees} onChange={(event) => updateReviewValue(claim.id, "amountRupees", event.target.value)} /></label>
                <label>Verified UTR<input value={reviewValues[claim.id]?.utr ?? claim.utr ?? ""} onChange={(event) => updateReviewValue(claim.id, "utr", event.target.value)} /></label>
                <label>Reviewer note<input value={reviewValues[claim.id]?.note || ""} onChange={(event) => updateReviewValue(claim.id, "note", event.target.value)} /></label>
              </div>
              <div className="bank-sms-check">
                <label>Bank credit SMS (optional)<textarea value={bankSmsValues[claim.id] || ""} onChange={(event) => setBankSmsValues((current) => ({ ...current, [claim.id]: event.target.value }))} placeholder="Paste the credit SMS received on the registered Kosh phone" /></label>
                <button type="button" className="secondary-button" disabled={busy || !bankSmsValues[claim.id]?.trim()} onClick={() => addBankSms(claim)}>Run bank SMS checks</button>
              </div>
              <div className="button-row"><button type="button" disabled={busy || !passwordVerified} onClick={() => decide(claim, "approve")}>Verify and credit wallet</button><button type="button" className="danger-button" disabled={busy || !passwordVerified} onClick={() => decide(claim, "reject")}>Reject with reason</button></div>
            </article>
          )) : <p className="empty-copy">No bank contributions are waiting for review.</p>}
        </section>
      ) : null}
    </>
  );
}
