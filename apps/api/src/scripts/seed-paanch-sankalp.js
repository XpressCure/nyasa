import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AuditLog } from "../models/AuditLog.js";
import { Family } from "../models/Family.js";
import { FamilyMember } from "../models/FamilyMember.js";
import { Milestone } from "../models/Milestone.js";
import { Project } from "../models/Project.js";
import { ProjectMember } from "../models/ProjectMember.js";
import { ProjectUpdate } from "../models/ProjectUpdate.js";
import { User } from "../models/User.js";

const familySlug = process.env.NYASA_FAMILY_SLUG || "nyasa-trust-alahdadpur";

const sankalpSeeds = [
  {
    title: "इक्कीस पेड़ माँ के नाम",
    possibleTitles: ["इक्कीस पेड़ माँ के नाम संकल्प", "एक पेड़ माँ के नाम संकल्प"],
    slug: "ikkis-ped-maa-ke-naam",
    description:
      "अलहदादपुर में 21 मजबूत और दीर्घायु पेड़ लगाकर आने वाली पीढ़ियों के लिए छाया, हरियाली और अपनेपन की पहचान बनाना।",
    rules:
      "स्थानीय दीर्घायु प्रजातियों जैसे अर्जुन, पाकड़, बरगद, पीपल आदि का चयन होगा। हर पौधे का स्थान, सुरक्षा, पानी और देखभाल की जिम्मेदारी स्पष्ट रूप से दर्ज होगी। सफलता का माप केवल पौधारोपण नहीं, बल्कि नियमित संरक्षण होगा।",
    category: "community",
    projectType: "implementation",
    budgetRequired: true,
    tentativeBudgetRupees: 11000,
    estimatedBudgetRupees: 11000,
    lifecycleStage: "fundraising",
    status: "active",
    startDate: "2026-08-01",
    targetCompletionDate: "2026-08-31",
    lead: ["Kiran Bala Singh", "Kiran Bala"],
    helpers: [["Malay Kumar Singh", "Malay Singh"], ["Dr. Abhinav Singh", "Abhinav Singh"]],
    milestones: [
      ["प्रजाति और स्थान तय", "दीर्घायु प्रजातियों और 21 सुरक्षित स्थानों की अंतिम सूची।", "2026-08-03", 0],
      ["पौधे और सुरक्षा सामग्री", "पौधे, ट्री-गार्ड, पानी और देखभाल व्यवस्था तैयार।", "2026-08-06", 11000],
      ["सभी 21 पौधे रोपे जाएँ", "हर पौधे का स्थान और जिम्मेदार सदस्य दर्ज करते हुए पौधारोपण।", "2026-08-10", 0],
      ["पहली जीवितता समीक्षा", "पौधों की स्थिति, पानी और सुरक्षा की समीक्षा।", "2026-08-31", 0]
    ]
  },
  {
    title: "नन्ही खुशियाँ, नए रिश्ते",
    possibleTitles: ["नन्ही खुशियाँ, नए रिश्ते - परिवार से जुड़ाव संकल्प"],
    slug: "nanhi-khushiyan-naye-rishte",
    description:
      "बच्चों और नवविवाहित दम्पत्तियों को प्रारम्भ से परिवार से जोड़ना, ताकि वे अपनी खुशी, पहचान और भविष्य को परिवार के साथ महसूस करें।",
    rules:
      "इस संकल्प के लिए अलग टीम आवश्यक नहीं है। पात्र बच्चों और दम्पत्तियों की पारदर्शी सूची और वार्षिक कैलेंडर बनेगा। 10 वर्ष से कम आयु के बच्चों को जन्मदिन पर ₹2,100 और विवाह के प्रथम पाँच वर्षों के भीतर दम्पत्तियों को वर्षगाँठ पर ₹5,100 तक उपहार दिया जाएगा, उपलब्ध कोष के अनुसार।",
    category: "event",
    projectType: "event",
    budgetRequired: true,
    tentativeBudgetRupees: 38400,
    estimatedBudgetRupees: 38400,
    lifecycleStage: "fundraising",
    status: "active",
    startDate: "2026-08-01",
    targetCompletionDate: "2026-08-10",
    lead: [],
    helpers: [],
    milestones: [
      ["पात्र सूची और वार्षिक कैलेंडर", "बच्चों और नवविवाहित दम्पत्तियों की सूची, जन्मदिन और वर्षगाँठ कैलेंडर।", "2026-08-10", 0],
      ["संकल्प योगदान के लिए खुला", "परिवार के सदस्य स्वैच्छिक योगदान कर सकें और भुगतान रिकॉर्ड पारदर्शी रहे।", "2026-08-10", 0]
    ]
  },
  {
    title: "पैतृक गृह सुविधा उन्नयन",
    slug: "paitrik-grih-suvidha-unnayan",
    description:
      "गाँव के पैतृक घर की रसोई और शौचालयों को शीघ्र, सुरक्षित और उपयोग योग्य बनाना, ताकि घर परिवार के सदस्यों के स्वागत के लिए तैयार रहे।",
    rules:
      "रसोई में मजबूत प्लेटफॉर्म, सिंक, जलापूर्ति, निकासी, सुरक्षित खाना बनाने की जगह और उपयोगी भंडारण पर ध्यान होगा। शौचालयों में दरवाजे, नल, पानी, निकासी और तत्काल आवश्यक मरम्मत की जाएगी। लक्ष्य कम खर्च नहीं, बल्कि टिकाऊ गुणवत्ता और पारदर्शी बिल/फोटो रिपोर्ट है।",
    category: "renovation",
    projectType: "implementation",
    budgetRequired: true,
    tentativeBudgetRupees: 50000,
    estimatedBudgetRupees: 50000,
    lifecycleStage: "fundraising",
    status: "active",
    startDate: "2026-08-01",
    targetCompletionDate: "2026-09-15",
    lead: ["Dr. Shivangi", "Shivangi"],
    helpers: [["Vaibhav Singh", "Kumar Vaibhav Singh", "kumar vaibhav singh"], ["Avinash Singh"]],
    milestones: [
      ["निरीक्षण और कार्य-सूची", "रसोई, शौचालय और अन्य आवश्यक मरम्मत की प्राथमिक सूची।", "2026-08-05", 0],
      ["दो अनुमान प्राप्त", "काम के लिए कम से कम दो व्यवहारिक अनुमान।", "2026-08-10", 0],
      ["अंतिम प्रस्ताव और स्वीकृति", "गुणवत्ता, खर्च और समय-सीमा के आधार पर अंतिम प्रस्ताव।", "2026-08-12", 0],
      ["पूरा कार्य समाप्त", "बिल, पहले-बाद की तस्वीरें और संक्षिप्त रिपोर्ट के साथ कार्य पूर्ण।", "2026-09-15", 50000]
    ]
  },
  {
    title: "अलहदादपुर भविष्य उद्यम खोज",
    slug: "alahdadpur-bhavishya-udyam-khoj",
    description:
      "टिकाऊ और व्यावहारिक व्यवसायों की पहचान करना, जो परिवार के लिए अवसर, गाँव के लिए रोजगार और समाज के लिए उपयोग पैदा करें।",
    rules:
      "टीम स्थानीय संसाधन, बाजार और वास्तविक आवश्यकता का अध्ययन करेगी। हर सुझाव में निवेश, आवश्यक भूमि/संसाधन, आय शुरू होने का समय, लाभ, जोखिम और छोटे पायलट की राह स्पष्ट होगी। बड़ी रिपोर्ट का इंतजार नहीं; कम जोखिम और स्पष्ट सामाजिक उपयोग वाले विचार पर छोटा पायलट प्रस्तावित होगा।",
    category: "community",
    projectType: "business_study",
    budgetRequired: false,
    tentativeBudgetRupees: 0,
    estimatedBudgetRupees: 0,
    lifecycleStage: "research",
    status: "active",
    startDate: "2026-08-01",
    targetCompletionDate: "2026-09-15",
    lead: ["Dr. Pawan Kumar Singh", "Pawan Kumar Singh"],
    helpers: [["Sanjeev Kumar Singh"], ["Abhishek Kumar Singh", "Himanshu", "Abhishek Kumar Singh Himanshu"]],
    helperRole: "researcher",
    milestones: [
      ["तीन प्रारम्भिक सुझाव", "तीन व्यवहारिक उद्यम विचारों की प्राथमिक सूची।", "2026-08-15", 0],
      ["परिवार से चर्चा", "अनुभवी सदस्यों और संबंधित विशेषज्ञों से चर्चा।", "2026-08-20", 0],
      ["तुलनात्मक अध्ययन", "जोखिम, निवेश, उपयोग और व्यवहारिकता के आधार पर तुलना।", "2026-08-31", 0],
      ["छोटे पायलट का प्रस्ताव", "एक कम जोखिम पायलट के लिए स्पष्ट प्रस्ताव।", "2026-09-15", 0]
    ]
  },
  {
    title: "पारिवारिक धरोहर एवं संपत्ति सुरक्षा",
    slug: "parivarik-dharohar-sampatti-suraksha",
    description:
      "पैतृक घर, परिसर और परिवार की भूमि को सुरक्षित, स्पष्ट रूप से दर्ज और भविष्य के उपयोग के लिए तैयार करना।",
    rules:
      "घर और परिसर की संरचनात्मक सुरक्षा, सीमाएँ, अतिक्रमण/धोखाधड़ी जोखिम और तत्काल सुरक्षा कदम दर्ज होंगे। सभी जमीनों की सूची, स्थान, क्षेत्रफल, वर्तमान उपयोग, खसरा, खतौनी, नक्शा और उपलब्ध दस्तावेज इकट्ठे किए जाएँगे। अंतिम लक्ष्य पारदर्शी पारिवारिक संपत्ति रजिस्टर है।",
    category: "asset_maintenance",
    projectType: "asset_management",
    budgetRequired: false,
    tentativeBudgetRupees: 0,
    estimatedBudgetRupees: 0,
    lifecycleStage: "research",
    status: "active",
    startDate: "2026-08-01",
    targetCompletionDate: "2026-10-31",
    lead: ["Rajendra Kumar Singh"],
    helpers: [["Anil Kumar Singh", "Anil Singh"], ["Anup Singh", "Anoop Singh"]],
    helperRole: "member",
    milestones: [
      ["घर और परिसर निरीक्षण", "घर, परिसर और सीमाओं का प्राथमिक निरीक्षण।", "2026-08-10", 0],
      ["संपत्तियों की प्रारम्भिक सूची", "स्थान, क्षेत्रफल और वर्तमान उपयोग सहित प्रारम्भिक सूची।", "2026-08-20", 0],
      ["दस्तावेज संकलन", "खसरा, खतौनी, नक्शा और उपलब्ध कागजों का संकलन।", "2026-09-15", 0],
      ["प्रथम संपत्ति रजिस्टर", "जोखिम और अगले कदम सहित पारिवारिक संपत्ति रजिस्टर।", "2026-10-31", 0]
    ]
  }
];

function rupeesToPaise(value) {
  return Math.round(Number(value || 0) * 100);
}

function normalizeName(value = "") {
  return value
    .toLowerCase()
    .replace(/\b(dr|dr\.|shri|smt|mr|mrs|late|lt)\b/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function withoutUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

async function findMemberByAliases(familyId, aliases = []) {
  if (!aliases.length) return { member: null, status: "empty", aliases };

  const members = await FamilyMember.find({
    familyId,
    status: "active"
  }).select("displayName role livingStatus");

  const normalizedAliases = aliases.map(normalizeName).filter(Boolean);
  const exactMatches = members.filter((member) => normalizedAliases.includes(normalizeName(member.displayName)));

  if (exactMatches.length === 1) return { member: exactMatches[0], status: "matched", aliases };
  if (exactMatches.length > 1) return { member: null, status: "ambiguous", aliases, matches: exactMatches.map((member) => member.displayName) };

  const partialMatches = members.filter((member) => {
    const normalizedMemberName = normalizeName(member.displayName);
    return normalizedAliases.some((alias) => alias.length >= 4 && (normalizedMemberName.includes(alias) || alias.includes(normalizedMemberName)));
  });

  if (partialMatches.length === 1) return { member: partialMatches[0], status: "matched", aliases };
  if (partialMatches.length > 1) return { member: null, status: "ambiguous", aliases, matches: partialMatches.map((member) => member.displayName) };

  return { member: null, status: "missing", aliases };
}

async function upsertProjectMember({ familyId, projectId, memberId, role, addedBy }) {
  if (!memberId) return null;

  return ProjectMember.findOneAndUpdate(
    { projectId, memberId },
    {
      $setOnInsert: { familyId, projectId, memberId, addedBy, addedAt: new Date() },
      $set: { role, status: "active" }
    },
    { upsert: true, new: true }
  );
}

async function upsertMilestones({ familyId, project, owner, milestones }) {
  const records = [];

  for (const [index, milestone] of milestones.entries()) {
    const [title, description, dueDate, budgetRupees] = milestone;
    const record = await Milestone.findOneAndUpdate(
      { familyId, projectId: project._id, title },
      {
        $setOnInsert: {
          familyId,
          projectId: project._id,
          title,
          createdBy: owner._id
        },
        $set: {
          description,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          budgetPaise: rupeesToPaise(budgetRupees),
          sortOrder: index
        }
      },
      { upsert: true, new: true }
    );
    records.push(record);
  }

  return records;
}

async function upsertIntroUpdate({ familyId, project, owner, ownerMember, seed, unresolvedNames }) {
  const existing = await ProjectUpdate.findOne({
    familyId,
    projectId: project._id,
    title: "पाँच प्रारम्भिक संकल्प booklet import"
  });

  const unresolvedLine = unresolvedNames.length
    ? `\n\nध्यान दें: इन नामों को active Sadasya profile से स्वतः नहीं जोड़ा जा सका: ${unresolvedNames.join(", ")}.`
    : "";

  const body = `यह Sankalp पाँच प्रारम्भिक संकल्प booklet से live किया गया है.\n\nउद्देश्य: ${seed.description}\n\nसंचालन का सार: ${seed.rules}${unresolvedLine}`;

  if (existing) {
    existing.body = body;
    existing.updateType = seed.projectType === "business_study" ? "research" : "note";
    await existing.save();
    return existing;
  }

  return ProjectUpdate.create({
    familyId,
    projectId: project._id,
    updateType: seed.projectType === "business_study" ? "research" : "note",
    title: "पाँच प्रारम्भिक संकल्प booklet import",
    body,
    createdByMember: ownerMember._id,
    createdBy: owner._id
  });
}

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.MONGODB_URI);

  const family = await Family.findOne({ slug: familySlug, status: "active" });
  if (!family) throw new Error(`Family not found for slug: ${familySlug}`);

  const ownerMember = await FamilyMember.findOne({ familyId: family._id, role: "owner", status: "active" }).populate("userId");
  if (!ownerMember) throw new Error("Active owner member not found.");

  const owner = ownerMember.userId || (await User.findById(ownerMember.userId));
  if (!owner) throw new Error("Owner user not found.");

  const results = [];

  for (const seed of sankalpSeeds) {
    const leadResult = await findMemberByAliases(family._id, seed.lead);
    const helperResults = [];
    for (const helperAliases of seed.helpers) {
      helperResults.push(await findMemberByAliases(family._id, helperAliases));
    }

    const existingProject = await Project.findOne({
      familyId: family._id,
      $or: [{ slug: seed.slug }, { title: seed.title }, ...(seed.possibleTitles || []).map((title) => ({ title }))]
    });
    const projectFilter = existingProject
      ? { _id: existingProject._id }
      : {
        familyId: family._id,
        slug: seed.slug
      };

    const project = await Project.findOneAndUpdate(
      projectFilter,
      {
        $setOnInsert: {
          familyId: family._id,
          slug: seed.slug,
          createdBy: owner._id,
          visibility: "family",
          currency: "INR"
        },
        $set: withoutUndefined({
          title: seed.title,
          description: seed.description,
          category: seed.category,
          projectType: seed.projectType,
          status: seed.status,
          lifecycleStage: seed.lifecycleStage,
          rules: seed.rules,
          budgetRequired: seed.budgetRequired,
          tentativeBudgetPaise: rupeesToPaise(seed.tentativeBudgetRupees),
          estimatedBudgetPaise: rupeesToPaise(seed.estimatedBudgetRupees),
          targetBudgetPaise: seed.budgetRequired ? rupeesToPaise(seed.estimatedBudgetRupees || seed.tentativeBudgetRupees) : 0,
          startDate: new Date(seed.startDate),
          targetCompletionDate: new Date(seed.targetCompletionDate),
          projectLeadMemberId: leadResult.member?._id,
          implementationLeadMemberId: helperResults[0]?.member?._id,
          auditorMemberId: helperResults[1]?.member?._id,
          completionPercent: 0
        })
      },
      { upsert: true, new: true }
    );

    await upsertProjectMember({
      familyId: family._id,
      projectId: project._id,
      memberId: leadResult.member?._id,
      role: "project_manager",
      addedBy: ownerMember._id
    });

    for (const helperResult of helperResults) {
      await upsertProjectMember({
        familyId: family._id,
        projectId: project._id,
        memberId: helperResult.member?._id,
        role: seed.helperRole || "member",
        addedBy: ownerMember._id
      });
    }

    const milestones = await upsertMilestones({ familyId: family._id, project, owner, milestones: seed.milestones });
    const unresolvedNames = [leadResult, ...helperResults]
      .filter((result) => result.status === "missing" || result.status === "ambiguous")
      .map((result) => `${result.aliases.join(" / ")}${result.matches?.length ? ` (matches: ${result.matches.join(", ")})` : ""}`);
    await upsertIntroUpdate({ familyId: family._id, project, owner, ownerMember, seed, unresolvedNames });

    const existingAudit = await AuditLog.findOne({
      familyId: family._id,
      action: "paanch_sankalp.seeded",
      entityType: "Project",
      entityId: String(project._id)
    });

    if (!existingAudit) {
      await AuditLog.create({
        familyId: family._id,
        actorUserId: owner._id,
        actorMemberId: ownerMember._id,
        action: "paanch_sankalp.seeded",
        entityType: "Project",
        entityId: String(project._id),
        summary: `Seeded ${seed.title} from पाँच प्रारम्भिक संकल्प booklet.`
      });
    }

    results.push({
      title: project.title,
      id: project._id,
      slug: project.slug,
      lead: leadResult.member?.displayName || null,
      helpers: helperResults.map((result) => result.member?.displayName || null),
      milestones: milestones.length,
      unresolvedNames
    });
  }

  console.log("Paanch Sankalp seeded.");
  console.log(JSON.stringify({ family: family.name, results }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Failed to seed Paanch Sankalp", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
