import { useEffect, useState } from "react";
import { Flag, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function celebrationLabel(item) {
  if (item.daysUntil === 0) return "Today";
  if (item.daysUntil === 1) return "Tomorrow";
  return `In ${item.daysUntil} days`;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

function carPosition(progress) {
  return Math.max(6, Math.min(94, progress));
}

async function getSelectedFamilyId() {
  const storedFamilyId = localStorage.getItem("nyasa_family_id");
  if (storedFamilyId) return storedFamilyId;

  const response = await apiGet("/families");
  const firstMembership = response.data[0];

  if (firstMembership?.familyId?._id) {
    localStorage.setItem("nyasa_family_id", firstMembership.familyId._id);
    return firstMembership.familyId._id;
  }

  return null;
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [hub, setHub] = useState(null);
  const [koshAnalytics, setKoshAnalytics] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("3m");
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState("");
  const [analyticsDateTo, setAnalyticsDateTo] = useState("");
  const [calendarForm, setCalendarForm] = useState({
    title: "",
    eventType: "puja",
    startsAt: "",
    location: "",
    description: ""
  });
  const [featureForm, setFeatureForm] = useState({
    title: "",
    featureType: "read",
    url: "",
    summary: ""
  });
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setMessage("");

    try {
      const familyId = await getSelectedFamilyId();
      if (!familyId) {
        setMessage("Join or create the Alahdadpur Kul workspace first.");
        return;
      }

      const params = new URLSearchParams();
      if (analyticsDateFrom || analyticsDateTo) {
        if (analyticsDateFrom) params.set("dateFrom", analyticsDateFrom);
        if (analyticsDateTo) params.set("dateTo", analyticsDateTo);
      } else {
        params.set("range", analyticsRange);
      }

      const [dashboardResponse, hubResponse, koshResponse] = await Promise.all([
        apiGet(`/families/${familyId}/dashboard`),
        apiGet(`/family-hub/family/${familyId}/overview`),
        apiGet(`/treasury/family/${familyId}/analytics?${params.toString()}`)
      ]);
      setDashboard(dashboardResponse.data);
      setHub(hubResponse.data);
      setKoshAnalytics(koshResponse.data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveCalendarEvent(event) {
    event.preventDefault();
    const familyId = await getSelectedFamilyId();
    if (!familyId) return;

    try {
      await apiPost(`/family-hub/family/${familyId}/calendar-events`, calendarForm);
      setCalendarForm({ title: "", eventType: "puja", startsAt: "", location: "", description: "" });
      await loadDashboard();
      setMessage("Kul Panchang event added.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveWeeklyFeature(event) {
    event.preventDefault();
    const familyId = await getSelectedFamilyId();
    if (!familyId) return;

    try {
      await apiPost(`/family-hub/family/${familyId}/weekly-feature`, featureForm);
      setFeatureForm({ title: "", featureType: "read", url: "", summary: "" });
      await loadDashboard();
      setMessage("Read/video of the week added.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = dashboard?.metrics;
  const ageGroups = metrics?.ageGroups?.groups || [];
  const stats = [
    ["Kul Sadasya", metrics?.memberCount ?? 0],
    ["Active Sankalp", metrics?.activeProjects ?? 0],
    ["Completed Sankalp", metrics?.completedProjects ?? 0],
    ["Kul Kosh", formatMoney(metrics?.treasuryBalance)],
    ["This Year", formatMoney(metrics?.contributionThisYear)]
  ];
  const memberCount = hub?.snapshot?.memberCount ?? metrics?.memberCount ?? 0;
  const locationCount = hub?.snapshot?.locationCount ?? 0;
  const activeProjects = metrics?.activeProjects ?? 0;
  const rallyCars = [
    {
      label: "Parichay Car",
      progress: clampPercent((memberCount / 70) * 100),
      detail: `${memberCount} profiles added`
    },
    {
      label: "Kul Map Car",
      progress: clampPercent((locationCount / 12) * 100),
      detail: `${locationCount} locations mapped`
    },
    {
      label: "Sankalp Car",
      progress: clampPercent((activeProjects / 5) * 100),
      detail: `${activeProjects} active Sankalp`
    }
  ];

  return (
    <section>
      <PageHeader
        eyebrow={dashboard?.family?.name || "Nyasa Trust - Alahdadpur"}
        title="Darshan"
        description="A live overview of the Alahdadpur Kul workspace, Kosh, Sankalp, decisions, and legacy."
      />
      <div className="metric-grid">
        {stats.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="content-band kosh-darshan-band">
        <div className="tree-register-header">
          <div>
            <h2>Kosh Darshan</h2>
            <p className="section-note">A quick money picture for contribution, allocation, implementation, and spending.</p>
          </div>
          <div className="button-row">
            <Link className="secondary-button" to="/treasury">
              Add or Allocate Kosh
            </Link>
            <Link className="secondary-button" to="/projects">
              View Sankalp
            </Link>
          </div>
        </div>
        <div className="kosh-filter-row">
          <label>
            Range
            <select
              value={analyticsRange}
              onChange={(event) => {
                setAnalyticsRange(event.target.value);
                setAnalyticsDateFrom("");
                setAnalyticsDateTo("");
              }}
            >
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="12m">Last 12 months</option>
            </select>
          </label>
          <label>
            From
            <input type="date" value={analyticsDateFrom} onChange={(event) => setAnalyticsDateFrom(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={analyticsDateTo} onChange={(event) => setAnalyticsDateTo(event.target.value)} />
          </label>
          <button type="button" onClick={loadDashboard}>
            Apply
          </button>
        </div>
        <div className="mission-financials kosh-analytics-grid">
          <div>
            <span>Total collected</span>
            <strong>{formatMoney(koshAnalytics?.totalCollected?.amountRupees || 0)}</strong>
          </div>
          <div>
            <span>Allotted</span>
            <strong>{formatMoney(koshAnalytics?.totalAllocated?.amountRupees || 0)}</strong>
          </div>
          <div>
            <span>Still in Kosh</span>
            <strong>{formatMoney(koshAnalytics?.unallocated?.amountRupees || 0)}</strong>
          </div>
          <div>
            <span>Implementation</span>
            <strong>{formatMoney(koshAnalytics?.implementationAllocated?.amountRupees || 0)}</strong>
          </div>
          <div>
            <span>Spent</span>
            <strong>{formatMoney(koshAnalytics?.totalSpent?.amountRupees || 0)}</strong>
          </div>
        </div>
      </section>
      <section className="content-band age-band">
        <div className="tree-register-header">
          <div>
            <h2>Age Groups / आयु वर्ग</h2>
            <p className="section-note">Living Sadasya grouped by date of birth. Sadasya without DOB are shown separately.</p>
          </div>
          <span>{metrics?.ageGroups?.unknownDateOfBirth ?? 0} DOB pending</span>
        </div>
        <div className="age-group-grid">
          {ageGroups.length ? (
            ageGroups.map((group) => (
              <article className="age-group-card" key={group.id}>
                <span>{group.label}</span>
                <strong>{group.count}</strong>
                <small>{group.englishLabel} - {group.rangeLabel}</small>
              </article>
            ))
          ) : (
            <p className="empty-copy">Age groups will appear after the dashboard loads.</p>
          )}
        </div>
      </section>
      <section className="content-band rally-band">
        <div className="tree-register-header">
          <div>
            <h2>Nyasa Rally</h2>
            <p className="section-note">A weekly coordination game. Cars move when the Kul completes useful work inside Nyasa.</p>
          </div>
          <span>
            <Trophy size={16} />
            First week
          </span>
        </div>
        <div className="rally-track-list">
          {rallyCars.map((car) => (
            <div className="rally-lane" key={car.label}>
              <div className="rally-lane-header">
                <strong>{car.label}</strong>
                <span>{car.detail}</span>
              </div>
              <div className="rally-track">
                <span className="rally-car" style={{ left: `${carPosition(car.progress)}%` }}>
                  N
                </span>
                <Flag className="rally-flag" size={18} />
              </div>
            </div>
          ))}
        </div>
        <div className="rally-task-grid">
          <span>Fill Parichay</span>
          <span>Upload photo</span>
          <span>Add parents, spouse, children</span>
          <span>Check Kul Map</span>
          <span>Add Panchang event</span>
          <span>Support Sankalp</span>
        </div>
      </section>
      <section className="dashboard-grid">
        <article className="content-band">
          <h2>Celebrations</h2>
          <p className="section-note">Birthdays and anniversaries appear one week in advance. Multiple Kul events can share the same date.</p>
          <div className="stack-list">
            {hub?.celebrations?.length ? (
              hub.celebrations.map((item) => (
                <div className="timeline-row compact-row" key={`${item.memberId}-${item.type}-${item.date}`}>
                  <strong>{item.memberName}</strong>
                  <span>{item.type === "birthday" ? "Birthday" : "Anniversary"} - {celebrationLabel(item)} - {formatDate(item.date)}</span>
                </div>
              ))
            ) : (
              <p className="empty-copy">No birthday or anniversary in the next week.</p>
            )}
          </div>
        </article>

        <article className="content-band">
          <h2>Kul Snapshot</h2>
          <div className="snapshot-grid">
            <div>
              <span>Parichay</span>
              <strong>{hub?.snapshot?.memberCount ?? metrics?.memberCount ?? 0}</strong>
            </div>
            <div>
              <span>Living members</span>
              <strong>{hub?.snapshot?.livingMembers ?? 0}</strong>
            </div>
            <div>
              <span>Locations</span>
              <strong>{hub?.snapshot?.locationCount ?? 0}</strong>
            </div>
          </div>
          <div className="location-list">
            {hub?.snapshot?.locations?.length ? (
              hub.snapshot.locations.map((location) => (
                <span key={location.location}>
                  {location.location} <strong>{location.count}</strong>
                </span>
              ))
            ) : (
              <p className="empty-copy">Locations will appear as profiles are completed.</p>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="content-band">
          <h2>{hub?.weeklyFeature?.featureType === "video" ? "Video of the Week" : "Read of the Week"}</h2>
          {hub?.weeklyFeature ? (
            <div className="feature-card">
              <strong>{hub.weeklyFeature.title}</strong>
              {hub.weeklyFeature.summary ? <p>{hub.weeklyFeature.summary}</p> : null}
              {hub.weeklyFeature.url ? (
                <a className="text-link" href={hub.weeklyFeature.url} target="_blank" rel="noreferrer">
                  Open {hub.weeklyFeature.featureType}
                </a>
              ) : null}
            </div>
          ) : (
            <p className="empty-copy">Add one article, speech, memory, or video for the Kul this week.</p>
          )}
          <form className="form-grid compact-form" onSubmit={saveWeeklyFeature}>
            <label>
              Type
              <select value={featureForm.featureType} onChange={(event) => setFeatureForm((current) => ({ ...current, featureType: event.target.value }))}>
                <option value="read">Read</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label>
              Title
              <input value={featureForm.title} onChange={(event) => setFeatureForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="wide-field">
              Link
              <input value={featureForm.url} onChange={(event) => setFeatureForm((current) => ({ ...current, url: event.target.value }))} />
            </label>
            <label className="wide-field">
              Why this week?
              <textarea value={featureForm.summary} onChange={(event) => setFeatureForm((current) => ({ ...current, summary: event.target.value }))} rows="3" />
            </label>
            <button type="submit">Save Weekly Feature</button>
          </form>
        </article>

        <article className="content-band">
          <div className="tree-register-header">
            <div>
              <h2>Panchang</h2>
              <p className="section-note">Any Sadasya can add upcoming puja, fast, gathering, or Kul date.</p>
            </div>
            <Link className="secondary-button" to="/calendar">
              Open Panchang
            </Link>
          </div>
          <div className="stack-list">
            {hub?.calendarEvents?.length ? (
              hub.calendarEvents.map((item) => (
                <div className="timeline-row compact-row" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.eventType} - {formatDate(item.startsAt)}{item.location ? ` - ${item.location}` : ""}</span>
                </div>
              ))
            ) : (
              <p className="empty-copy">No upcoming Kul Panchang events yet.</p>
            )}
          </div>
          <form className="form-grid compact-form" onSubmit={saveCalendarEvent}>
            <label>
              Event
              <input value={calendarForm.title} onChange={(event) => setCalendarForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              Type
              <select value={calendarForm.eventType} onChange={(event) => setCalendarForm((current) => ({ ...current, eventType: event.target.value }))}>
                <option value="puja">Puja</option>
                <option value="fast">Fast</option>
                <option value="gathering">Gathering</option>
                <option value="meeting">Meeting</option>
                <option value="ritual">Ritual</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Date
              <input type="date" value={calendarForm.startsAt} onChange={(event) => setCalendarForm((current) => ({ ...current, startsAt: event.target.value }))} />
            </label>
            <label>
              Location
              <input value={calendarForm.location} onChange={(event) => setCalendarForm((current) => ({ ...current, location: event.target.value }))} />
            </label>
            <label className="wide-field">
              Notes
              <textarea value={calendarForm.description} onChange={(event) => setCalendarForm((current) => ({ ...current, description: event.target.value }))} rows="3" />
            </label>
            <button type="submit">Add Panchang Event</button>
          </form>
        </article>
      </section>
      <section className="content-band">
        <h2>Launch Workspace</h2>
        <p>
          The live database is prepared with Alahdadpur Kul Parichay, Kosh, and launch Sankalp. Invite family members and ask them to complete
          their Parichay first.
        </p>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={loadDashboard}>
            Refresh Darshan
          </button>
          <Link className="secondary-button" to="/profile">
            Complete Parichay
          </Link>
          <Link className="secondary-button" to="/projects">
            View Sankalp
          </Link>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
    </section>
  );
}
