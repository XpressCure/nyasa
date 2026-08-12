import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

function formatMoney(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value || 0);
}

function getFamilyId() {
  return localStorage.getItem("nyasa_family_id");
}

const initialForm = {
  title: "",
  category: "other",
  description: "",
  expectedImpact: "",
  tentativeBudgetRupees: "",
  votingEndsAt: ""
};

export function SankalpSabhaPage() {
  const [proposals, setProposals] = useState([]);
  const [canVote, setCanVote] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  async function loadProposals() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Select your Kul workspace first.");
      return;
    }

    try {
      const response = await apiGet(`/proposals/family/${familyId}`);
      setProposals(response.data.proposals || []);
      setCanVote(response.data.canVote);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submitProposal(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      const response = await apiPost(`/proposals/family/${familyId}`, {
        ...form,
        tentativeBudgetRupees: form.tentativeBudgetRupees || 0,
        votingEndsAt: form.votingEndsAt || undefined
      });
      setForm(initialForm);
      setMessage(response.message || "Sankalp proposal is open for voting.");
      await loadProposals();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function vote(proposalId, voteValue) {
    const familyId = getFamilyId();
    if (!familyId) return;

    try {
      const response = await apiPost(`/proposals/family/${familyId}/${proposalId}/vote`, { vote: voteValue });
      setMessage(response.message || "Your vote has been recorded.");
      setProposals((current) => current.map((proposal) => (proposal.id === proposalId ? response.data : proposal)));
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadProposals();
  }, []);

  return (
    <section>
      <PageHeader
        eyebrow="Sankalp Sabha"
        title="Sankalp Voting"
        description="Any Sadasya can propose an idea. Living Sadasya aged 15 years and above can vote once."
      />

      <section className="content-band sabha-intro-band">
        <div>
          <h2>How Sabha works</h2>
          <p className="section-note">
            Propose a Sankalp, explain why it matters, and let the Kul respond with upvote or downvote. The strongest ideas can later become formal Sankalp.
          </p>
        </div>
        <div className="sabha-rule-grid">
          <span>One member, one vote</span>
          <span>Only living members vote</span>
          <span>Age 15+ required</span>
          <span>Visible on Darshan</span>
        </div>
      </section>

      <section className="content-band spaced-band">
        <h2>Propose a Sankalp</h2>
        <form className="form-grid" onSubmit={submitProposal}>
          <label>
            Sankalp title
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
              <option value="renovation">Renovation</option>
              <option value="asset_maintenance">Asset maintenance</option>
              <option value="community">Community</option>
              <option value="research">Research</option>
              <option value="business_study">Business study</option>
              <option value="education">Education</option>
              <option value="health">Health</option>
              <option value="event">Event</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Tentative budget
            <input
              type="number"
              min="0"
              value={form.tentativeBudgetRupees}
              onChange={(event) => setForm((current) => ({ ...current, tentativeBudgetRupees: event.target.value }))}
            />
          </label>
          <label className="wide-field">
            What should be done?
            <textarea rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="wide-field">
            Why is this useful for the Kul?
            <textarea rows="3" value={form.expectedImpact} onChange={(event) => setForm((current) => ({ ...current, expectedImpact: event.target.value }))} />
          </label>
          <label>
            Voting closes on
            <input type="date" value={form.votingEndsAt} onChange={(event) => setForm((current) => ({ ...current, votingEndsAt: event.target.value }))} />
          </label>
          <button type="submit">Open for Voting</button>
        </form>
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="content-band spaced-band">
        <div className="section-heading-row">
          <div>
            <h2>Voting Now</h2>
            <p className="section-note">A vote cannot be changed after it is recorded.</p>
          </div>
          <button type="button" className="secondary-button" onClick={loadProposals}>
            Refresh
          </button>
        </div>

        <div className="proposal-grid">
          {proposals.length ? (
            proposals.map((proposal) => (
              <article className="proposal-card" key={proposal.id}>
                <div className="project-card-header compact-header">
                  <h3>{proposal.title}</h3>
                  <span>{proposal.status}</span>
                </div>
                <p>{proposal.description}</p>
                {proposal.expectedImpact ? <small>{proposal.expectedImpact}</small> : null}
                <div className="project-summary">
                  <span>{proposal.category}</span>
                  <span>{proposal.tentativeBudgetRupees ? formatMoney(proposal.tentativeBudgetRupees) : "No budget yet"}</span>
                  <span>Score {proposal.votes.score}</span>
                  <span>Total votes {proposal.votes.total}</span>
                </div>
                <div className="vote-meter">
                  <span style={{ width: `${proposal.votes.total ? Math.round((proposal.votes.up / proposal.votes.total) * 100) : 0}%` }} />
                </div>
                <div className="vote-actions">
                  <button type="button" disabled={!canVote || proposal.votes.myVote} onClick={() => vote(proposal.id, "up")}>
                    Upvote {proposal.votes.up}
                  </button>
                  <button type="button" disabled={!canVote || proposal.votes.myVote} className="secondary-button" onClick={() => vote(proposal.id, "down")}>
                    Downvote {proposal.votes.down}
                  </button>
                </div>
                {proposal.votes.myVote ? <p className="section-note">You voted: {proposal.votes.myVote}</p> : null}
              </article>
            ))
          ) : (
            <p className="empty-copy">No Sankalp is currently open for Sabha voting.</p>
          )}
        </div>
      </section>
    </section>
  );
}
