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
import { useEffect, useRef, useState } from "react";
import familyHouse from "../assets/family-house.jpeg";
import familyPhoto from "../assets/family-photo.jpeg";
import nyasaLogo from "../assets/nyasa-logo.png";
import { apiGet } from "../lib/api.js";

const launchItems = [
  {
    title: "Private Family Workspace",
    text: "Each customer gets a branded Nyas workspace for their family, trust, or ancestral property circle."
  },
  {
    title: "Parichay and Kul Map",
    text: "Members add profiles, photos, parents, spouse, children, education, work, health notes, and family links."
  },
  {
    title: "Kosh and Sankalp",
    text: "Families can collect money, allocate it to approved projects, track limits, and keep visible progress records."
  },
  {
    title: "Sabha, Documents and Governance",
    text: "Voting, document uploads, role-based permissions, milestones, expense bills, and audit-friendly records stay together."
  }
];

const walkthrough = {
  buyer: {
    title: "For family heads",
    points: ["Create a private branded Nyas", "Invite relatives across cities", "See profile completion", "Run the first Sankalp with transparency"]
  },
  member: {
    title: "For members",
    points: ["Sign in with name and phone", "Complete Parichay", "Add immediate family", "Vote, contribute, and follow Sankalp"]
  },
  admin: {
    title: "For admins",
    points: ["Merge duplicates", "Manage roles", "Track Kosh and reports", "Export records for family review"]
  }
};

const todaySteps = [
  {
    title: "1. Configure the family",
    text: "Set the family or trust name, logo, language style, roles, member limits, and privacy expectations."
  },
  {
    title: "2. Run data onboarding",
    text: "Invite members to fill Parichay, upload photos, add immediate family, and correct the first Kul Map."
  },
  {
    title: "3. Launch first Sankalp",
    text: "Create one meaningful project with rules, team, budget, milestones, voting if needed, and transparent updates."
  },
  {
    title: "4. Keep it alive",
    text: "Use birthdays, anniversaries, calendar events, Kosh reports, Sabha voting, and weekly content to keep members returning."
  }
];

const futureSections = [
  {
    title: "Kul Gallery",
    text: "A shared album for gatherings, homes, ceremonies, old photographs, documents, and memories.",
    icon: Images
  },
  {
    title: "Kul Tree",
    text: "A visual lineage map connecting generations, branches, spouses, and children back to village roots.",
    icon: Network
  },
  {
    title: "Kul Research",
    text: "A place to preserve interviews, old records, migration stories, land notes, and ancestral memories.",
    icon: Search
  },
  {
    title: "Family Impact",
    text: "Social work, village work, scholarships, temples, healthcare support, or shared family initiatives.",
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

const customerSegments = [
  {
    title: "Large Joint Families",
    text: "Families with 50-500 members who need one private place for Kul Map, Parichay, events, documents, and family decisions."
  },
  {
    title: "Ancestral Property Families",
    text: "Families managing village homes, farms, temples, dharamshalas, shops, or shared assets across multiple cities."
  },
  {
    title: "Family Trusts",
    text: "Private, religious, social, or legacy trusts that need transparent Kosh, Sankalp, documents, roles, and audit trails."
  },
  {
    title: "Family Businesses",
    text: "Business families that want succession records, next-generation engagement, project voting, and structured family governance."
  }
];

const productPlans = [
  {
    name: "Starter Family",
    price: "₹4,999/year",
    description: "For families beginning their digital Kul record.",
    features: ["Up to 50 members", "Parichay and basic Kul Map", "Family gallery", "Invite links"]
  },
  {
    name: "Legacy Family",
    price: "₹14,999/year",
    description: "For active families running Sankalp and shared records.",
    features: ["Up to 200 members", "Kosh and Sankalp", "Sabha voting", "Events and document vault"]
  },
  {
    name: "Nyas Trust",
    price: "₹49,999/year",
    description: "For large families, trusts, and high-value legacy work.",
    features: ["Large family workspace", "Custom branding", "Razorpay collections", "Audit-ready reports"]
  }
];

const launchMessageHighlights = [
  "हर परिवार के लिए निजी, सुरक्षित और branded digital Nyas.",
  "Parichay, Kul Map, Kosh, Sankalp, Sabha और documents एक जगह.",
  "Subscription product with one-time onboarding and recurring value.",
  "Designed for Indian joint families, family trusts, NRIs, and legacy-conscious families."
];

const launchSequenceSteps = [
  "Family",
  "Kul Parichay",
  "Kul Map",
  "Kosh",
  "Sankalp Sabha",
  "Nyas Live"
];

const launchBellBlessings = [
  "ॐ",
  "यश",
  "कीर्ति",
  "वैभव",
  "सम्मान",
  "समन्वय",
  "उज्ज्वल भविष्य",
  "संस्कार",
  "विश्वास",
  "एकता",
  "प्रगति",
  "सेवा",
  "संकल्प",
  "आशीर्वाद"
];

function formatPreviewMoney(value) {
  if (!value) return "₹0";
  if (value >= 100000) return `₹${(value / 100000).toFixed(value >= 1000000 ? 1 : 0)}L`;
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

export function HomePage() {
  const [activeView, setActiveView] = useState("member");
  const [launchStarted, setLaunchStarted] = useState(false);
  const [launchComplete, setLaunchComplete] = useState(false);
  const [bellRings, setBellRings] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const bellRingCount = useRef(0);
  const active = walkthrough[activeView];
  const featuredSankalp = snapshot?.sankalp?.featured;
  const featuredSankalpProgress = Math.max(0, Math.min(100, featuredSankalp?.fundingPercent || featuredSankalp?.completionPercent || 0));

  useEffect(() => {
    apiGet("/families/public/nyasa-summary")
      .then((response) => setSnapshot(response.data))
      .catch(() => setSnapshot(null));
  }, []);

  useEffect(() => {
    if (!launchStarted) return undefined;
    const timer = window.setTimeout(() => setLaunchComplete(true), 9200);
    return () => window.clearTimeout(timer);
  }, [launchStarted]);

  function ringLaunchBell() {
    setLaunchStarted(true);
    const ringId = Date.now();
    const blessingWord = launchBellBlessings[bellRingCount.current % launchBellBlessings.length];
    bellRingCount.current += 1;
    setBellRings((current) => [
      ...current.slice(-5),
      {
        id: ringId,
        word: blessingWord
      }
    ]);
    window.setTimeout(() => {
      setBellRings((current) => current.filter((ring) => ring.id !== ringId));
    }, 3600);

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      audioContext.resume?.();
      const now = audioContext.currentTime;
      const masterGain = audioContext.createGain();
      const compressor = audioContext.createDynamicsCompressor();
      const reverb = audioContext.createConvolver();
      const reverbGain = audioContext.createGain();
      const dryGain = audioContext.createGain();
      const strikeFilter = audioContext.createBiquadFilter();

      const impulseLength = audioContext.sampleRate * 3.8;
      const impulse = audioContext.createBuffer(2, impulseLength, audioContext.sampleRate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const impulseData = impulse.getChannelData(channel);
        for (let index = 0; index < impulseLength; index += 1) {
          const decay = Math.pow(1 - index / impulseLength, 2.4);
          impulseData[index] = (Math.random() * 2 - 1) * decay;
        }
      }
      reverb.buffer = impulse;
      reverbGain.gain.setValueAtTime(0.32, now);
      dryGain.gain.setValueAtTime(0.92, now);
      strikeFilter.type = "lowpass";
      strikeFilter.frequency.setValueAtTime(3200, now);
      strikeFilter.Q.setValueAtTime(0.8, now);

      compressor.threshold.setValueAtTime(-16, now);
      compressor.knee.setValueAtTime(24, now);
      compressor.ratio.setValueAtTime(3, now);
      compressor.attack.setValueAtTime(0.006, now);
      compressor.release.setValueAtTime(0.42, now);

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.95, now + 0.012);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 6.1);
      compressor.connect(audioContext.destination);
      dryGain.connect(compressor);
      reverbGain.connect(compressor);
      masterGain.connect(dryGain);
      masterGain.connect(reverb);
      reverb.connect(reverbGain);

      const partials = [
        { frequency: 82, gain: 0.24, decay: 5.8, type: "sine" },
        { frequency: 164, gain: 0.2, decay: 5.2, type: "sine" },
        { frequency: 246, gain: 0.24, decay: 4.8, type: "triangle" },
        { frequency: 392, gain: 0.2, decay: 4.5, type: "sine" },
        { frequency: 514, gain: 0.18, decay: 4.1, type: "triangle" },
        { frequency: 742, gain: 0.15, decay: 3.4, type: "sine" },
        { frequency: 1048, gain: 0.12, decay: 2.8, type: "triangle" },
        { frequency: 1486, gain: 0.08, decay: 2.3, type: "sine" },
        { frequency: 2136, gain: 0.055, decay: 1.8, type: "sine" },
        { frequency: 3024, gain: 0.032, decay: 1.3, type: "triangle" }
      ];

      partials.forEach((partial, index) => {
        [0, 0.12, 0.28].forEach((strikeDelay, strikeIndex) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.type = partial.type;
          oscillator.frequency.setValueAtTime(partial.frequency, now + strikeDelay);
          oscillator.detune.setValueAtTime((index % 2 === 0 ? 11 : -9) + strikeIndex * 3, now + strikeDelay);
          oscillator.detune.linearRampToValueAtTime(0, now + strikeDelay + partial.decay);
          gain.gain.setValueAtTime(0.0001, now + strikeDelay);
          gain.gain.exponentialRampToValueAtTime(partial.gain / (strikeIndex + 1.05), now + strikeDelay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + strikeDelay + partial.decay);
          oscillator.connect(gain);
          gain.connect(masterGain);
          oscillator.start(now + strikeDelay);
          oscillator.stop(now + strikeDelay + partial.decay + 0.2);
        });
      });

      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.26, audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let index = 0; index < noiseData.length; index += 1) {
        noiseData[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / noiseData.length, 1.7);
      }
      const noise = audioContext.createBufferSource();
      const noiseGain = audioContext.createGain();
      noise.buffer = noiseBuffer;
      noiseGain.gain.setValueAtTime(0.24, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      noise.connect(strikeFilter);
      strikeFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.28);

      window.setTimeout(() => audioContext.close?.(), 6800);
    } catch {
      // Launch still proceeds when a browser blocks or lacks Web Audio support.
    }
  }

  return (
    <main className="home-page">
      {!launchComplete ? (
        <section
          className={`launch-stage ${launchStarted ? "launch-stage-active" : ""} ${bellRings.length ? "launch-bell-ringing" : ""}`}
          aria-label="Nyas launch sequence"
        >
          <button type="button" className="launch-skip-button" onClick={() => setLaunchComplete(true)}>
            Skip
          </button>
          {bellRings.map((ring, index) => (
            <div className={`launch-om-burst launch-blessing-${(index % 3) + 1}`} aria-hidden="true" key={ring.id}>
              {ring.word}
            </div>
          ))}
          <div className="launch-stage-inner">
            <div className="launch-logo-ring">
              <img src={nyasaLogo} alt="Nyas logo" />
            </div>
            <h1>न्यास</h1>
            <p className="launch-subtitle">एक परिवार. एक विश्वास. एक विरासत. एक मंच.</p>
            <button type="button" className="launch-bell-button" onClick={ringLaunchBell}>
              <span className="temple-bell-wrap" aria-hidden="true">
                <span className="temple-bell-rope" />
                <span className="temple-bell">
                  <span className="temple-bell-cap" />
                  <span className="temple-bell-body" />
                  <span className="temple-bell-lip" />
                  <span className="temple-bell-clapper" />
                </span>
              </span>
              <span>{launchStarted ? "घंटा फिर बजाइए" : "मंदिर का घंटा बजाइए"}</span>
            </button>
            <div className="launch-sequence-line">
              {launchSequenceSteps.map((step, index) => (
                <span key={step} style={{ animationDelay: `${index * 0.55 + 0.6}s` }}>
                  {step}
                </span>
              ))}
            </div>
            <div className="launch-reveal-card">
              <strong>Website launch ready</strong>
              <span>Parichay, Kul Map, Kosh, Sankalp, Sabha voting and family dashboard are live.</span>
            </div>
            <div className="launch-controls">
              {!launchStarted ? (
                <button type="button" onClick={ringLaunchBell}>
                  Launch with bell
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button type="button" onClick={() => setLaunchComplete(true)}>
                  Enter Nyas
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}
      <nav className="home-nav">
        <div className="home-brand">
          <img className="home-brand-logo" src={nyasaLogo} alt="न्यास Trust logo" />
          <div>
            <strong>Nyas</strong>
            <small>Family OS</small>
          </div>
        </div>
        <div className="home-nav-actions">
          <a href="#start">How it works</a>
          <a href="#gallery">Product preview</a>
          <a href="#village">Use cases</a>
          <a href="#market">For families</a>
          <a href="#pricing">Plans</a>
          <a href="#future">Coming next</a>
          <a href="#kosh">Kosh</a>
          <Link to="/login">Sign in</Link>
          <Link to="/demo-request">Request demo</Link>
          <Link className="home-primary-link" to="/dashboard">
            Open portal
          </Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-hero-copy">
          <img className="home-hero-logo" src={nyasaLogo} alt="न्यास Trust logo" />
          <span className="home-kicker">
            <MapPin size={16} />
            Built for Indian families
          </span>
          <h1>One private digital home for every large family.</h1>
          <p>
            Nyas helps joint families, family trusts, ancestral-property groups, and business families preserve their legacy, map their Kul,
            manage Kosh, run Sankalp, vote in Sabha, and keep transparent records for the next generation.
          </p>
          <p className="home-blessing-line">विरासत, विश्वास, निर्णय और योगदान - सब एक सुरक्षित डिजिटल न्यास में।</p>
          <div className="village-pill-row">
            <span>Family tree</span>
            <span>Kosh</span>
            <span>Sankalp</span>
          </div>
          <div className="home-actions">
            <Link className="home-cta" to="/demo-request">
              Request demo
              <ArrowRight size={18} />
            </Link>
            <Link className="home-secondary" to="/dashboard">
              Open product preview
            </Link>
          </div>
        </div>

        <div className="family-hero-card" aria-label="Nyas product preview">
          <img src={familyPhoto} alt="Nyasa family gathered together" />
          <div className="family-hero-overlay">
            <span>Private family workspace</span>
            <strong>Ready to configure</strong>
          </div>
          <div className="portal-preview">
            <div className="preview-metrics">
              <div>
                <span>Members</span>
                <strong>50-500</strong>
              </div>
              <div>
                <span>Setup</span>
                <strong>7 days</strong>
              </div>
              <div>
                <span>Modules</span>
                <strong>8+</strong>
              </div>
            </div>
            <div className="preview-mission">
              <div>
                <strong>{featuredSankalp?.title || "Sample Sankalp workspace"}</strong>
                <span>
                  {featuredSankalp
                    ? `${formatPreviewMoney(featuredSankalp.allocatedRupees)} allocated of ${formatPreviewMoney(featuredSankalp.targetBudgetRupees)}`
                    : "Show rules, team, target, contributions, milestones, documents, and progress."}
                </span>
              </div>
              <div className="preview-progress">
                <span style={{ width: `${featuredSankalp ? featuredSankalpProgress : 62}%` }} />
              </div>
            </div>
            <div className="preview-row">
              <CheckCircle2 size={18} />
              {featuredSankalp ? `${featuredSankalpProgress}% progress from live Kosh records` : "A customer workspace can be branded for any family or trust."}
            </div>
          </div>
        </div>
      </section>

      <section className="home-section today-start-section" id="start">
        <div className="home-section-heading">
          <span>How Nyas is launched</span>
          <h2>A repeatable onboarding system for every customer family.</h2>
          <p>
            The strongest first sale is a guided family digitalization camp. Nyas does not ask a family to start from an empty dashboard. We help them
            configure the workspace, collect profiles, clean the Kul Map, and launch one meaningful Sankalp.
          </p>
        </div>
        <div className="today-step-grid">
          {todaySteps.map((step) => (
            <article key={step.title}>
              <CheckCircle2 size={20} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
        <div className="today-action-panel">
          <div>
            <strong>First paid offer</strong>
            <span>
              Family Digitalization Camp: a 7-day setup covering branding, member invites, Parichay collection, Kul Map cleanup, first Sankalp,
              Kosh setup, and admin training.
            </span>
          </div>
          <div className="home-actions">
            <Link className="home-cta" to="/demo-request">
              Request guided setup
              <ArrowRight size={18} />
            </Link>
            <Link className="home-secondary" to="/family-tree">
              View Kul Map module
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section launch-message-section" id="sankalp">
        <div className="launch-note-card">
          <span className="home-kicker">
            <Landmark size={16} />
            Product promise
          </span>
          <h2>Nyas turns family trust, records, projects and contributions into a living digital system.</h2>
          <p>
            It is not only a family tree app. It is a Family OS for Indian families that need privacy, continuity, shared decision-making,
            transparent money movement, document history, and respectful participation from every generation.
          </p>
          <blockquote>
            "विरासत केवल संपत्ति नहीं होती। विचार, संस्कार, अनुभव और विश्वास भी विरासत होते हैं।"
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
            Use cases
          </span>
          <h2>One platform, many Indian family situations.</h2>
          <p>
            Nyas is useful wherever family memory, money, properties, responsibilities, and decisions are spread across cities and generations.
          </p>
        </div>
        <div className="village-focus-grid">
          <div>
            <strong>Legacy families</strong>
            <span>Preserve profiles, history, rituals, values, old records, photos, and oral memories.</span>
          </div>
          <div>
            <strong>Shared assets</strong>
            <span>Track ancestral houses, farms, shops, temples, repairs, documents, budgets, and responsibilities.</span>
          </div>
          <div>
            <strong>Family governance</strong>
            <span>Run Sankalp, Sabha voting, Kosh contributions, role-based approvals, and audit-friendly reports.</span>
          </div>
        </div>
      </section>

      <section className="home-section market-section" id="market">
        <div className="home-section-heading">
          <span>Nyas as a product</span>
          <h2>Built first for one family, designed for many Indian families.</h2>
          <p>
            Nyas can serve large joint families, family trusts, ancestral-property families, and family businesses that want one private system for
            legacy, Kosh, Sankalp, documents, events, and family governance.
          </p>
        </div>
        <div className="customer-segment-grid">
          {customerSegments.map((segment) => (
            <article key={segment.title}>
              <Users size={20} />
              <h3>{segment.title}</h3>
              <p>{segment.text}</p>
            </article>
          ))}
        </div>
        <div className="market-position-card">
          <div>
            <span>Best first offer</span>
            <strong>Family Digitalization Camp</strong>
            <p>
              In 7 days, onboard one family with Parichay, Kul Map, photo archive, first Sankalp, and a branded family homepage. This creates immediate
              value before the annual subscription starts.
            </p>
          </div>
          <Link className="home-cta" to="/demo-request">
            Request Nyas demo
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="home-section pricing-section" id="pricing">
        <div className="home-section-heading">
          <span>Subscription direction</span>
          <h2>Simple plans for families, trusts, and legacy work.</h2>
        </div>
        <div className="pricing-grid">
          {productPlans.map((plan) => (
            <article key={plan.name}>
              <span>{plan.name}</span>
              <strong>{plan.price}</strong>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckCircle2 size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="pricing-note">
          <strong>One-time onboarding can be the first revenue driver.</strong>
          <span>Charge separately for data collection, tree cleanup, photo uploads, document organization, and first Sankalp setup.</span>
          <Link className="home-secondary" to="/demo-request">
            Plan a customer demo
          </Link>
        </div>
      </section>

      <section className="home-section home-snapshot-section">
        <div className="home-section-heading">
          <span>Demo snapshot</span>
          <h2>The live family workspace proves the model before we sell it wider.</h2>
        </div>
        <div className="home-snapshot-grid">
          <div>
            <span>Profiles in demo</span>
            <strong>{snapshot?.memberCount ?? "..."}</strong>
          </div>
          <div>
            <span>Known locations</span>
            <strong>{snapshot?.locationCount ?? "..."}</strong>
          </div>
          <div>
            <span>Product stage</span>
            <strong>Founding demo</strong>
          </div>
        </div>
        <div className="home-location-strip">
          {snapshot?.locations?.length ? (
            snapshot.locations.map((location) => (
              <span key={location.location}>
                {location.location} <strong>{location.count}</strong>
              </span>
            ))
          ) : (
            <span>A demo workspace can show real family adoption while protecting private customer data.</span>
          )}
        </div>
      </section>

      <section className="home-section family-gallery-section" id="gallery">
        <div className="home-section-heading">
          <span>Product preview</span>
          <h2>Nyas feels personal because it starts with real people, places, and memories.</h2>
        </div>
        <div className="family-gallery-grid">
          <figure>
            <img src={familyPhoto} alt="Nyasa family gathered together" />
            <figcaption>
              <strong>Family identity</strong>
              <span>Gatherings, milestones, branches, introductions, stories, and photographs.</span>
            </figcaption>
          </figure>
          <figure>
            <img src={familyHouse} alt="Family house at night" />
            <figcaption>
              <strong>Ancestral assets</strong>
              <span>Homes, farms, temples, repairs, documents, responsibilities, and shared decisions.</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <span>Core modules</span>
          <h2>The product already has the building blocks for a paid family workspace.</h2>
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
          <span>Interactive product view</span>
          <h2>Explain Nyas differently to buyers, members, and admins.</h2>
          <p>Each stakeholder should immediately understand why the platform matters to them and what action they can take first.</p>
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
          <h2>The roadmap turns Nyas into a complete family governance and legacy platform.</h2>
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
          <strong>Who pays for Nyas?</strong>
          <p>Usually one family head, trust office, family business, or small core group pays for setup and annual subscription.</p>
        </div>
        <div>
          <ShieldCheck size={24} />
          <strong>What is the first sale?</strong>
          <p>Sell a guided Family Digitalization Camp first, then continue with an annual workspace subscription.</p>
        </div>
        <div>
          <Landmark size={24} />
          <strong>When do we need separate EC2 and DB?</strong>
          <p>When we prepare a public demo or first paid customer. The market branch should use its own app host and database.</p>
        </div>
      </section>
    </main>
  );
}
