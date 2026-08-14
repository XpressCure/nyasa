import { IndianRupee, RefreshCw, Search, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";
import { loadCurrentSession } from "../lib/session.js";

function formatMoney(amountRupees = 0) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(amountRupees);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not supplied";
}

function localDateTimeValue(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function buildDraft(item) {
  return {
    amountRupees: String(item.confirmedAmountRupees ?? item.declaredAmountRupees),
    utr: item.utr || "",
    note: item.reconciliationNote || ""
  };
}

export function KoshReconciliationPage() {
  const [session, setSession] = useState(null);
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [actualBalanceRupees, setActualBalanceRupees] = useState("");
  const [asOfDate, setAsOfDate] = useState(localDateTimeValue());
  const [snapshotNote, setSnapshotNote] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberAmount, setMemberAmount] = useState("");
  const [memberReference, setMemberReference] = useState("");
  const [memberNote, setMemberNote] = useState("");
  const [reviewingCredit, setReviewingCredit] = useState(false);
  const familyId = localStorage.getItem("nyasa_family_id");

  useEffect(() => {
    loadCurrentSession().then(setSession).catch((error) => setNotice({ type: "error", text: error.message }));
    loadReconciliation();
    loadMembers();
  }, [familyId]);

  async function loadReconciliation() {
    if (!familyId) return;
    try {
      const response = await apiGet(`/bank-contributions/family/${familyId}/reconciliation`);
      setData(response.data);
      setDrafts(Object.fromEntries(response.data.recentDeclarations.map((item) => [item.id, buildDraft(item)])));
      if (response.data.latest) setActualBalanceRupees(String(response.data.latest.actualBankBalanceRupees));
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function loadMembers() {
    if (!familyId) return;
    try {
      const response = await apiGet(`/members/family/${familyId}`);
      setMembers(response.data
        .filter((member) => member.status === "active" && member.livingStatus !== "deceased")
        .sort((left, right) => left.displayName.localeCompare(right.displayName)));
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  function updateDraft(id, key, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  async function reconcileDeclaration(item) {
    const draft = drafts[item.id] || buildDraft(item);
    const amount = Number(draft.amountRupees);
    if (!Number.isFinite(amount) || amount < 0) {
      setNotice({ type: "error", text: "Enter the non-negative amount found in the bank statement." });
      return;
    }
    setBusyId(item.id);
    try {
      const response = await apiPost(`/bank-contributions/family/${familyId}/declarations/${item.id}/reconciliation`, {
        confirmedAmountRupees: amount,
        confirmedUtr: draft.utr,
        note: draft.note
      });
      const shortfall = response.data.walletShortfallRupees || 0;
      setNotice({
        type: shortfall > 0 ? "warning" : "success",
        text: shortfall > 0
          ? `${response.message} Further Sankalp allocation is blocked until the shortfall is resolved.`
          : response.message
      });
      await loadReconciliation();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusyId("");
    }
  }

  async function recordSnapshot(event) {
    event.preventDefault();
    setBusyId("snapshot");
    try {
      const response = await apiPost(`/bank-contributions/family/${familyId}/reconciliation`, {
        actualBankBalanceRupees: actualBalanceRupees,
        asOfDate: new Date(asOfDate).toISOString(),
        note: snapshotNote
      });
      setSnapshotNote("");
      setNotice({
        type: response.data.differenceRupees === 0 ? "success" : "warning",
        text: response.data.differenceRupees === 0
          ? "Bank balance and Nyas ledger match exactly."
          : `Snapshot saved. Difference to investigate: ${formatMoney(response.data.differenceRupees)}.`
      });
      await loadReconciliation();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusyId("");
    }
  }

  function prepareMemberCredit(event) {
    event.preventDefault();
    const amount = Number(memberAmount);
    if (!selectedMember) {
      setNotice({ type: "error", text: "Select the family member whose bank contribution you verified." });
      return;
    }
    if (!Number.isFinite(amount) || amount < 2000) {
      setNotice({ type: "error", text: "A Kosh contribution must be at least ₹2,000." });
      return;
    }
    setReviewingCredit(true);
  }

  async function creditMemberKosh() {
    const amount = Number(memberAmount);
    setBusyId("member-credit");
    try {
      const response = await apiPost(`/treasury/family/${familyId}/manual-contributions`, {
        memberId: selectedMember._id,
        amountRupees: amount,
        reference: memberReference.trim() || undefined,
        description: memberNote.trim() || "Kosh entry recorded by Kosh team"
      });
      setReviewingCredit(false);
      setSelectedMember(null);
      setMemberQuery("");
      setMemberAmount("");
      setMemberReference("");
      setMemberNote("");
      setNotice({ type: "success", text: response.message });
      await loadReconciliation();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusyId("");
    }
  }

  const passwordVerified = session?.authLevel === "password";
  const memberMatches = selectedMember || memberQuery.trim().length < 2
    ? []
    : members
      .filter((member) => member._id !== session?.member?.id)
      .filter((member) => member.displayName.toLowerCase().includes(memberQuery.trim().toLowerCase()))
      .slice(0, 6);

  return (
    <section>
      <PageHeader
        eyebrow="Kosh Pramukh"
        title="Kosh Reconciliation"
        description="Match member declarations with the bank statement. Corrections adjust the member wallet without changing the original declaration."
      />

      {notice ? <div className={`reconciliation-alert ${notice.type}`} role="status">{notice.text}<button type="button" onClick={() => setNotice(null)}>Close</button></div> : null}

      {!passwordVerified ? (
        <section className="transaction-security-callout">
          <div><strong>Password verification required</strong><span>Real Kosh corrections require a password-secured session.</span></div>
          <Link className="secondary-button" to="/profile">Verify in Parichay</Link>
        </section>
      ) : null}

      <section className="content-band reconciliation-panel">
        <div className="section-heading-row">
          <div><span className="section-kicker">Bank balance check</span><h2>Shared Kosh position</h2></div>
          <button className="icon-text-button secondary-button" type="button" onClick={loadReconciliation}><RefreshCw size={17} /> Refresh</button>
        </div>
        <div className="reconciliation-metrics">
          <div><span>Nyas expected balance</span><strong>{formatMoney(data?.currentExpectedBankBalanceRupees || 0)}</strong></div>
          <div><span>Last bank balance</span><strong>{formatMoney(data?.latest?.actualBankBalanceRupees || 0)}</strong></div>
          <div className={(data?.latest?.differenceRupees || 0) === 0 ? "matched" : "mismatch"}><span>Difference</span><strong>{formatMoney(data?.latest?.differenceRupees || 0)}</strong></div>
        </div>
        <form className="reconciliation-form" onSubmit={recordSnapshot}>
          <label>Actual bank balance<input type="number" min="0" step="0.01" value={actualBalanceRupees} onChange={(event) => setActualBalanceRupees(event.target.value)} required /></label>
          <label>Statement as of<input type="datetime-local" max={localDateTimeValue()} value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} required /></label>
          <label>Statement note<input value={snapshotNote} onChange={(event) => setSnapshotNote(event.target.value)} placeholder="Closing balance / statement period" /></label>
          <button type="submit" disabled={!passwordVerified || busyId === "snapshot"}>{busyId === "snapshot" ? "Saving..." : "Save balance snapshot"}</button>
        </form>
      </section>

      <section className="content-band spaced-band member-kosh-credit-panel">
        <div className="section-heading-row">
          <div>
            <span className="section-kicker">Verified bank contribution</span>
            <h2>Add to a member's Kosh</h2>
            <p className="section-note">Use this only after matching the member's transfer in the bank statement. The amount is credited immediately and recorded in the ledger and audit trail.</p>
          </div>
          <UserRoundPlus size={28} aria-hidden="true" />
        </div>
        <form className="member-kosh-credit-form" onSubmit={prepareMemberCredit}>
          <div className="member-credit-search">
            <label htmlFor="member-credit-search"><Search size={16} /> Living family member</label>
            <input
              id="member-credit-search"
              value={selectedMember?.displayName || memberQuery}
              onChange={(event) => { setMemberQuery(event.target.value); setSelectedMember(null); }}
              placeholder="Type at least 2 letters"
              autoComplete="off"
            />
            {memberMatches.length ? (
              <div className="member-credit-results" role="listbox" aria-label="Matching family members">
                {memberMatches.map((member) => (
                  <button key={member._id} type="button" onClick={() => { setSelectedMember(member); setMemberQuery(member.displayName); }}>
                    <strong>{member.displayName}</strong>
                    <span>{member.city || member.placeOfResidence || "Family member"}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label>Amount received<input type="number" min="2000" step="1" value={memberAmount} onChange={(event) => setMemberAmount(event.target.value)} placeholder="Minimum ₹2,000" required /></label>
          <label>Bank reference / UTR<input value={memberReference} onChange={(event) => setMemberReference(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 80))} placeholder="Optional" /></label>
          <label className="member-credit-note">Note<input value={memberNote} onChange={(event) => setMemberNote(event.target.value.slice(0, 280))} placeholder="Statement date or reason for entry" /></label>
          <button type="submit" disabled={!passwordVerified || busyId === "member-credit"}><IndianRupee size={17} /> Review Kosh credit</button>
        </form>
      </section>

      <section className="content-band spaced-band declaration-review-list">
        <div className="section-heading-row">
          <div><span className="section-kicker">Transaction matching</span><h2>Member declarations</h2><p className="section-note">Confirm the exact amount in the bank. Nyas posts only the difference as a correction.</p></div>
          <ShieldCheck size={28} aria-hidden="true" />
        </div>
        {data?.recentDeclarations?.length ? data.recentDeclarations.map((item) => {
          const draft = drafts[item.id] || buildDraft(item);
          const difference = Number(draft.amountRupees || 0) - Number(item.amountRupees || 0);
          return (
            <article className="declaration-review-card" key={item.id}>
              <div className="declaration-review-summary">
                <div><span>Member</span><strong>{item.member?.displayName || "Sadasya"}</strong></div>
                <div><span>Transfer time</span><strong>{formatDate(item.paidAt)}</strong></div>
                <div><span>Declared</span><strong>{formatMoney(item.declaredAmountRupees)}</strong></div>
                <div><span>Reference</span><strong>{item.utr || item.paymentReference}</strong></div>
                <div><span>From account</span><strong>{item.sourceAccountLast4 ? `Ending ${item.sourceAccountLast4}` : "Not supplied"}</strong></div>
                <em className={item.reconciliationStatus}>{item.reconciliationStatus.replaceAll("_", " ")}</em>
              </div>
              <div className="declaration-review-fields">
                <label>Amount found in bank<input type="number" min="0" step="0.01" value={draft.amountRupees} onChange={(event) => updateDraft(item.id, "amountRupees", event.target.value)} /></label>
                <label>Confirmed UTR<input value={draft.utr} onChange={(event) => updateDraft(item.id, "utr", event.target.value)} placeholder="Bank statement reference" /></label>
                <label>Reconciliation note<input value={draft.note} onChange={(event) => updateDraft(item.id, "note", event.target.value)} placeholder="Reason for any correction" /></label>
                <div className={`correction-preview ${difference < 0 ? "debit" : difference > 0 ? "credit" : "matched"}`}>
                  <span>Wallet correction</span>
                  <strong>{difference === 0 ? "No change" : `${difference > 0 ? "+" : "-"}${formatMoney(Math.abs(difference))}`}</strong>
                </div>
                <button type="button" onClick={() => reconcileDeclaration(item)} disabled={!passwordVerified || busyId === item.id}>{busyId === item.id ? "Confirming..." : "Confirm bank amount"}</button>
              </div>
            </article>
          );
        }) : <p className="empty-copy">No member declarations are waiting in this Kosh.</p>}
      </section>

      {reviewingCredit && selectedMember ? (
        <div className="member-credit-dialog-backdrop" role="presentation" onMouseDown={() => { if (busyId !== "member-credit") setReviewingCredit(false); }}>
          <section className="member-credit-dialog" role="dialog" aria-modal="true" aria-labelledby="member-credit-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="section-kicker">Final review</span>
            <h2 id="member-credit-title">Credit {selectedMember.displayName}'s Kosh?</h2>
            <strong className="member-credit-review-amount">{formatMoney(Number(memberAmount))}</strong>
            <p>This immediately increases the member's wallet and creates a permanent ledger and audit entry.</p>
            {memberReference ? <div className="member-credit-reference"><span>Bank reference</span><strong>{memberReference}</strong></div> : null}
            <div className="member-credit-dialog-actions">
              <button className="secondary-button" type="button" onClick={() => setReviewingCredit(false)} disabled={busyId === "member-credit"}>Change details</button>
              <button type="button" onClick={creditMemberKosh} disabled={busyId === "member-credit"}>{busyId === "member-credit" ? "Crediting..." : "Confirm and credit Kosh"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
