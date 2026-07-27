import { useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

export function MembersPage() {
  const [members, setMembers] = useState([]);
  const [invitedName, setInvitedName] = useState("Ajay Singh");
  const [invitedEmail, setInvitedEmail] = useState("ajay@example.com");
  const [intendedRole, setIntendedRole] = useState("member");
  const [inviteUrl, setInviteUrl] = useState("");
  const [message, setMessage] = useState("");

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  async function loadMembers() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    const response = await apiGet(`/members/family/${familyId}`);
    setMembers(response.data);
  }

  async function createInvitation(event) {
    event.preventDefault();
    const familyId = getFamilyId();
    setMessage("");
    setInviteUrl("");

    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      const response = await apiPost("/invitations", {
        familyId,
        invitedName,
        invitedEmail,
        intendedRole
      });
      setInviteUrl(`${window.location.origin}${response.data.inviteUrl}`);
      setMessage("Invitation created.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Directory"
        title="Members"
        description="Profiles, relationships, professions, cities, skills, and contribution history."
      />
      <section className="content-band">
        <h2>Invite Member</h2>
        <form className="form-grid" onSubmit={createInvitation}>
          <label>
            Name
            <input value={invitedName} onChange={(event) => setInvitedName(event.target.value)} />
          </label>
          <label>
            Email
            <input value={invitedEmail} onChange={(event) => setInvitedEmail(event.target.value)} type="email" />
          </label>
          <label>
            Role
            <select value={intendedRole} onChange={(event) => setIntendedRole(event.target.value)}>
              <option value="admin">Admin</option>
              <option value="project_lead">Project Lead</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="external_advisor">External Advisor</option>
            </select>
          </label>
          <button type="submit">Create Invite</button>
          <button type="button" className="secondary-button" onClick={loadMembers}>
            Load Members
          </button>
        </form>
        {message ? <p className="form-message">{message}</p> : null}
        {inviteUrl ? (
          <div className="copy-box">
            <span>{inviteUrl}</span>
          </div>
        ) : null}
      </section>
      <section className="content-band spaced-band">
        <h2>Members</h2>
        {members.length ? (
          <div className="list-stack">
            {members.map((member) => (
              <div className="list-row" key={member._id}>
                <span>{member.displayName}</span>
                <strong>{member.role}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>Load members after creating or selecting a family.</p>
        )}
      </section>
    </section>
  );
}
