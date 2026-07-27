import { useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost, apiPostEmpty } from "../lib/api.js";

export function MembersPage() {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [invitedName, setInvitedName] = useState("Ajay Singh");
  const [invitedEmail, setInvitedEmail] = useState("ajay@example.com");
  const [intendedRole, setIntendedRole] = useState("member");
  const [inviteUrl, setInviteUrl] = useState("");
  const [message, setMessage] = useState("");
  const [copiedUrl, setCopiedUrl] = useState("");

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  async function loadMembers() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      const response = await apiGet(`/members/family/${familyId}`);
      setMembers(response.data);
      setMessage(response.data.length ? "Loaded members." : "No members found.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadInvitations() {
    const familyId = getFamilyId();
    if (!familyId) {
      setMessage("Create or select a family first.");
      return;
    }

    try {
      const response = await apiGet(`/invitations/family/${familyId}`);
      setInvitations(response.data);
      setMessage(response.data.length ? "Loaded invitation history." : "No invitations yet.");
    } catch (error) {
      setMessage(error.message);
    }
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
      const absoluteInviteUrl = `${window.location.origin}${response.data.inviteUrl}`;
      setInviteUrl(absoluteInviteUrl);
      setMessage("Invitation created.");
      await loadInvitations();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyInvite(url) {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setMessage("Invite link copied.");
  }

  async function revokeInvite(invitationId) {
    try {
      await apiPostEmpty(`/invitations/${invitationId}/revoke`);
      setMessage("Invitation revoked.");
      await loadInvitations();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function absoluteInviteUrl(invitation) {
    return invitation.inviteUrl ? `${window.location.origin}${invitation.inviteUrl}` : "";
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
          <button type="button" className="secondary-button" onClick={loadInvitations}>
            Load Invites
          </button>
        </form>
        {message ? <p className="form-message">{message}</p> : null}
        {inviteUrl ? (
          <div className="copy-box">
            <span>{inviteUrl}</span>
            <button type="button" onClick={() => copyInvite(inviteUrl)}>
              {copiedUrl === inviteUrl ? "Copied" : "Copy"}
            </button>
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
      <section className="content-band spaced-band">
        <h2>Invitation History</h2>
        {invitations.length ? (
          <div className="list-stack">
            {invitations.map((invitation) => {
              const url = absoluteInviteUrl(invitation);
              return (
                <div className="invite-row" key={invitation.id}>
                  <div>
                    <strong>{invitation.invitedName || invitation.invitedEmail || invitation.invitedPhone}</strong>
                    <span>{invitation.intendedRole.replace("_", " ")} · {invitation.status}</span>
                  </div>
                  <div className="row-actions">
                    {url ? (
                      <button type="button" className="secondary-button" onClick={() => copyInvite(url)}>
                        {copiedUrl === url ? "Copied" : "Copy"}
                      </button>
                    ) : null}
                    {invitation.status === "pending" ? (
                      <button type="button" className="secondary-button" onClick={() => revokeInvite(invitation.id)}>
                        Revoke
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>Load invitations to see pending, accepted, and revoked invites.</p>
        )}
      </section>
    </section>
  );
}
