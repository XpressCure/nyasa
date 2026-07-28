import { useEffect, useMemo, useState } from "react";
import { BookOpenText, CircleUserRound, HeartPulse, Network } from "lucide-react";
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
  if (member?.gender === "male") return <span className="avatar-letter">M</span>;
  if (member?.gender === "female") return <span className="avatar-letter">F</span>;
  return <CircleUserRound size={22} />;
}

function avatarClassName(member) {
  return `member-avatar ${member?.gender || "unknown"}${member?.photoUrl ? " has-photo" : ""}`;
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

function validMembers(value) {
  return Array.isArray(value) ? value.filter((member) => member && member._id) : [];
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

function buildWholeFamilyTree(members, links, memberById) {
  const childrenByParent = new Map();
  const childIds = new Set();

  links.forEach((link) => {
    if (!["father", "mother", "child"].includes(link.relationship)) return;

    const parent = memberById.get(String(link.fromMemberId || ""));
    const child = memberById.get(String(link.toMemberId || ""));

    if (!parent || !child) return;

    childIds.add(child._id);
    const existingChildren = childrenByParent.get(parent._id) || [];
    if (!existingChildren.some((existingChild) => existingChild._id === child._id)) {
      childrenByParent.set(parent._id, [...existingChildren, child]);
    }
  });

  const roots = validMembers(members).filter((member) => !childIds.has(member._id));

  return {
    childrenByParent,
    roots: roots.length ? roots : validMembers(members).slice(0, 1)
  };
}

export function FamilyTreePage() {
  const [mode, setMode] = useState("general");
  const [members, setMembers] = useState([]);
  const [links, setLinks] = useState([]);
  const [selfMemberId, setSelfMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const memberById = useMemo(() => new Map(validMembers(members).map((member) => [member._id, member])), [members]);
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
    const childrenFromSpouseLinks = (spouse?.childMemberIds || []).map((childMemberId) => memberById.get(String(childMemberId)));
    const childrenFromParentLinks = validMembers(members).filter(
      (member) =>
        String(member.fatherMemberId || "") === selfMember._id ||
        String(member.motherMemberId || "") === selfMember._id ||
        String(member.fatherMemberId || "") === spouse?._id ||
        String(member.motherMemberId || "") === spouse?._id
    );
    const children = uniqueMembers([...childrenFromExplicitLinks, ...childrenFromSpouseLinks, ...childrenFromParentLinks]);
    const couple = uniqueMembers([selfMember, spouse]);
    const linkedIds = new Set([...parents, ...couple, ...children].map((member) => member._id));

    return { parents, couple, children, linkedIds };
  }, [memberById, members, selfMember]);

  const wholeFamilyTree = useMemo(() => buildWholeFamilyTree(members, links, memberById), [memberById, members, links]);

  function getFamilyId() {
    return localStorage.getItem("nyasa_family_id");
  }

  async function ensureFamilyId() {
    let familyId = getFamilyId();

    if (familyId) return familyId;

    const familiesResponse = await apiGet("/families");
    const firstMembership = familiesResponse.data?.[0];
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
      const nextMembers = validMembers(treeData.members);
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
    return member?.placeOfResidence || member?.city || member?.relationLabel || "Relationship details pending";
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
          <div>
            <h2>Whole Family Structure</h2>
            <p>Each new parent-child link extends this tree across the complete family.</p>
          </div>
          <span>{links.length} saved link{links.length === 1 ? "" : "s"}</span>
        </div>
        <div className="whole-tree">
          {wholeFamilyTree.roots.length ? (
            wholeFamilyTree.roots.map((member) => (
              <FamilyBranch
                childrenByParent={wholeFamilyTree.childrenByParent}
                key={member._id}
                member={member}
                secondaryLine={secondaryLine}
              />
            ))
          ) : (
            <div className="tree-empty-node">Add relatives from Profile to begin the full structure.</div>
          )}
        </div>

        <div className="tree-register-header">
          <h2>Family Register</h2>
          <span>{members.length} profile{members.length === 1 ? "" : "s"}</span>
        </div>
        <div className="tree-grid">
          {validMembers(members).map((member) => (
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

function FamilyBranch({ member, childrenByParent, secondaryLine, visited = new Set(), depth = 0 }) {
  if (!member || visited.has(member._id) || depth > 8) return null;

  const nextVisited = new Set(visited);
  nextVisited.add(member._id);
  const children = (childrenByParent.get(member._id) || []).filter((child) => !nextVisited.has(child._id));

  return (
    <div className="family-branch">
      <TreeCard member={member} relationCount={children.length} secondaryLine={secondaryLine} compact />
      {children.length ? (
        <div className="family-branch-children">
          {children.map((child) => (
            <FamilyBranch
              childrenByParent={childrenByParent}
              depth={depth + 1}
              key={child._id}
              member={child}
              secondaryLine={secondaryLine}
              visited={nextVisited}
            />
          ))}
        </div>
      ) : null}
    </div>
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
  if (!member) return null;

  return (
    <article className={`tree-member-card ${member.gender || "unknown"}${isSelf ? " self" : ""}${isMuted ? " muted" : ""}${compact ? " compact" : ""}`}>
      <MemberAvatar member={member} />
      <div>
        <h3>{member.displayName}</h3>
        <p>{secondaryLine(member)}</p>
        <small>{lifeLine(member)}</small>
        {compact ? null : <small>{relationCount} linked relation{relationCount === 1 ? "" : "s"}</small>}
      </div>
    </article>
  );
}

function MemberAvatar({ member }) {
  const [photoSrc, setPhotoSrc] = useState("");

  useEffect(() => {
    let objectUrl = "";
    let isActive = true;

    async function loadPhoto() {
      if (!member?.photoUrl) {
        setPhotoSrc("");
        return;
      }

      try {
        const token = localStorage.getItem("nyasa_token");
        const response = await fetch(member.photoUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          throw new Error("Photo could not be loaded.");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (isActive) setPhotoSrc(objectUrl);
      } catch (_error) {
        if (isActive) setPhotoSrc("");
      }
    }

    loadPhoto();

    return () => {
      isActive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [member?._id, member?.photoUrl]);

  return (
    <span className={avatarClassName(member)}>
      {photoSrc ? <img alt={`${member.displayName} profile`} src={photoSrc} /> : memberIcon(member)}
    </span>
  );
}
