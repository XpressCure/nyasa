import { ArrowRight, BookOpenText, CheckCircle2, HeartHandshake, Images, Landmark, Network, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import familyHouse from "../assets/family-house.jpeg";
import familyPhoto from "../assets/family-photo.jpeg";
import nyasaLogo from "../assets/nyasa-logo.png";

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

const futureSections = [
  {
    title: "Family Gallery",
    text: "A shared album for gatherings, homes, ceremonies, documents, and memories.",
    icon: Images
  },
  {
    title: "Family Tree",
    text: "A visual lineage map connecting generations, branches, spouses, and children.",
    icon: Network
  },
  {
    title: "Family Research",
    text: "A place to preserve interviews, old records, migration stories, and ancestral notes.",
    icon: Search
  },
  {
    title: "Social Works",
    text: "Community initiatives funded and tracked by the trust with transparent progress.",
    icon: HeartHandshake
  },
  {
    title: "Legacy Library",
    text: "Minutes, values, rituals, recipes, stories, and decisions kept for future members.",
    icon: BookOpenText
  },
  {
    title: "Trust Governance",
    text: "Roles, permissions, approvals, audits, and mission ownership as the family grows.",
    icon: ShieldCheck
  }
];

export function HomePage() {
  const [activeView, setActiveView] = useState("member");
  const active = walkthrough[activeView];

  return (
    <main className="home-page">
      <nav className="home-nav">
        <div className="home-brand">
          <img className="home-brand-logo" src={nyasaLogo} alt="Nyasa Trust logo" />
          <div>
            <strong>Nyasa Trust</strong>
            <small>Family OS</small>
          </div>
        </div>
        <div className="home-nav-actions">
          <a href="#gallery">Gallery</a>
          <a href="#future">Coming next</a>
          <a href="#kosh">Kosh</a>
          <Link to="/login">Sign in</Link>
          <Link className="home-primary-link" to="/dashboard">
            Open portal
          </Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-hero-copy">
          <img className="home-hero-logo" src={nyasaLogo} alt="Nyasa Trust logo" />
          <span className="home-kicker">
            <Sparkles size={16} />
            Private family operating system
          </span>
          <h1>Ek parivar. Ek vishwas. Ek virasat. Ek manch.</h1>
          <p>
            Nyasa Trust brings family members together to maintain profiles, pool money into Kosh, fund missions, approve expenses, and preserve a
            shared record of decisions and legacy.
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

        <div className="family-hero-card" aria-label="Nyasa family photo and portal preview">
          <img src={familyPhoto} alt="Nyasa family gathered together" />
          <div className="family-hero-overlay">
            <span>The Singh Family Trust</span>
            <strong>Ready to begin</strong>
          </div>
          <div className="portal-preview">
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
        </div>
      </section>

      <section className="home-section family-gallery-section" id="gallery">
        <div className="home-section-heading">
          <span>Family gallery</span>
          <h2>Start with the people and places that make the trust real.</h2>
        </div>
        <div className="family-gallery-grid">
          <figure>
            <img src={familyPhoto} alt="Nyasa family gathered together" />
            <figcaption>
              <strong>Family gathering</strong>
              <span>Shared memories, milestones, and celebrations.</span>
            </figcaption>
          </figure>
          <figure>
            <img src={familyHouse} alt="Family house at night" />
            <figcaption>
              <strong>Ancestral place</strong>
              <span>Homes, assets, missions, renovation progress, and records.</span>
            </figcaption>
          </figure>
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

      <section className="home-section interactive-section" id="kosh">
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

      <section className="home-section" id="future">
        <div className="home-section-heading">
          <span>Coming next</span>
          <h2>The menu can grow into a complete family knowledge and impact system.</h2>
        </div>
        <div className="future-grid">
          {futureSections.map((section) => {
            const Icon = section.icon;
            return (
              <article key={section.title}>
                <Icon size={22} />
                <h3>{section.title}</h3>
                <p>{section.text}</p>
                <span>Planned</span>
              </article>
            );
          })}
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
