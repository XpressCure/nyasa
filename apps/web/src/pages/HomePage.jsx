import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  HeartHandshake,
  Home,
  Images,
  Landmark,
  MapPin,
  Network,
  Search,
  ShieldCheck,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import familyHouse from "../assets/family-house.jpeg";
import familyPhoto from "../assets/family-photo.jpeg";
import nyasaLogo from "../assets/nyasa-logo.png";

const launchItems = [
  {
    title: "Invite the extended family",
    text: "Owners can bring relatives into one Alahdadpur-rooted family workspace with clear roles."
  },
  {
    title: "Member profiles and stories",
    text: "Members can sign in with name and phone, then add bio, city, profession, and their family connection."
  },
  {
    title: "Village Kosh and missions",
    text: "Members top up their wallet, allocate funds to Alahdadpur missions, and track contribution progress."
  },
  {
    title: "Transparent work records",
    text: "Funded village work can collect expenses, attach bills, and route approvals through owner/admin review."
  }
];

const walkthrough = {
  member: {
    title: "For family members",
    points: ["Sign in with name and phone", "Accept family invite", "Update profile and bio", "Contribute to Alahdadpur missions"]
  },
  owner: {
    title: "For owners",
    points: ["Create family workspace", "Invite members", "Create village missions", "Approve expenses"]
  },
  launch: {
    title: "Launch today",
    points: ["Alahdadpur intro homepage", "Invite-only onboarding", "Profile updates", "Village mission funding demo"]
  }
};

const futureSections = [
  {
    title: "Family Gallery",
    text: "A shared album for Alahdadpur gatherings, homes, ceremonies, documents, and memories.",
    icon: Images
  },
  {
    title: "Family Tree",
    text: "A visual lineage map connecting generations, branches, spouses, and children back to village roots.",
    icon: Network
  },
  {
    title: "Family Research",
    text: "A place to preserve interviews, old records, migration stories, land notes, and ancestral memories.",
    icon: Search
  },
  {
    title: "Social Works",
    text: "Village initiatives funded and tracked by the trust with transparent progress.",
    icon: HeartHandshake
  },
  {
    title: "Legacy Library",
    text: "Minutes, values, rituals, recipes, stories, and decisions kept for future generations.",
    icon: BookOpenText
  },
  {
    title: "Trust Governance",
    text: "Roles, permissions, approvals, audits, and mission ownership as village work grows.",
    icon: ShieldCheck
  }
];

const launchMessageHighlights = [
  "परिवार की विरासत, इतिहास और स्मृतियों को सुरक्षित रखना।",
  "Alahdadpur और पैतृक घर से जुड़े कार्यों को संगठित रूप से आगे बढ़ाना।",
  "Family Funds को पारदर्शी तरीके से संचालित करना।",
  "आने वाली पीढ़ियों के लिए एक मजबूत, जुड़ा हुआ आधार बनाना।"
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
          <a href="#village">Alahdadpur</a>
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
            <MapPin size={16} />
            Rooted in Alahdadpur
          </span>
          <h1>Ek gaon. Ek parivar. Ek vishwas. Ek virasat.</h1>
          <p>
            Nyasa Trust is being built around Alahdadpur: a shared family platform to preserve our roots, coordinate village missions, pool money
            into Kosh, and keep a transparent record of work, decisions, and legacy.
          </p>
          <p className="home-blessing-line">परिवार के सभी बड़े-बुजुर्गों, भाइयों, बहनों और बच्चों को सादर प्रणाम।</p>
          <div className="village-pill-row">
            <span>Alahdadpur</span>
            <span>Family trust</span>
            <span>Village missions</span>
          </div>
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
            <span>Alahdadpur Family Trust</span>
            <strong>Ready to begin</strong>
          </div>
          <div className="portal-preview">
            <div className="preview-metrics">
              <div>
                <span>Profiles</span>
                <strong>Live</strong>
              </div>
              <div>
                <span>Kosh</span>
                <strong>Ready</strong>
              </div>
              <div>
                <span>Launch Missions</span>
                <strong>3</strong>
              </div>
            </div>
            <div className="preview-mission">
              <div>
                <strong>Alahdadpur Ancestral House Mission</strong>
                <span>Prepared for transparent family contributions</span>
              </div>
              <div className="preview-progress">
                <span style={{ width: "8%" }} />
              </div>
            </div>
            <div className="preview-row">
              <CheckCircle2 size={18} />
              Live database prepared with Alahdadpur workspace
            </div>
          </div>
        </div>
      </section>

      <section className="home-section launch-message-section" id="sankalp">
        <div className="launch-note-card">
          <span className="home-kicker">
            <Landmark size={16} />
            Launch Sankalp
          </span>
          <h2>बड़े डैडी के 72वें जन्मदिवस पर एक पारिवारिक संकल्प।</h2>
          <p>
            Nyasa Trust केवल एक सॉफ्टवेयर नहीं है। यह हमारे परिवार की सामूहिक यात्रा का डिजिटल अभिलेख है: विश्वास, अपनापन,
            आध्यात्मिक आधार, Alahdadpur से जुड़ी स्मृतियाँ, और आने वाली पीढ़ियों के लिए हमारी जिम्मेदारी।
          </p>
          <blockquote>
            "आज हम न्यासी हैं, कल हमारी संताने होंगी। विरासत हमारी नहीं, हमारी जिम्मेदारी है।"
          </blockquote>
        </div>
        <div className="launch-message-list">
          {launchMessageHighlights.map((highlight) => (
            <div key={highlight}>
              <CheckCircle2 size={18} />
              <span>{highlight}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section village-section" id="village">
        <div className="village-story">
          <span>
            <Home size={18} />
            Alahdadpur first
          </span>
          <h2>A portal for the village we come from and the work we want to do there.</h2>
          <p>
            The first version can introduce the family, gather member bios, show the Alahdadpur gallery, and demonstrate how missions like renovation,
            social work, research, and village documentation will be funded and governed.
          </p>
        </div>
        <div className="village-focus-grid">
          <div>
            <strong>Preserve</strong>
            <span>Family stories, old records, photos, and village memory.</span>
          </div>
          <div>
            <strong>Contribute</strong>
            <span>Members add to wallet and allocate funds to specific village missions.</span>
          </div>
          <div>
            <strong>Implement</strong>
            <span>Owners create missions, track budgets, review bills, and show progress.</span>
          </div>
        </div>
      </section>

      <section className="home-section family-gallery-section" id="gallery">
        <div className="home-section-heading">
          <span>Alahdadpur gallery</span>
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
              <strong>Alahdadpur ancestral place</strong>
              <span>Homes, assets, missions, renovation progress, and village records.</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <span>What can launch today</span>
          <h2>A useful first release for the Alahdadpur family circle.</h2>
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
          <p>Use these modes during a family demo to explain how Alahdadpur missions, member profiles, and Kosh contributions will work.</p>
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
          <h2>The menu can grow into a complete Alahdadpur knowledge and impact system.</h2>
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
          <p>Yes. Wallet top-up, mission allocation, expenses, bills, and approvals are ready for a controlled Alahdadpur mission demo.</p>
        </div>
      </section>
    </main>
  );
}
