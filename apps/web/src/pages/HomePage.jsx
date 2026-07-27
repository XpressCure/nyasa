import { ArrowRight, CheckCircle2, Landmark, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const launchItems = [
  {
    title: "Invite family",
    text: "Owners can create invite links and bring members into the family workspace."
  },
  {
    title: "Member profiles",
    text: "Members can sign in with name and phone, accept invites, and update their own bio, city, profession, and story."
  },
  {
    title: "Kosh and missions",
    text: "Members top up their wallet, allocate funds to missions, and track contribution progress."
  },
  {
    title: "Expenses with proof",
    text: "Funded missions can collect expenses, attach bills, and route approvals through owner/admin review."
  }
];

const walkthrough = {
  member: {
    title: "For family members",
    points: ["Sign in with name and phone", "Accept family invite", "Update profile and bio", "Allocate to missions"]
  },
  owner: {
    title: "For owners",
    points: ["Create family workspace", "Invite members", "Create missions", "Approve expenses"]
  },
  launch: {
    title: "Launch today",
    points: ["Family intro homepage", "Invite-only onboarding", "Profile updates", "Mission funding demo"]
  }
};

export function HomePage() {
  const [activeView, setActiveView] = useState("member");
  const active = walkthrough[activeView];

  return (
    <main className="home-page">
      <nav className="home-nav">
        <div className="home-brand">
          <span className="brand-mark">N</span>
          <div>
            <strong>Nyasa</strong>
            <small>Family OS</small>
          </div>
        </div>
        <div className="home-nav-actions">
          <Link to="/login">Sign in</Link>
          <Link className="home-primary-link" to="/dashboard">
            Open portal
          </Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-kicker">
            <Sparkles size={16} />
            Private family operating system
          </span>
          <h1>One calm place for family funds, missions, members, and legacy.</h1>
          <p>
            Nyasa helps a family invite members, maintain profiles, pool money into Kosh, fund missions, approve expenses, and keep a shared record
            of decisions.
          </p>
          <div className="home-actions">
            <Link className="home-cta" to="/login">
              Sign in and fill bio
              <ArrowRight size={18} />
            </Link>
            <Link className="home-secondary" to="/dashboard">
              View dashboard
            </Link>
          </div>
        </div>

        <div className="portal-preview" aria-label="Nyasa portal preview">
          <div className="preview-header">
            <span>The Singh Family Trust</span>
            <strong>Ready to begin</strong>
          </div>
          <div className="preview-metrics">
            <div>
              <span>Members</span>
              <strong>48</strong>
            </div>
            <div>
              <span>Kosh</span>
              <strong>INR 12.8L</strong>
            </div>
            <div>
              <span>Missions</span>
              <strong>6</strong>
            </div>
          </div>
          <div className="preview-mission">
            <div>
              <strong>Ancestral House Renovation</strong>
              <span>Funded by 14 members</span>
            </div>
            <div className="preview-progress">
              <span style={{ width: "82%" }} />
            </div>
          </div>
          <div className="preview-row">
            <CheckCircle2 size={18} />
            Bill uploaded and waiting for owner review
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <span>What can launch today</span>
          <h2>A useful first release, not just a brochure.</h2>
        </div>
        <div className="launch-grid">
          {launchItems.map((item) => (
            <article key={item.title}>
              <CheckCircle2 size={20} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section interactive-section">
        <div>
          <span>Interactive family view</span>
          <h2>Show every relative what they can do.</h2>
          <p>Use these modes during a family demo to explain the portal without opening every admin page.</p>
          <div className="segmented-control">
            {Object.keys(walkthrough).map((key) => (
              <button className={activeView === key ? "active" : ""} key={key} type="button" onClick={() => setActiveView(key)}>
                {walkthrough[key].title}
              </button>
            ))}
          </div>
        </div>
        <div className="walkthrough-card">
          <h3>{active.title}</h3>
          <ul>
            {active.points.map((point) => (
              <li key={point}>
                <CheckCircle2 size={18} />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-band">
        <div>
          <Users size={24} />
          <strong>Can family members create accounts?</strong>
          <p>Yes. Today they can sign in with name and phone or accept an invite link. Production OTP/Google login is the next auth upgrade.</p>
        </div>
        <div>
          <ShieldCheck size={24} />
          <strong>Can they update their bio?</strong>
          <p>Yes. The portal now includes a self-service profile page for bio, city, country, and profession.</p>
        </div>
        <div>
          <Landmark size={24} />
          <strong>Can money flow be demoed?</strong>
          <p>Yes. Wallet top-up, mission allocation, expenses, bills, and approvals are ready for a controlled demo.</p>
        </div>
      </section>
    </main>
  );
}
