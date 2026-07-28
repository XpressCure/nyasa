import { useEffect, useMemo, useState } from "react";
import { BookOpenText, CircleUserRound, HeartPulse, Mars, Network, Venus } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet } from "../lib/api.js";

const treeModes = [
  { id: "general", label: "General", icon: Network },
  { id: "education", label: "Education", icon: BookOpenText },
  { id: "health", label: "Health", icon: HeartPulse }
];

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function memberIcon(member) {
  if (member?.gender === "male") return <Mars size={22} />;
  if (member?.gender === "female") return <Venus size={22} />;
  return <CircleUserRound size={22} />;
}

function educationLine(member) {
  const graduation = member?.education?.graduation?.degree || member?.education?.graduation?.institution;
  const postGraduation = member?.education?.postGraduation?.degree || member?.education?.postGraduation?.institution;
  const intermediate = member?.education?.intermediate?.institution;
  return postGraduation || graduation || intermediate || "Education details pending";
}

function healthLine(member) {
  const conditions = member?.health?.knownConditions?.join(", ");
  return conditions || member?.health?.bloodGroup || member?.health?.geneticNotes || "Health details pending";
}

function lifeLine(member) {
  if (!member) return "";
  if (member.livingStatus === "deceased") {
    return `Remembered${member.dateOfDeath ? `, ${formatDate(member.dateOfDeath)}` : member.yearOfDeath ? `, ${member.yearOfDeath}` : ""}`;
  }
  return member.dateOfBirth ? `Born ${formatDate(member.dateOfBirth)}` : "Dates pending";
}

function uniqueMembers(members) {
  const seen = new Set();
  return members.filter((member) => {
    if (!member?._id || seen.has(member._id)) return false;
    seen.add(member._id);
    return true;
  });
}

export function FamilyTreePage() {
  const [mode, setMode] = useState("general");
  const [members, setMembers] = useState([]);
  const [links, setLinks] = useState([]);
  const [selfMemberId, setSelfMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const memberById = useMemo(() => new Map(members.map((member) => [member._id, member])), [members]);
  const selfMember = memberById.get(selfMemberId) || members[0] || null;

  const treeFamily = useMemo(() => {
    if (!selfMember) {
      return { parents: [], couple: [], children: [], linkedIds: new Set() };
    }

    const parents = uniqueMembers([
      memberById.get(String(selfMember.fatherMemberId || "")),
      memberById.get(String(selfMember.motherMemberId || ""))
    ]);
    const spouse = memberById.get(String(selfMember.spouseMemberId || ""));
    const childrenFromExplicitLinks = (selfMember.childMemberIds || []).map((childMemberId) => memberById.get(String(childMemberId)));
    const childrenFromParentLinks = members.filter(
      (member) => String(member.fatherMemberId || "") === selfMember._id || String(member.motherMemberId || "") === selfMember._id
    );
    const children = uniqueMembers([...childrenFromExplicitLinks, ...childrenFromParentLinks]);
    const couple = uniqueMembers([selfMember, spouse]);
    const linkedIds = new Set([...parents, ...couple, ...children].map((member) => member._id));

    return { parents, couple, children, linkedIds };
  }, [memberById, members, selfMember]);

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  async function ensureFamilyId() {
    let familyId = getFamilyId();

    if (familyId) return familyId;

    const familiesResponse = await apiGet("/families");
    const firstMembership = familiesResponse.data[0];
    if (firstMembership?.familyId?._id) {
      familyId = firstMembership.familyId._id;
      localStorage.setItem("nyasa_family_id", familyId);
    }

    return familyId;
  }

  async function loadTree(nextMode = mode) {
    setIsLoading(true);
    try {
      const familyId = await ensureFamilyId();
      if (!familyId) {
        setMembers([]);
        setLinks([]);
        setSelfMemberId("");
        setMessage("Join the Alahdadpur family workspace first.");
        return;
      }

      const response = await apiGet(`/members/family/${familyId}/tree?mode=${nextMode}`);
      const treeData = response.data || {};
      const nextMembers = treeData.members || [];
      setMembers(nextMembers);
      setLinks(treeData.links || []);
      setSelfMemberId(String(treeData.selfMemberId || ""));
      setMessage(nextMembers.length ? "Tree data loaded." : "No family members found yet.");
    } catch (error) {
      setMembers([]);
      setLinks([]);
      setSelfMemberId("");
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    loadTree(nextMode);
  }

  function relationCount(memberId) {
    return links.filter((link) => link.fromMemberId === memberId || link.toMemberId === memberId).length;
  }

  function secondaryLine(member) {
    if (mode === "education") return educationLine(member);
    if (mode === "health") return healthLine(member);
    return member.placeOfResidence || member.city || member.relationLabel || "Relationship details pending";
  }

  useEffect(() => {
    loadTree("general");
  }, []);

  return (
    <section>
      <PageHeader
        eyebrow="Family Map"
        title="Family Tree"
        description="A first live tree around your immediate family. Each member can keep extending it by adding their parents, spouse, and children."
      />
      <section className="content-band">
        <div className="tree-toolbar">
          {treeModes.map((treeMode) => {
            const Icon = treeMode.icon;
            return (
              <button
                className={mode === treeMode.id ? "active" : ""}
                key={treeMode.id}
                type="button"
                onClick={() => changeMode(treeMode.id)}
              >
                <Icon size={18} />
                {treeMode.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="empty-state">
            <h3>Loading family tree</h3>
            <p>Fetching the latest family links.</p>
          </div>
        ) : selfMember ? (
          <div className="family-tree-board">
            <TreeLevel label="Parents" members={treeFamily.parents} secondaryLine={secondaryLine} emptyText="Add father and mother from Profile." />
            <div className="tree-connector" />
            <TreeLevel label="You and spouse" members={treeFamily.couple} secondaryLine={secondaryLine} featuredMemberId={selfMember._id} />
            <div className="tree-connector" />
            <TreeLevel label="Children" members={treeFamily.children} secondaryLine={secondaryLine} emptyText="Add children from Profile." />
          </div>
        ) : (
          <div className="empty-state">
            <h3>Tree is not available yet</h3>
            <p>{message || "Open Profile and add father, mother, spouse, or children to start the tree."}</p>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => loadTree(mode)}>
                Retry
              </button>
              <Link className="secondary-button" to="/profile">
                Open Profile
              </Link>
            </div>
          </div>
        )}

        <div className="tree-register-header">
          <h2>Family Register</h2>
          <span>{members.length} profile{members.length === 1 ? "" : "s"}</span>
        </div>
        <div className="tree-grid">
          {members.map((member) => (
            <TreeCard
              isMuted={!treeFamily.linkedIds.has(member._id)}
              isSelf={member._id === selfMember?._id}
              key={member._id}
              member={member}
              relationCount={relationCount(member._id)}
              secondaryLine={secondaryLine}
            />
          ))}
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
    </section>
  );
}

function TreeLevel({ label, members, secondaryLine, featuredMemberId = "", emptyText = "" }) {
  return (
    <div className="tree-level">
      <span className="tree-level-label">{label}</span>
      <div className="tree-level-members">
        {members.length ? (
          members.map((member) => (
            <TreeCard
              isSelf={member._id === featuredMemberId}
              key={member._id}
              member={member}
              relationCount={0}
              secondaryLine={secondaryLine}
              compact
            />
          ))
        ) : (
          <div className="tree-empty-node">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function TreeCard({ member, secondaryLine, relationCount, isSelf = false, isMuted = false, compact = false }) {
  return (
    <article className={`tree-member-card ${member.gender || "unknown"}${isSelf ? " self" : ""}${isMuted ? " muted" : ""}${compact ? " compact" : ""}`}>
      <span className="member-avatar">{memberIcon(member)}</span>
      <div>
        <h3>{member.displayName}</h3>
        <p>{secondaryLine(member)}</p>
        <small>{lifeLine(member)}</small>
        {compact ? null : <small>{relationCount} linked relation{relationCount === 1 ? "" : "s"}</small>}
      </div>
    </article>
  );
}
