import { ArrowLeft, Landmark, LockKeyhole, ReceiptText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import nyasaLogo from "../assets/nyasa-logo.png";

export function LegalPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-back-link">
          <ArrowLeft size={18} />
          Back to Nyas
        </Link>
        <img src={nyasaLogo} alt="Nyas logo" />
        <span>Legal, Membership and Kosh</span>
        <h1>Nyas platform information</h1>
        <p>Clear information for members using the private Kul workspace and Kosh.</p>
      </header>

      <section className="legal-identity-band">
        <div>
          <span>Platform / trade name</span>
          <strong>Nyas (Nyasa Trust / Kul OS)</strong>
        </div>
        <div>
          <span>Legal name and operator</span>
          <strong>Kumar Saurabh</strong>
        </div>
        <div>
          <span>Membership group</span>
          <strong>Alahdadpur Kul</strong>
        </div>
        <div>
          <span>Website</span>
          <strong>nyasa.xpresscure.com</strong>
        </div>
      </section>

      <section className="legal-content">
        <article>
          <Users size={22} />
          <h2>Nature of the platform</h2>
          <p>
            Nyas is a private digital membership platform for the Alahdadpur family group. It helps registered family members maintain family
            profiles, a Kul map, events, shared records, internal projects called Sankalp, and transparent Kosh records.
          </p>
          <p>
            Nyas is not an open public fundraising website. It does not promise financial returns, interest, ownership, investment benefits, or
            commercial profit to members.
          </p>
        </article>

        <article>
          <Landmark size={22} />
          <h2>Member contributions</h2>
          <p>
            Nyas does not collect money through a payment gateway. An authenticated member sends money directly to the official family bank account
            or UPI ID and records the same amount in Nyas. The declaration remains subject to bank reconciliation.
          </p>
          <p>
            A member may allocate available wallet balance to an approved family Sankalp. A Kosh Pramukh may correct a declaration to the amount
            actually received in the bank account, with an audit record.
          </p>
        </article>

        <article>
          <ReceiptText size={22} />
          <h2>Cancellation, correction and refund requests</h2>
          <p>
            Members should review the amount before authorising payment. A duplicate, mistaken, or unmatched payment can be reported to the Kosh
            administrators from the authenticated portal. Each request is checked against the bank reference, bank statement, and Nyas ledger.
          </p>
          <p>
            Any approved bank refund or correction is handled by the Kosh administrators according to banking timelines. Amounts already allocated
            or committed to an active Sankalp require an additional Kosh review before correction.
          </p>
        </article>

        <article>
          <LockKeyhole size={22} />
          <h2>Privacy and account security</h2>
          <p>
            Nyas stores member profile, relationship, event, and transaction records only for operating the private family workspace. Financial
            actions require password-authenticated access. Nyas never asks for or stores a UPI PIN, card number, CVV, or banking password.
          </p>
          <p>
            Members can request correction of their account or transaction information through the owner or Kosh administrators shown after sign-in.
          </p>
        </article>
      </section>

      <section className="legal-contact-band">
        <div>
          <span>Platform operator</span>
          <strong>Kumar Saurabh</strong>
        </div>
        <p>
          Member support, bank matching, and correction requests are handled through the authenticated Nyas portal by the owner and Kosh Pramukh.
        </p>
        <Link to="/login">Open member sign in</Link>
      </section>

      <footer className="legal-page-footer">
        <span>Last updated: 12 August 2026</span>
        <nav>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/">nyasa.xpresscure.com</Link>
        </nav>
      </footer>
    </main>
  );
}
