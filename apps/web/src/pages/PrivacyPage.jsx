import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import nyasaLogo from "../assets/nyasa-logo.png";

export function PrivacyPage() {
  return (
    <main className="policy-page">
      <header>
        <Link to="/legal"><ArrowLeft size={18} /> Legal information</Link>
        <img src={nyasaLogo} alt="Nyas logo" />
        <span>Nyas • Private Kul workspace</span>
        <h1>Privacy Policy</h1>
        <p>Effective and last updated: 12 August 2026</p>
      </header>

      <div className="policy-body">
        <section>
          <h2>1. Scope</h2>
          <p>
            This Privacy Policy applies to nyasa.xpresscure.com and the private Nyas membership workspace for the Alahdadpur Kul. It explains what
            information Nyas collects, why it is used, and how members can request corrections.
          </p>
        </section>
        <section>
          <h2>2. Information collected</h2>
          <p>
            Nyas may collect a member's name, phone number, email address, photograph, date of birth, residence, education, work details, family
            relationships, family events, and information voluntarily added to a profile. Health information is optional and should be provided
            only when a member chooses to contribute it for the private family health map.
          </p>
          <p>
            For Kosh activity, Nyas records the amount and bank reference declared by a member, optional source-account suffix, wallet entries,
            Sankalp allocations, reconciliation corrections, and audit history. Nyas does not store UPI PINs or banking passwords.
          </p>
          <p>
            In the Android app, a member may optionally grant SMS access and tap "Find recent bank SMS" to prefill a contribution amount and
            transaction reference. This check runs on the member's phone only after that action. The SMS body is not uploaded to Nyas, and the
            member must review and confirm the amount before recording a declaration. SMS detection is an entry aid, not proof of bank receipt.
          </p>
        </section>
        <section>
          <h2>3. How information is used</h2>
          <p>
            Information is used to authenticate members, maintain Parichay and the Kul map, coordinate events and Sankalp, operate personal member
            wallets and Kosh records, verify payments, prevent duplicate entries, resolve support requests, and protect the workspace from misuse.
          </p>
        </section>
        <section>
          <h2>4. Sharing and banking reconciliation</h2>
          <p>
            Family information is available only according to the roles and permissions of the private workspace. Necessary transaction and contact
            transaction details are reviewed by authorised Kosh administrators against family bank records for reconciliation and correction.
            Nyas does not sell member data or send member profile data to a payment gateway.
          </p>
        </section>
        <section>
          <h2>5. Storage and security</h2>
          <p>
            Nyas uses access controls, password verification for financial actions, encrypted web connections, audit logs, and restricted storage.
            No internet system can guarantee absolute security; members should keep their password private and report suspected misuse promptly.
          </p>
        </section>
        <section>
          <h2>6. Retention and correction</h2>
          <p>
            Records are retained while required for the family archive, membership operation, transaction reconciliation, legal compliance, and
            dispute resolution. Members may update their Parichay directly or request correction, deactivation, or review through the owner or
            administrators visible after sign-in. Financial audit records may be retained even when a profile is deactivated.
          </p>
        </section>
        <section>
          <h2>7. Children's information</h2>
          <p>
            A parent or responsible adult may add limited family-tree information for a minor. Minor profiles do not independently perform financial
            actions. The family should avoid adding unnecessary sensitive information about children.
          </p>
        </section>
        <section>
          <h2>8. Contact and changes</h2>
          <p>
            Privacy and account requests are handled by authorised Nyas administrators through the authenticated portal and the formal contact
            details supplied for the private family workspace. Material policy changes will be published on this page.
          </p>
        </section>
      </div>

      <footer>
        <Link to="/terms">Terms & Conditions</Link>
        <Link to="/legal">Legal and payment information</Link>
        <Link to="/">Home</Link>
      </footer>
    </main>
  );
}
