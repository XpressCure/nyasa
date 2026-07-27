import { useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

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
  const [amountRupees, setAmountRupees] = useState("5000");
  const [description, setDescription] = useState("Manual family contribution");
  const [message, setMessage] = useState("");

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
        description
      });
      setMessage("Manual contribution recorded.");
      await loadTreasury();
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
          <span>Wallet Balance</span>
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
        <h2>Manual Contribution</h2>
        <form className="form-grid" onSubmit={recordContribution}>
          <label>
            Amount
            <input value={amountRupees} onChange={(event) => setAmountRupees(event.target.value)} type="number" min="1" />
          </label>
          <label>
            Description
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button type="submit">Record Contribution</button>
          <button type="button" className="secondary-button" onClick={loadTreasury}>
            Load Treasury
          </button>
        </form>
        {message ? <p className="form-message">{message}</p> : null}
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
