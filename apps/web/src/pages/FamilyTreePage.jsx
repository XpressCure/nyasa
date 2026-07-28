import { useEffect, useState } from "react";
import { BookOpenText, CircleUserRound, HeartPulse, Mars, Network, Venus } from "lucide-react";
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
  if (member.gender === "male") return <Mars size={22} />;
  if (member.gender === "female") return <Venus size={22} />;
  return <CircleUserRound size={22} />;
}

function educationLine(member) {
  const graduation = member.education?.graduation?.degree || member.education?.graduation?.institution;
  const postGraduation = member.education?.postGraduation?.degree || member.education?.postGraduation?.institution;
  const intermediate = member.education?.intermediate?.institution;
  return postGraduation || graduation || intermediate || "Education details pending";
}

function healthLine(member) {
  const conditions = member.health?.knownConditions?.join(", ");
  return conditions || member.health?.bloodGroup || member.health?.geneticNotes || "Health details pending";
}

export function FamilyTreePage() {
  const [mode, setMode] = useState("general");
  const [members, setMembers] = useState([]);
  const [links, setLinks] = useState([]);
  const [message, setMessage] = useState("");

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
    const familyId = await ensureFamilyId();
    if (!familyId) {
      setMessage("Join the Alahdadpur family workspace first.");
      return;
    }

    try {
      const response = await apiGet(`/members/family/${familyId}/tree?mode=${nextMode}`);
      setMembers(response.data.members);
      setLinks(response.data.links);
      setMessage(response.data.members.length ? "Tree data loaded." : "No family members found yet.");
    } catch (error) {
      setMessage(error.message);
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
        description="Start with immediate relationships. As relatives add their parents, spouses, and children, Nyasa will stitch the larger tree together."
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
        <div className="tree-grid">
          {members.map((member) => (
            <article className={`tree-member-card ${member.gender || "unknown"}`} key={member._id}>
              <span className="member-avatar">{memberIcon(member)}</span>
              <div>
                <h3>{member.displayName}</h3>
                <p>{secondaryLine(member)}</p>
                <small>
                  {member.livingStatus === "deceased"
                    ? `Remembered${member.dateOfDeath ? `, ${formatDate(member.dateOfDeath)}` : member.yearOfDeath ? `, ${member.yearOfDeath}` : ""}`
                    : member.dateOfBirth
                      ? `Born ${formatDate(member.dateOfBirth)}`
                      : "Dates pending"}
                </small>
                <small>{relationCount(member._id)} linked relation{relationCount(member._id) === 1 ? "" : "s"}</small>
              </div>
            </article>
          ))}
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
    </section>
  );
}
