import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import nyasaLogo from "../assets/nyasa-logo.png";

export function TermsPage() {
  return (
    <main className="policy-page">
      <header>
        <Link to="/legal"><ArrowLeft size={18} /> Legal information</Link>
        <img src={nyasaLogo} alt="Nyas logo" />
        <span>Nyas • Operated by Kumar Saurabh</span>
        <h1>Terms & Conditions</h1>
        <p>Effective and last updated: 6 August 2026</p>
      </header>

      <div className="policy-body">
        <section>
          <h2>1. Platform and acceptance</h2>
          <p>
            Nyas is a private family membership platform operated by Kumar Saurabh for the Alahdadpur Kul. By creating or using an account, a member
            agrees to these terms, the Privacy Policy, and the rules displayed for each Sankalp and Kosh action.
          </p>
        </section>
        <section>
          <h2>2. Membership eligibility</h2>
          <p>
            Access is intended for invited or recognised family members and authorised administrators. Members must provide reasonably accurate
            information, protect their password, and avoid claiming or changing another person's profile without authority. Accounts and duplicate
            profiles may be reviewed, linked, corrected, restricted, or deactivated by authorised administrators.
          </p>
        </section>
        <section>
          <h2>3. Nature of payments</h2>
          <p>
            Payments are private membership contributions credited to the authenticated member's Nyas wallet after successful provider verification.
            They are not public donations, deposits, loans, investments, purchases of securities, or promises of financial return. A wallet entry
            records internal Kosh participation and is not a bank account or transferable stored-value instrument.
          </p>
        </section>
        <section>
          <h2>4. Sankalp allocation</h2>
          <p>
            A member may allocate available wallet balance to an approved Sankalp within the minimum, maximum, and remaining-funding limits displayed
            by Nyas. Sankalp rules, team, expected budget, milestones, and progress may change through the authorised governance process. An allocation
            can become committed when implementation or spending begins.
          </p>
        </section>
        <section>
          <h2>5. Payment verification and failed transactions</h2>
          <p>
            Nyas credits only an INR payment whose provider status, amount, order identity, and transaction reference match the server record. A failed,
            cancelled, pending, mismatched, or unverified attempt is not credited. Provider or banking delays may postpone wallet visibility.
          </p>
        </section>
        <section>
          <h2>6. Cancellation, correction and refund policy</h2>
          <p>
            A member should report a duplicate or mistaken payment promptly through the authenticated portal. The Kosh administrators will verify the
            provider reference and ledger status. A payment that was never captured requires no refund. An unallocated duplicate or mistaken payment
            may be approved for refund after reconciliation.
          </p>
          <p>
            Approved refunds are returned to the original payment method and remain subject to payment-provider and banking timelines. A wallet amount
            already allocated or committed to an active Sankalp cannot be cancelled automatically and requires Kosh and Sankalp review. Nyas may retain
            the audit trail of any reversal or refund.
          </p>
        </section>
        <section>
          <h2>7. Acceptable use</h2>
          <p>
            Members must not upload unlawful content, misuse private family information, manipulate votes or financial records, impersonate another
            person, probe security controls, or use Nyas for public fundraising or any activity prohibited by law or a payment provider.
          </p>
        </section>
        <section>
          <h2>8. Availability and responsibility</h2>
          <p>
            Nyas may be updated, suspended, or corrected to protect members and records. Family and Sankalp information is contributed by members and
            should be independently checked before important personal, medical, property, or financial decisions. Nothing on Nyas is professional legal,
            medical, investment, or tax advice.
          </p>
        </section>
        <section>
          <h2>9. Contact, disputes and governing law</h2>
          <p>
            Members should first raise account, payment, or content concerns with the owner or Kosh administrators through the authenticated portal.
            The formal contact information submitted during membership or payment-provider onboarding applies to this website. These terms are governed
            by the laws of India, subject to applicable consumer and payment laws.
          </p>
        </section>
      </div>

      <footer>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/legal">Legal and payment information</Link>
        <Link to="/">Home</Link>
      </footer>
    </main>
  );
}
