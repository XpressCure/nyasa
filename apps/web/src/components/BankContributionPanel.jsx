import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/api.js";

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

function newDeclarationToken() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const smallNumbers = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tensNumbers = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(value) {
  if (value < 20) return smallNumbers[value];
  if (value < 100) return `${tensNumbers[Math.floor(value / 10)]}${value % 10 ? ` ${smallNumbers[value % 10]}` : ""}`;
  return `${smallNumbers[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${belowThousand(value % 100)}` : ""}`;
}

function amountInIndianWords(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) return "Enter a valid amount";
  let remaining = Math.floor(numericAmount);
  if (remaining === 0) return "Zero Rupees Only";
  const parts = [];
  const groups = [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]];
  groups.forEach(([size, label]) => {
    const groupValue = Math.floor(remaining / size);
    if (groupValue) {
      parts.push(`${belowThousand(groupValue)} ${label}`);
      remaining %= size;
    }
  });
  if (remaining) parts.push(belowThousand(remaining));
  return `${parts.join(" ")} Rupees Only`;
}

export function BankContributionPanel({ compact = false, onLedgerChanged, passwordVerified, notify }) {
  const [config, setConfig] = useState(null);
  const [declarations, setDeclarations] = useState([]);
  const [amountRupees, setAmountRupees] = useState("");
  const [paidAt, setPaidAt] = useState(localDateTimeValue());
  const [utr, setUtr] = useState("");
  const [sourceAccountLast4, setSourceAccountLast4] = useState("");
  const [note, setNote] = useState("");
  const [attested, setAttested] = useState(false);
  const [declarationToken, setDeclarationToken] = useState(newDeclarationToken);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const familyId = localStorage.getItem("nyasa_family_id");
  const usableUpiId = config?.upiId && config.upiId.includes("@") && !config.upiId.includes("YOUR_")
    ? config.upiId
    : "";
  const amountValue = Number(amountRupees);
  const amountIsValid = Number.isFinite(amountValue) && amountValue >= (config?.minimumAmountRupees || 0);
  const shouldPreferBankTransfer = amountIsValid && amountValue > 2000 && config?.accountNumber && config?.ifsc;
  const suggestedAmounts = [2000, 5000, 10000];

  const upiLink = useMemo(() => {
    const amount = Number(amountRupees);
    if (!usableUpiId || !Number.isFinite(amount) || amount < (config?.minimumAmountRupees || 0)) return "";
    const params = new URLSearchParams({
      pa: usableUpiId,
      pn: config.accountName || "Nyas Kul Kosh",
      am: amount.toFixed(2),
      cu: "INR",
      tn: "Nyas Kul Kosh contribution"
    });
    return `upi://pay?${params.toString()}`;
  }, [config, usableUpiId, amountRupees]);

  const flexibleUpiLink = useMemo(() => {
    if (!usableUpiId) return "";
    const params = new URLSearchParams({
      pa: usableUpiId,
      pn: config.accountName || "Nyas Kul Kosh",
      cu: "INR",
      tn: "Nyas Kul Kosh contribution"
    });
    return `upi://pay?${params.toString()}`;
  }, [config, usableUpiId]);

  useEffect(() => {
    if (!familyId) return;
    loadData();
  }, [familyId]);

  async function loadData() {
    try {
      const [configResponse, mineResponse] = await Promise.all([
        apiGet(`/bank-contributions/family/${familyId}/config`),
        apiGet(`/bank-contributions/family/${familyId}/mine`)
      ]);
      setConfig(configResponse.data);
      setDeclarations(mineResponse.data);
    } catch (error) {
      notify("error", "Kosh contribution unavailable", error.message);
    }
  }

  async function copyBankDetail(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      notify("success", `${label} copied`, "Paste it in your bank app to add the Nyas account as beneficiary.");
    } catch {
      notify("warning", `Could not copy ${label}`, "Press and hold the value above to copy it manually.");
    }
  }

  function reviewDeclaration(event) {
    event.preventDefault();
    if (!amountIsValid) {
      notify("warning", "Check the amount", `Please enter at least ${formatMoney(config.minimumAmountRupees)} before continuing.`);
      return;
    }
    if (!attested) {
      notify("warning", "Confirmation needed", "Please confirm that this amount has actually been transferred to the Nyas bank account.");
      return;
    }
    setReviewing(true);
  }

  async function recordDeclaration() {
    setReviewing(false);
    setBusy(true);
    try {
      const response = await apiPost(`/bank-contributions/family/${familyId}/declarations`, {
        amountRupees,
        paidAt: new Date(paidAt).toISOString(),
        utr: utr || undefined,
        sourceAccountLast4: sourceAccountLast4 || undefined,
        note,
        attested,
        declarationToken
      });
      setAmountRupees("");
      setPaidAt(localDateTimeValue());
      setUtr("");
      setSourceAccountLast4("");
      setNote("");
      setAttested(false);
      setDeclarationToken(newDeclarationToken());
      await Promise.all([loadData(), onLedgerChanged?.()]);
      notify("success", "धन्यवाद! आपका सहयोग दर्ज हो गया", response.message, {
        action: "allocate",
        amount: formatMoney(response.data.amountRupees),
        celebration: "wallet",
        eyebrow: "विश्वास • पारदर्शिता • संकल्प",
        primaryLabel: "अब संकल्प चुनें"
      });
    } catch (error) {
      notify("error", "Contribution not recorded", error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!config?.enabled) return null;

  return (
    <section className="content-band spaced-band trust-contribution-panel">
      <div className="section-heading-row">
        <div>
          <span className="section-kicker">विश्वास आधारित योगदान</span>
          <h2>Bank से अपने Kosh Wallet में जोड़ें</h2>
          <p className="section-note">QR या UPI से राशि भेजें, फिर वही राशि नीचे दर्ज करें।</p>
        </div>
        <span className="trust-badge">Kul trust system</span>
      </div>

      <div className="direct-payment-layout">
        <div className="bank-destination-card">
          {config.qrImageUrl ? <img className="bank-qr-image" src={config.qrImageUrl} alt="Nyas Kul Kosh payment QR code" /> : (
            <div className="bank-qr-placeholder"><strong>QR</strong><span>Add BANK_QR_IMAGE_URL</span></div>
          )}
          <div>
            <span>Send money to</span>
            <h3>{config.accountName || "Nyas Kul Kosh"}</h3>
            <dl>
              {config.accountNumber ? <div><dt>Account</dt><dd>{config.accountNumber}</dd></div> : null}
              {config.ifsc ? <div><dt>IFSC</dt><dd>{config.ifsc}</dd></div> : null}
              {usableUpiId ? <div><dt>UPI</dt><dd>{usableUpiId}</dd></div> : null}
            </dl>
            <label className="upi-amount-field">
              Amount to transfer
              <div className="upi-amount-suggestions" aria-label="Suggested contribution amounts">
                {suggestedAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={amountValue === amount ? "selected" : ""}
                    onClick={() => setAmountRupees(String(amount))}
                  >
                    {formatMoney(amount)}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={config.minimumAmountRupees}
                step="1"
                inputMode="numeric"
                value={amountRupees}
                onChange={(event) => setAmountRupees(event.target.value)}
                placeholder={`Enter any amount from ${formatMoney(config.minimumAmountRupees)}`}
                required
              />
              <small>₹2,000 is the minimum, not the maximum. For more than ₹2,000, select your linked bank account instead of UPI Lite.</small>
            </label>
            {shouldPreferBankTransfer ? (
              <div className="bank-transfer-recommendation">
                <span>Recommended for {formatMoney(amountValue)}</span>
                <strong>Transfer through your bank app</strong>
                <p>Some UPI apps apply a ₹2,000 risk limit. Add this account as a beneficiary and use IMPS, NEFT, or bank transfer.</p>
                <div>
                  <button type="button" onClick={() => copyBankDetail(config.accountNumber, "Account number")}>Copy account number</button>
                  <button type="button" onClick={() => copyBankDetail(config.ifsc, "IFSC")}>Copy IFSC</button>
                </div>
              </div>
            ) : null}
            <div className="button-row">
              {flexibleUpiLink ? <a className={shouldPreferBankTransfer ? "secondary-button" : "primary-link-button"} href={flexibleUpiLink}>{shouldPreferBankTransfer ? "Try UPI anyway" : "Open any UPI app"}</a> : null}
              {upiLink ? <a className="secondary-button" href={upiLink}>Pay exact {formatMoney(Number(amountRupees))}</a> : null}
              {config.paymentLink ? <a className="secondary-button" href={config.paymentLink} target="_blank" rel="noreferrer">Open bank link</a> : null}
            </div>
            {flexibleUpiLink ? <small className="upi-direct-note">Use this on the same phone instead of scanning the QR from Gallery. Enter any amount in your UPI app and select a linked bank account for amounts above ₹2,000.</small> : null}
          </div>
        </div>

        {passwordVerified ? (
          <form className="self-declaration-form" onSubmit={reviewDeclaration}>
            <h3>I have transferred this amount</h3>
            <div className="transferred-amount-summary">
              <span>Amount transferred</span>
              <strong>{amountRupees ? formatMoney(Number(amountRupees)) : "Enter the amount beside the QR"}</strong>
            </div>
            <label>Date and time<input type="datetime-local" max={localDateTimeValue()} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} required /></label>
            {compact ? (
              <details className="optional-contribution-details">
                <summary>Add payment reference (optional)</summary>
                <label>UTR / transaction reference<input value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="Helps match the bank entry" /></label>
                <label>Sending account last 4 digits<input inputMode="numeric" maxLength="4" pattern="[0-9]{4}" value={sourceAccountLast4} onChange={(event) => setSourceAccountLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" /></label>
                <label>Note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Bank or transfer note" /></label>
              </details>
            ) : (
              <>
                <label>UTR / transaction reference <span>(recommended)</span><input value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="Helps identify the bank entry" /></label>
                <label>Sending account last 4 digits <span>(optional)</span><input inputMode="numeric" maxLength="4" pattern="[0-9]{4}" value={sourceAccountLast4} onChange={(event) => setSourceAccountLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" /></label>
                <label>Note <span>(optional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Bank, transfer note, or context" /></label>
              </>
            )}
            <label className="attestation-check"><input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} /><span>I confirm that I have transferred this amount to the Nyas account and entered it correctly.</span></label>
            <button type="submit" disabled={busy || !attested || !amountIsValid}>{busy ? "Recording..." : "Add to my Kosh Wallet"}</button>
            <small>Minimum contribution: {formatMoney(config.minimumAmountRupees)}. Kosh Pramukh will later match this declaration with the bank statement.</small>
          </form>
        ) : <div className="bank-security-note"><strong>Secure your account first</strong><span>Set or verify your password in Parichay before recording real money.</span></div>}
      </div>

      {declarations.length ? (compact ? (
        <details className="declaration-history declaration-history-collapsed">
          <summary>View my recent contributions ({declarations.length})</summary>
          {declarations.slice(0, 5).map((item) => (
            <article key={item.id}>
              <div><strong>{formatMoney(item.amountRupees)}</strong><span>{formatDate(item.paidAt)}</span></div>
              <div><span>{item.utr ? `UTR ${item.utr}` : item.paymentReference}</span><em className={item.reconciliationStatus}>{item.reconciliationStatus.replaceAll("_", " ")}</em></div>
            </article>
          ))}
        </details>
      ) : (
        <div className="declaration-history">
          <h3>My recent declarations</h3>
          {declarations.slice(0, 8).map((item) => (
            <article key={item.id}>
              <div><strong>{formatMoney(item.amountRupees)}</strong><span>{formatDate(item.paidAt)}</span></div>
              <div><span>{item.utr ? `UTR ${item.utr}` : item.paymentReference}</span><em className={item.reconciliationStatus}>{item.reconciliationStatus.replaceAll("_", " ")}</em></div>
            </article>
          ))}
        </div>
      )) : null}

      {reviewing ? (
        <div className="contribution-review-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setReviewing(false);
        }}>
          <section className="contribution-review-dialog" role="alertdialog" aria-modal="true" aria-labelledby="contribution-review-title">
            <span className="section-kicker">Please check carefully</span>
            <h2 id="contribution-review-title">Is this amount correct?</h2>
            <strong className="contribution-review-amount">{formatMoney(Number(amountRupees || 0))}</strong>
            <p className="contribution-review-words">{amountInIndianWords(amountRupees)}</p>
            <dl>
              <div><dt>Transferred on</dt><dd>{formatDate(paidAt)}</dd></div>
              {utr ? <div><dt>Reference</dt><dd>{utr}</dd></div> : null}
            </dl>
            <p className="contribution-review-warning">This amount will be added to your Kosh Wallet immediately and later matched with the bank statement.</p>
            <div className="contribution-review-actions">
              <button type="button" className="secondary-button" onClick={() => setReviewing(false)}>Go back and edit</button>
              <button type="button" onClick={recordDeclaration} disabled={busy}>{busy ? "Recording..." : "Yes, record this amount"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
