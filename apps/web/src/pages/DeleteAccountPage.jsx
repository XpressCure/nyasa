import { useState } from "react";
import { ArrowLeft, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import nyasaLogo from "../assets/nyasa-logo.png";
import { apiPost } from "../lib/api.js";

export function DeleteAccountPage() {
  const signedIn = Boolean(localStorage.getItem("nyasa_token"));
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setWorking(true);
    setStatus("");
    try {
      const response = await apiPost("/auth/account-deletion-request", { reason });
      setStatus(response.message || "Your request has been received.");
      setConfirmation("");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="policy-page">
      <header>
        <Link to="/privacy"><ArrowLeft size={18} /> Privacy Policy</Link>
        <img src={nyasaLogo} alt="Nyas logo" />
        <span>Nyas | Account controls</span>
        <h1>Delete your Nyas account</h1>
        <p>Request removal of your login and personal account information.</p>
      </header>

      <div className="policy-body">
        <section>
          <h2><Trash2 size={20} /> What will be removed</h2>
          <p>
            After verification, Nyas removes your login credentials, contact details, private profile fields, optional health information,
            and profile photographs controlled by your account. Processing is completed within 30 days.
          </p>
        </section>
        <section>
          <h2><ShieldCheck size={20} /> What may be retained</h2>
          <p>
            Family-tree relationships and minimal historical identity may be retained as part of the shared Kul archive. Kosh, Sankalp,
            reconciliation, security, and audit records may be retained where required for accounting, fraud prevention, disputes, or law.
            They are restricted and are not used to recreate your login.
          </p>
        </section>

        {!signedIn ? (
          <section>
            <h2>Verify your account</h2>
            <p>Sign in first so Nyas can verify that the request belongs to you.</p>
            <Link className="button primary" to="/login?next=%2Fdelete-account">Sign in to request deletion</Link>
          </section>
        ) : (
          <section>
            <h2>Send deletion request</h2>
            <form className="account-deletion-form" onSubmit={submit}>
              <label>
                Reason (optional)
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} />
              </label>
              <label>
                Type DELETE to confirm
                <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
              </label>
              <button type="submit" disabled={working || confirmation !== "DELETE"}>
                {working ? "Sending request..." : "Request account deletion"}
              </button>
              {status && <p role="status">{status}</p>}
            </form>
          </section>
        )}
      </div>

      <footer>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms & Conditions</Link>
        <Link to="/">Home</Link>
      </footer>
    </main>
  );
}
