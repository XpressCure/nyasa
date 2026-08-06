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
    title: "Invite the extended Kul",
    text: "Owners can bring relatives into one Alahdadpur-rooted Kul workspace with clear roles."
  },
  {
    title: "Sadasya Parichay and stories",
    text: "Sadasya can sign in with name and phone, then add bio, city, profession, and their Kul connection."
  },
  {
    title: "Village Kosh and Sankalp",
    text: "Sadasya top up their wallet, allocate funds to Alahdadpur Sankalp, and track contribution progress."
  },
  {
    title: "Transparent work records",
    text: "Funded village work can collect expenses, attach bills, and route approvals through owner/admin review."
  }
];

const walkthrough = {
  member: {
    title: "For Kul Sadasya",
    points: ["Sign in with name and phone", "Accept Kul invite", "Update Parichay and bio", "Contribute to Alahdadpur Sankalp"]
  },
  owner: {
    title: "For owners",
    points: ["Create Kul workspace", "Invite Sadasya", "Create village Sankalp", "Approve expenses"]
  },
  launch: {
    title: "Launch today",
    points: ["Alahdadpur intro homepage", "Invite-only onboarding", "Parichay updates", "Village Sankalp funding demo"]
  }
};

const todaySteps = [
  {
    title: "1. Sign in",
    text: "Use your name and phone number. If your name is already in the Kul tree, न्यास will try to connect you to that profile."
  },
  {
    title: "2. Complete Parichay",
    text: "Add your photo, date of birth, location, education, work details, health notes, and whatever you know today."
  },
  {
    title: "3. Add immediate family",
    text: "Add or correct father, mother, spouse, and children. Photos are optional, but they make the tree easier for everyone."
  },
  {
    title: "4. Check Kul Map",
    text: "Open the family tree and check if parents, spouse, children, and grandparents are linked correctly. Missing details can be filled later."
  }
];

const futureSections = [
  {
    title: "Kul Gallery",
    text: "A shared album for Alahdadpur gatherings, homes, ceremonies, documents, and memories.",
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

const launchMessageHighlights = [
  "परिवार की विरासत, इतिहास और स्मृतियों को सुरक्षित रखना।",
  "Alahdadpur और पैतृक घर से जुड़े कार्यों को संगठित रूप से आगे बढ़ाना।",
  "Kosh और Sankalp को पारदर्शी तरीके से संचालित करना।",
  "हर सदस्य को Parichay, Kul Map, Sankalp Sabha और Yogdaan से जोड़ना।"
];

const launchSequenceSteps = [
  "Alahdadpur",
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
            <strong>न्यास Trust</strong>
            <small>Kul OS</small>
          </div>
        </div>
        <div className="home-nav-actions">
          <a href="#start">Start here</a>
          <a href="#gallery">Gallery</a>
          <a href="#village">Alahdadpur</a>
          <a href="#market">For families</a>
          <a href="#future">Coming next</a>
          <a href="#kosh">Kosh</a>
          <Link to="/legal">Legal</Link>
          <Link to="/login">Sign in</Link>
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
            Rooted in Alahdadpur
          </span>
          <h1>Ek gaon. Ek parivar. Ek vishwas. Ek virasat.</h1>
          <p>
            न्यास Trust is being built around Alahdadpur: a shared Kul platform to preserve our roots, coordinate village Sankalp, pool money
            into Kosh, and keep a transparent record of work, decisions, and legacy.
          </p>
          <p className="home-blessing-line">परिवार के सभी बड़े-बुजुर्गों, भाइयों, बहनों और बच्चों को सादर प्रणाम।</p>
          <div className="village-pill-row">
            <span>Alahdadpur</span>
            <span>Kul trust</span>
            <span>Village Sankalp</span>
          </div>
          <div className="home-actions">
            <Link className="home-cta" to="/login">
              Start profile today
              <ArrowRight size={18} />
            </Link>
            <Link className="home-secondary" to="/dashboard">
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="family-hero-card" aria-label="Nyasa family photo and portal preview">
          <img src={familyPhoto} alt="Nyasa family gathered together" />
          <div className="family-hero-overlay">
            <span>Alahdadpur Kul Trust</span>
            <strong>Ready to begin</strong>
          </div>
          <div className="portal-preview">
            <div className="preview-metrics">
              <div>
                <span>Parichay</span>
                <strong>{snapshot?.memberCount ?? "Live"}</strong>
              </div>
              <div>
                <span>Locations</span>
                <strong>{snapshot?.locationCount ?? "Ready"}</strong>
              </div>
              <div>
                <span>Live Sankalp</span>
                <strong>{snapshot?.sankalp?.activeCount ?? 0}</strong>
              </div>
            </div>
            <div className="preview-mission">
              <div>
                <strong>{featuredSankalp?.title || "Live Sankalp will appear here"}</strong>
                <span>
                  {featuredSankalp
                    ? `${formatPreviewMoney(featuredSankalp.allocatedRupees)} allocated of ${formatPreviewMoney(featuredSankalp.targetBudgetRupees)}`
                    : "Create or publish a Sankalp to show real progress here."}
                </span>
              </div>
              <div className="preview-progress">
                <span style={{ width: `${featuredSankalpProgress}%` }} />
              </div>
            </div>
            <div className="preview-row">
              <CheckCircle2 size={18} />
              {featuredSankalp ? `${featuredSankalpProgress}% live progress from Kosh records` : "Connected to live Alahdadpur workspace"}
            </div>
          </div>
        </div>
      </section>

      <section className="home-section today-start-section" id="start">
        <div className="home-section-heading">
          <span>For every family member today</span>
          <h2>न्यास से जुड़ें, Parichay भरें, और Kul tree देखें.</h2>
          <p>
            This first launch is about collecting correct family data. Do not worry if you do not know every date or detail. Add what you know,
            and the tree will become stronger as parents, siblings, spouses, and children update their own profiles.
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
            <strong>What should you tell relatives?</strong>
            <span>
              "Please open न्यास, sign in with your name and phone number, complete your Parichay, add immediate family, upload photos if
              available, and then check the Kul Map."
            </span>
          </div>
          <div className="home-actions">
            <Link className="home-cta" to="/login">
              Sign in / Join
              <ArrowRight size={18} />
            </Link>
            <Link className="home-secondary" to="/family-tree">
              Check Kul Map
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section launch-message-section" id="sankalp">
        <div className="launch-note-card">
          <span className="home-kicker">
            <Landmark size={16} />
            Nyas Launch
          </span>
          <h2>न्यास का शुभारंभ: परिवार, गाँव और भविष्य को जोड़ने वाला डिजिटल मंच।</h2>
          <p>
            Nyas केवल एक वेबसाइट नहीं है। यह परिवार की सामूहिक स्मृतियों, Parichay, Kul Map, Kosh, Sankalp, Sabha voting और Alahdadpur से जुड़े
            कार्यों का जीवंत डिजिटल घर है। यहाँ हर सदस्य अपनी जानकारी जोड़ सकता है, परिवार की शाखाओं को जोड़ सकता है, और आने वाले कार्यों में
            पारदर्शी रूप से भाग ले सकता है।
          </p>
          <blockquote>
            "विरासत केवल संभालने की चीज नहीं, मिलकर आगे बढ़ाने की जिम्मेदारी है।"
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
            <span>Sadasya add to wallet and allocate funds to specific village Sankalp.</span>
          </div>
          <div>
            <strong>Implement</strong>
            <span>Owners create missions, track budgets, review bills, and show progress.</span>
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
          <Link className="home-cta" to="/login">
            Use Nyas demo
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="home-section home-snapshot-section">
        <div className="home-section-heading">
          <span>Family snapshot</span>
          <h2>A quick view of the family network as profiles are completed.</h2>
        </div>
        <div className="home-snapshot-grid">
          <div>
            <span>Family profiles</span>
            <strong>{snapshot?.memberCount ?? "..."}</strong>
          </div>
          <div>
            <span>Known locations</span>
            <strong>{snapshot?.locationCount ?? "..."}</strong>
          </div>
          <div>
            <span>Root</span>
            <strong>Alahdadpur</strong>
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
            <span>Locations will grow as members fill their profiles.</span>
          )}
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

      <footer className="home-legal-footer">
        <div>
          <img src={nyasaLogo} alt="Nyas logo" />
          <div>
            <strong>Nyas</strong>
            <span>A private family membership platform</span>
          </div>
        </div>
        <p>
          Platform operated by <strong>Kumar Saurabh</strong>. Payments are accepted only from verified members for internal Kul activities and
          approved Sankalp. Nyas does not solicit public donations.
        </p>
        <div className="home-legal-links">
          <Link to="/legal">Legal, membership and payments</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms, cancellation and refunds</Link>
          <Link to="/login">Member sign in</Link>
        </div>
      </footer>
    </main>
  );
}
