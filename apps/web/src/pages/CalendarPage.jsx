import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function monthKey(value) {
  return new Date(value).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
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

export function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    title: "",
    eventType: "puja",
    startsAt: "",
    location: "",
    description: ""
  });
  const [message, setMessage] = useState("");

  const groupedEvents = useMemo(
    () =>
      events.reduce((groups, event) => {
        const key = monthKey(event.startsAt);
        return { ...groups, [key]: [...(groups[key] || []), event] };
      }, {}),
    [events]
  );

  async function loadCalendar() {
    try {
      const familyId = await getSelectedFamilyId();
      if (!familyId) {
        setMessage("Join the Alahdadpur Kul workspace first.");
        return;
      }

      const response = await apiGet(`/family-hub/family/${familyId}/calendar-events`);
      setEvents(response.data || []);
      setMessage(response.data?.length ? "Panchang loaded." : "No upcoming Kul events yet.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveEvent(event) {
    event.preventDefault();
    try {
      const familyId = await getSelectedFamilyId();
      if (!familyId) return;

      await apiPost(`/family-hub/family/${familyId}/calendar-events`, form);
      setForm({ title: "", eventType: "puja", startsAt: "", location: "", description: "" });
      await loadCalendar();
      setMessage("Kul Panchang event added.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadCalendar();
  }, []);

  return (
    <section>
      <PageHeader
        eyebrow="Kul Panchang"
        title="Panchang"
        description="Upcoming puja, fasts, Kul gatherings, meetings, and shared dates added by Sadasya."
      />

      <section className="content-band">
        <div className="tree-register-header">
          <div>
            <h2>Upcoming Events</h2>
            <p>Any Sadasya can add a Kul event. The newest entries appear here for everyone.</p>
          </div>
          <button type="button" className="secondary-button" onClick={loadCalendar}>
            Refresh
          </button>
        </div>

        {Object.keys(groupedEvents).length ? (
          <div className="calendar-month-list">
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div className="calendar-month" key={month}>
                <h3>{month}</h3>
                <div className="stack-list">
                  {monthEvents.map((item) => (
                    <article className="compact-row calendar-event-row" key={item.id}>
                      <span className="calendar-event-date">
                        <CalendarDays size={18} />
                        {formatDate(item.startsAt)}
                      </span>
                      <strong>{item.title}</strong>
                      <span>
                        {item.eventType}
                        {item.location ? ` - ${item.location}` : ""}
                      </span>
                      {item.description ? <p>{item.description}</p> : null}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No upcoming events yet. Add the first puja, fast, gathering, or Kul date.</p>
        )}
      </section>

      <section className="content-band spaced-band">
        <h2>Add Panchang Event</h2>
        <form className="form-grid compact-form" onSubmit={saveEvent}>
          <label>
            Event
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            Type
            <select value={form.eventType} onChange={(event) => setForm((current) => ({ ...current, eventType: event.target.value }))}>
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
            <input type="date" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
          </label>
          <label>
            Location
            <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
          </label>
          <label className="wide-field">
            Notes
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="3" />
          </label>
          <button type="submit">Add Event</button>
        </form>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
    </section>
  );
}
