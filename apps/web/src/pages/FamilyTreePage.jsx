import { useEffect, useMemo, useState } from "react";
import { BookOpenText, CircleUserRound, HeartPulse, Network } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.jsx";
import { apiGet, apiPost } from "../lib/api.js";

const treeModes = [
  { id: "general", label: "General", icon: Network },
  { id: "education", label: "Education", icon: BookOpenText },
  { id: "health", label: "Health", icon: HeartPulse }
];

const familyTabs = [
  { id: "immediate", label: "My Family" },
  { id: "map", label: "Full Map" },
  { id: "register", label: "Register" },
  { id: "history", label: "History" }
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
  return `member-avatar ${member?.gender || "unknown"}${memberPhotoUrl(member) ? " has-photo" : ""}`;
}

function memberPhotoUrl(member) {
  if (member?.photoUrl) {
    return member.photoUrl.replace(/\/download$/, "/member-photo");
  }

  if (member?.familyId && member?.photoDocumentId) {
    return `/api/documents/family/${member.familyId}/${member.photoDocumentId}/member-photo`;
  }

  return "";
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

function parentIdsFor(member) {
  return [member?.fatherMemberId, member?.motherMemberId].filter(Boolean).map(String);
}

function coupleKeyFor(firstId, secondId = "") {
  return [String(firstId || ""), String(secondId || "")].filter(Boolean).sort().join(":");
}

function spouseForMember(member, memberById, spousesByMember = new Map()) {
  if (!member) return null;
  if (member.spouseMemberId && memberById.has(String(member.spouseMemberId))) {
    return memberById.get(String(member.spouseMemberId));
  }

  const reverseSpouse = [...memberById.values()].find((possibleSpouse) => String(possibleSpouse.spouseMemberId || "") === member._id);
  if (reverseSpouse) return reverseSpouse;

  return spousesByMember.get(member._id) || null;
}

function buildRelationshipMap(members, memberById) {
  const validMemberList = validMembers(members);
  const spousesByMember = new Map();
  const childrenByParentSet = new Map();
  const childIds = new Set();

  validMemberList.forEach((member) => {
    if (member.spouseMemberId && memberById.has(String(member.spouseMemberId))) {
      spousesByMember.set(member._id, memberById.get(String(member.spouseMemberId)));
    }
  });

  validMemberList.forEach((member) => {
    const father = member.fatherMemberId ? memberById.get(String(member.fatherMemberId)) : null;
    const mother = member.motherMemberId ? memberById.get(String(member.motherMemberId)) : null;

    if (father && mother) {
      if (!spousesByMember.has(father._id)) spousesByMember.set(father._id, mother);
      if (!spousesByMember.has(mother._id)) spousesByMember.set(mother._id, father);
    }

    const spouse = spousesByMember.get(member._id);
    if (spouse && !spousesByMember.has(spouse._id)) {
      spousesByMember.set(spouse._id, member);
    }

    parentIdsFor(member).forEach((parentId) => {
      const parentChildren = childrenByParentSet.get(parentId) || new Set();
      parentChildren.add(member._id);
      childrenByParentSet.set(parentId, parentChildren);
      childIds.add(member._id);
    });

    (member.childMemberIds || []).forEach((childMemberId) => {
      const child = memberById.get(String(childMemberId));
      if (!child) return;
      const parentChildren = childrenByParentSet.get(member._id) || new Set();
      parentChildren.add(child._id);
      childrenByParentSet.set(member._id, parentChildren);
      childIds.add(child._id);
    });
  });

  const childrenByParent = new Map(
    [...childrenByParentSet.entries()].map(([parentId, childIdSet]) => [
      parentId,
      [...childIdSet].map((childId) => memberById.get(childId)).filter(Boolean)
    ])
  );

  return { childIds, childrenByParent, spousesByMember };
}

function buildRelationshipGraph(members, memberById) {
  const validMemberList = validMembers(members);
  const relationships = buildRelationshipMap(validMemberList, memberById);
  const generationByMember = new Map(validMemberList.map((member) => [member._id, relationships.childIds.has(member._id) ? 1 : 0]));

  for (let index = 0; index < validMemberList.length + 4; index += 1) {
    let changed = false;

    validMemberList.forEach((member) => {
      parentIdsFor(member).forEach((parentId) => {
        const nextGeneration = (generationByMember.get(parentId) || 0) + 1;
        if ((generationByMember.get(member._id) || 0) < nextGeneration) {
          generationByMember.set(member._id, nextGeneration);
          changed = true;
        }
      });

      (relationships.childrenByParent.get(member._id) || []).forEach((child) => {
        const nextGeneration = (generationByMember.get(member._id) || 0) + 1;
        if ((generationByMember.get(child._id) || 0) < nextGeneration) {
          generationByMember.set(child._id, nextGeneration);
          changed = true;
        }
      });

      const spouse = spouseForMember(member, memberById, relationships.spousesByMember);
      if (spouse) {
        const sharedGeneration = Math.max(generationByMember.get(member._id) || 0, generationByMember.get(spouse._id) || 0);
        if (generationByMember.get(member._id) !== sharedGeneration || generationByMember.get(spouse._id) !== sharedGeneration) {
          generationByMember.set(member._id, sharedGeneration);
          generationByMember.set(spouse._id, sharedGeneration);
          changed = true;
        }
      }
    });

    if (!changed) break;
  }

  const generations = validMemberList.reduce((groups, member) => {
    const generation = generationByMember.get(member._id) || 0;
    return { ...groups, [generation]: [...(groups[generation] || []), member] };
  }, {});

  const nodeWidth = 238;
  const nodeHeight = 126;
  const columnGap = 34;
  const generationGap = 124;
  const padding = 34;
  const nodes = [];

  Object.entries(generations)
    .sort(([left], [right]) => Number(left) - Number(right))
    .forEach(([generation, generationMembers]) => {
      const orderedMembers = [];
      const usedIds = new Set();

      [...generationMembers]
        .sort((left, right) => left.displayName.localeCompare(right.displayName))
        .forEach((member) => {
          if (usedIds.has(member._id)) return;
          const spouse = spouseForMember(member, memberById, relationships.spousesByMember);
          orderedMembers.push(member);
          usedIds.add(member._id);
          if (spouse && generationMembers.some((item) => item._id === spouse._id) && !usedIds.has(spouse._id)) {
            orderedMembers.push(spouse);
            usedIds.add(spouse._id);
          }
        });

      orderedMembers.forEach((member, index) => {
        nodes.push({
          id: member._id,
          member,
          x: padding + index * (nodeWidth + columnGap),
          y: padding + Number(generation) * (nodeHeight + generationGap)
        });
      });
    });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeKeys = new Set();
  const edges = [];

  function addEdge(fromId, toId, type) {
    if (!nodeById.has(String(fromId)) || !nodeById.has(String(toId))) return;
    const key = type === "spouse" ? `${type}:${coupleKeyFor(fromId, toId)}` : `${type}:${fromId}:${toId}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ fromId: String(fromId), toId: String(toId), type });
  }

  function addParentCoupleEdge(firstParentId, secondParentId, childId) {
    if (!nodeById.has(String(firstParentId)) || !nodeById.has(String(secondParentId)) || !nodeById.has(String(childId))) return;
    const key = `parentCouple:${coupleKeyFor(firstParentId, secondParentId)}:${childId}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ fromId: String(firstParentId), spouseId: String(secondParentId), toId: String(childId), type: "parentCouple" });
  }

  validMemberList.forEach((member) => {
    const fatherId = member.fatherMemberId && nodeById.has(String(member.fatherMemberId)) ? String(member.fatherMemberId) : "";
    const motherId = member.motherMemberId && nodeById.has(String(member.motherMemberId)) ? String(member.motherMemberId) : "";

    if (fatherId && motherId) {
      addParentCoupleEdge(fatherId, motherId, member._id);
    } else {
      parentIdsFor(member).forEach((parentId) => addEdge(parentId, member._id, "parent"));
    }

    (member.childMemberIds || []).forEach((childMemberId) => {
      const child = memberById.get(String(childMemberId));
      if (child?.fatherMemberId || child?.motherMemberId) return;
      addEdge(member._id, childMemberId, "parent");
    });

    const spouse = spouseForMember(member, memberById, relationships.spousesByMember);
    if (spouse) addEdge(member._id, spouse._id, "spouse");
  });

  return {
    edges,
    nodeById,
    nodes,
    height: nodes.length ? Math.max(...nodes.map((node) => node.y)) + nodeHeight + padding : 260,
    width: nodes.length ? Math.max(...nodes.map((node) => node.x)) + nodeWidth + padding : 860,
    nodeHeight,
    nodeWidth
  };
}

export function FamilyTreePage() {
  const [activeTab, setActiveTab] = useState("immediate");
  const [mode, setMode] = useState("general");
  const [members, setMembers] = useState([]);
  const [links, setLinks] = useState([]);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [selfMemberId, setSelfMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    title: "",
    eventDate: "",
    eventYear: "",
    location: "",
    category: "family",
    description: "",
    sourceNote: ""
  });

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

  const relationshipGraph = useMemo(() => buildRelationshipGraph(members, memberById), [memberById, members]);

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
      const historyResponse = await apiGet(`/family-hub/family/${familyId}/history`);
      const treeData = response.data || {};
      const nextMembers = validMembers(treeData.members);
      setMembers(nextMembers);
      setLinks(treeData.links || []);
      setHistoryEvents(historyResponse.data || []);
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

  async function saveHistoryEvent(event) {
    event.preventDefault();
    try {
      const familyId = await ensureFamilyId();
      if (!familyId) return;

      await apiPost(`/family-hub/family/${familyId}/history`, {
        ...historyForm,
        eventYear: historyForm.eventYear || undefined,
        eventDate: historyForm.eventDate || undefined
      });
      setHistoryForm({
        title: "",
        eventDate: "",
        eventYear: "",
        location: "",
        category: "family",
        description: "",
        sourceNote: ""
      });
      await loadTree(mode);
      setMessage("Family history event added.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadTree("general");
  }, []);

  return (
    <section>
      <PageHeader
        eyebrow="Family Page"
        title="Family"
        description="One place for the immediate family view, complete family map, register, and family history."
      />
      <section className="content-band">
        <div className="family-tabs">
          {familyTabs.map((tab) => (
            <button className={activeTab === tab.id ? "active" : ""} key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab !== "history" ? (
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
        ) : null}

        {activeTab === "immediate" && isLoading ? (
          <div className="empty-state">
            <h3>Loading family tree</h3>
            <p>Fetching the latest family links.</p>
          </div>
        ) : null}

        {activeTab === "immediate" && !isLoading && selfMember ? (
          <div className="family-tree-board">
            <TreeLevel label="Parents" members={treeFamily.parents} secondaryLine={secondaryLine} emptyText="Add father and mother from Profile." />
            <div className="tree-connector" />
            <TreeLevel label="You and spouse" members={treeFamily.couple} secondaryLine={secondaryLine} featuredMemberId={selfMember._id} />
            <div className="tree-connector" />
            <TreeLevel label="Children" members={treeFamily.children} secondaryLine={secondaryLine} emptyText="Add children from Profile." />
          </div>
        ) : null}

        {activeTab === "immediate" && !isLoading && !selfMember ? (
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
        ) : null}

        {activeTab === "map" ? (
          <>
            <div className="tree-register-header">
              <div>
                <h2>Whole Family Map</h2>
                <p>One connected map. Solid gold lines show parent-child links; dashed brown lines show spouse or co-parent couples.</p>
              </div>
              <span>{members.length} profile{members.length === 1 ? "" : "s"} mapped</span>
            </div>
            <div className="expanded-family-map">
              {relationshipGraph.nodes.length ? (
                <RelationshipGraph graph={relationshipGraph} secondaryLine={secondaryLine} selfMemberId={selfMember?._id} />
              ) : (
                <div className="tree-empty-node">Add relatives from Profile to begin the full structure.</div>
              )}
            </div>
          </>
        ) : null}

        {activeTab === "register" ? (
          <>
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
          </>
        ) : null}

        {activeTab === "history" ? (
          <div className="family-history-panel">
            <div className="tree-register-header">
              <div>
                <h2>Family History</h2>
                <p>Chronological memories, milestones, migration notes, village events, and family achievements.</p>
              </div>
              <span>{historyEvents.length} event{historyEvents.length === 1 ? "" : "s"}</span>
            </div>
            <div className="history-timeline">
              {historyEvents.length ? (
                historyEvents.map((event) => (
                  <article className="history-event" key={event.id}>
                    <time>{event.eventDate ? formatDate(event.eventDate) : event.eventYear}</time>
                    <div>
                      <strong>{event.title}</strong>
                      <span>
                        {event.source === "profile" ? "Profile event" : event.category}
                        {event.location ? ` - ${event.location}` : ""}
                      </span>
                      {event.description ? <p>{event.description}</p> : null}
                      {event.sourceNote ? <small>{event.sourceNote}</small> : null}
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-copy">No family history events yet. Add the first remembered year or date.</p>
              )}
            </div>
            <form className="form-grid compact-form" onSubmit={saveHistoryEvent}>
              <label>
                Event title
                <input value={historyForm.title} onChange={(event) => setHistoryForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Exact date if known
                <input type="date" value={historyForm.eventDate} onChange={(event) => setHistoryForm((current) => ({ ...current, eventDate: event.target.value }))} />
              </label>
              <label>
                Year if exact date is unknown
                <input type="number" min="1600" max="2200" value={historyForm.eventYear} onChange={(event) => setHistoryForm((current) => ({ ...current, eventYear: event.target.value }))} />
              </label>
              <label>
                Category
                <select value={historyForm.category} onChange={(event) => setHistoryForm((current) => ({ ...current, category: event.target.value }))}>
                  <option value="family">Family</option>
                  <option value="village">Village</option>
                  <option value="education">Education</option>
                  <option value="migration">Migration</option>
                  <option value="property">Property</option>
                  <option value="spiritual">Spiritual</option>
                  <option value="achievement">Achievement</option>
                  <option value="memory">Memory</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Location
                <input value={historyForm.location} onChange={(event) => setHistoryForm((current) => ({ ...current, location: event.target.value }))} />
              </label>
              <label className="wide-field">
                Description
                <textarea value={historyForm.description} onChange={(event) => setHistoryForm((current) => ({ ...current, description: event.target.value }))} rows="3" />
              </label>
              <label className="wide-field">
                Source or memory note
                <input value={historyForm.sourceNote} onChange={(event) => setHistoryForm((current) => ({ ...current, sourceNote: event.target.value }))} />
              </label>
              <button type="submit">Add History Event</button>
            </form>
          </div>
        ) : null}
        {message ? <p className="form-message">{message}</p> : null}
      </section>
    </section>
  );
}

function RelationshipGraph({ graph, secondaryLine, selfMemberId }) {
  return (
    <div className="relationship-graph" style={{ height: graph.height, width: graph.width }}>
      <svg className="relationship-lines" height={graph.height} width={graph.width}>
        {graph.edges.map((edge) => {
          const fromNode = graph.nodeById.get(edge.fromId);
          const toNode = graph.nodeById.get(edge.toId);
          if (!fromNode || !toNode) return null;

          if (edge.type === "spouse") {
            const leftNode = fromNode.x <= toNode.x ? fromNode : toNode;
            const rightNode = fromNode.x <= toNode.x ? toNode : fromNode;
            const leftY = leftNode.y + graph.nodeHeight / 2;
            const rightY = rightNode.y + graph.nodeHeight / 2;
            return (
              <line
                className="relationship-line spouse-line"
                key={`${edge.type}-${edge.fromId}-${edge.toId}`}
                x1={leftNode.x + graph.nodeWidth}
                x2={rightNode.x}
                y1={leftY}
                y2={rightY}
              />
            );
          }

          if (edge.type === "parentCouple") {
            const spouseNode = graph.nodeById.get(edge.spouseId);
            if (!spouseNode) return null;

            const parentCenterX = (fromNode.x + graph.nodeWidth / 2 + spouseNode.x + graph.nodeWidth / 2) / 2;
            const startY = Math.max(fromNode.y, spouseNode.y) + graph.nodeHeight;
            const endX = toNode.x + graph.nodeWidth / 2;
            const endY = toNode.y;
            const midY = startY + Math.max(34, (endY - startY) / 2);

            return (
              <path
                className="relationship-line parent-line couple-parent-line"
                d={`M ${parentCenterX} ${startY} L ${parentCenterX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`}
                fill="none"
                key={`${edge.type}-${edge.fromId}-${edge.spouseId}-${edge.toId}`}
              />
            );
          }

          const startX = fromNode.x + graph.nodeWidth / 2;
          const startY = fromNode.y + graph.nodeHeight;
          const endX = toNode.x + graph.nodeWidth / 2;
          const endY = toNode.y;
          const midY = startY + Math.max(34, (endY - startY) / 2);

          return (
            <path
              className="relationship-line parent-line"
              d={`M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`}
              fill="none"
              key={`${edge.type}-${edge.fromId}-${edge.toId}`}
            />
          );
        })}
      </svg>
      {graph.nodes.map((node) => (
        <div className="relationship-node" key={node.id} style={{ left: node.x, top: node.y }}>
          <TreeCard
            isSelf={node.id === selfMemberId}
            member={node.member}
            relationCount={0}
            secondaryLine={secondaryLine}
            compact
          />
        </div>
      ))}
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
  const [hasImageError, setHasImageError] = useState(false);
  const photoUrl = memberPhotoUrl(member);

  useEffect(() => {
    setHasImageError(false);
  }, [member?._id, member?.photoUrl, member?.photoDocumentId]);

  return (
    <span className={avatarClassName(member)}>
      {photoUrl && !hasImageError ? (
        <img alt={`${member.displayName} profile`} src={photoUrl} onError={() => setHasImageError(true)} />
      ) : (
        memberIcon(member)
      )}
    </span>
  );
}
