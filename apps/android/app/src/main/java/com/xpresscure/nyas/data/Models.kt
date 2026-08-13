package com.xpresscure.nyas.data

data class NyasSession(
    val token: String,
    val userId: String,
    val fullName: String,
    val phone: String,
    val familyId: String,
    val familyName: String,
    val role: String,
    val memberId: String
)

data class DashboardMetrics(
    val members: Int = 0,
    val activeSankalp: Int = 0,
    val completedSankalp: Int = 0,
    val koshPaise: Long = 0,
    val contributedThisYearPaise: Long = 0
)

data class SankalpSummary(
    val id: String,
    val title: String,
    val stage: String,
    val targetPaise: Long,
    val allocatedPaise: Long
)

data class DashboardData(
    val metrics: DashboardMetrics = DashboardMetrics(),
    val featured: List<SankalpSummary> = emptyList()
)

data class FamilySnapshot(
    val memberCount: Int = 0,
    val livingMembers: Int = 0,
    val locationCount: Int = 0
)

data class FamilyCelebration(
    val memberId: String,
    val memberName: String,
    val type: String,
    val date: String,
    val daysUntil: Int
)

data class FamilyCalendarItem(
    val id: String,
    val title: String,
    val eventType: String,
    val startsAt: String,
    val location: String = ""
)

data class WeeklyFeature(
    val id: String,
    val title: String,
    val featureType: String,
    val url: String = "",
    val summary: String = ""
)

data class SankalpProposalVotes(
    val up: Int = 0,
    val down: Int = 0,
    val total: Int = 0,
    val score: Int = 0,
    val myVote: String = ""
)

data class SankalpProposal(
    val id: String,
    val title: String,
    val description: String,
    val category: String,
    val expectedImpact: String = "",
    val tentativeBudgetPaise: Long = 0,
    val status: String = "voting",
    val votingEndsAt: String = "",
    val proposedByName: String = "",
    val votes: SankalpProposalVotes = SankalpProposalVotes()
)

data class ProposalList(
    val canVote: Boolean = false,
    val proposals: List<SankalpProposal> = emptyList()
)

data class FamilyHubOverview(
    val snapshot: FamilySnapshot = FamilySnapshot(),
    val celebrations: List<FamilyCelebration> = emptyList(),
    val calendarEvents: List<FamilyCalendarItem> = emptyList(),
    val weeklyFeature: WeeklyFeature? = null
)

data class KoshSummary(
    val treasuryBalancePaise: Long = 0,
    val walletBalancePaise: Long = 0,
    val contributionThisYearPaise: Long = 0
)

data class KoshLedgerEntry(
    val id: String,
    val type: String,
    val direction: String,
    val amountPaise: Long,
    val description: String = "",
    val status: String = "posted",
    val projectTitle: String = "",
    val createdAt: String = ""
)

data class BankContributionConfig(
    val enabled: Boolean = false,
    val minimumAmountRupees: Long = 2000,
    val accountName: String = "Nyas Kul Kosh",
    val accountNumber: String = "",
    val ifsc: String = "",
    val upiId: String = "",
    val qrImageUrl: String = "",
    val paymentLink: String = ""
)

data class KoshDeclaration(
    val id: String,
    val memberName: String,
    val declaredAmountRupees: Long,
    val confirmedAmountRupees: Long? = null,
    val paymentReference: String,
    val utr: String = "",
    val paidAt: String = "",
    val sourceAccountLast4: String = "",
    val reconciliationStatus: String = "unreconciled",
    val reconciliationNote: String = ""
)

data class KoshBalanceSnapshot(
    val actualBankBalanceRupees: Long = 0,
    val expectedBankBalanceRupees: Long = 0,
    val differenceRupees: Long = 0,
    val asOfDate: String = ""
)

data class KoshReconciliation(
    val currentExpectedBankBalanceRupees: Long = 0,
    val latest: KoshBalanceSnapshot? = null,
    val declarations: List<KoshDeclaration> = emptyList()
)

data class FitnessDay(
    val date: String,
    val steps: Long = 0,
    val activeMinutes: Int = 0,
    val distanceMetres: Double = 0.0
)

data class FitnessPreference(
    val dailyStepGoal: Int = 6000,
    val shareWithFamily: Boolean = false,
    val connectedToHealthConnect: Boolean = false
)

data class FitnessChallenge(
    val title: String = "Nyas Kul Walk",
    val subtitle: String = "10 lakh steps, together",
    val targetSteps: Long = 1000000,
    val totalSteps: Long = 0,
    val participantCount: Int = 0
)

data class FitnessLeader(
    val memberId: String,
    val displayName: String,
    val photoUrl: String = "",
    val steps: Long = 0
)

data class FitnessDashboard(
    val preference: FitnessPreference = FitnessPreference(),
    val days: List<FitnessDay> = emptyList(),
    val streak: Int = 0,
    val challenge: FitnessChallenge = FitnessChallenge(),
    val leaderboard: List<FitnessLeader> = emptyList()
)

data class Sankalp(
    val id: String,
    val title: String,
    val description: String,
    val stage: String,
    val status: String,
    val budgetRequired: Boolean,
    val targetPaise: Long,
    val allocatedPaise: Long,
    val myAllocatedPaise: Long,
    val spentPaise: Long,
    val contributorCount: Int,
    val fundingPercent: Int,
    val fullyFunded: Boolean,
    val projectLeadMemberId: String = "",
    val auditorMemberId: String = "",
    val implementationLeadMemberId: String = "",
    val projectLeadName: String = "",
    val auditorName: String = "",
    val implementationLeadName: String = "",
    val rules: String = "",
    val completionPercent: Int = 0,
    val startDate: String = "",
    val targetCompletionDate: String = ""
)

data class SankalpMilestone(
    val id: String,
    val title: String,
    val description: String = "",
    val status: String = "pending",
    val dueDate: String = "",
    val budgetPaise: Long = 0,
    val actualSpendPaise: Long = 0
)

data class SankalpUpdate(
    val id: String,
    val title: String = "",
    val body: String,
    val updateType: String = "note",
    val progressPercent: Int? = null,
    val authorName: String = "",
    val createdAt: String = ""
)

data class SankalpWorkspace(
    val project: Sankalp,
    val milestones: List<SankalpMilestone> = emptyList(),
    val updates: List<SankalpUpdate> = emptyList(),
    val documentCount: Int = 0
)

data class SankalpManagementUpdate(
    val lifecycleStage: String? = null,
    val estimatedBudgetRupees: Long? = null,
    val completionPercent: Int? = null
)

data class ActionResult(
    val message: String,
    val amountPaise: Long = 0,
    val projectId: String = ""
)

data class EducationEntry(
    val institution: String = "",
    val degree: String = "",
    val year: Int? = null
)

data class WorkProfile(
    val currentPlace: String = "",
    val currentRole: String = "",
    val previousPlaces: String = "",
    val experienceYears: Int? = null
)

data class HealthProfile(
    val bloodGroup: String = "",
    val knownConditions: List<String> = emptyList(),
    val allergies: List<String> = emptyList(),
    val geneticNotes: String = ""
)

data class FamilyMemberProfile(
    val id: String,
    val displayName: String,
    val role: String = "member",
    val status: String = "active",
    val hasLogin: Boolean = false,
    val gender: String = "prefer_not_to_say",
    val livingStatus: String = "living",
    val dateOfBirth: String = "",
    val dateOfDeath: String = "",
    val yearOfDeath: Int? = null,
    val maritalStatus: String = "unknown",
    val anniversaryDate: String = "",
    val relationLabel: String = "",
    val placeOfResidence: String = "",
    val city: String = "",
    val state: String = "",
    val country: String = "",
    val profession: String = "",
    val bio: String = "",
    val photoUrl: String = "",
    val fatherMemberId: String = "",
    val motherMemberId: String = "",
    val spouseMemberId: String = "",
    val childrenCount: Int = 0,
    val intermediate: EducationEntry = EducationEntry(),
    val graduation: EducationEntry = EducationEntry(),
    val postGraduation: EducationEntry = EducationEntry(),
    val work: WorkProfile = WorkProfile(),
    val health: HealthProfile = HealthProfile()
)

data class ImmediateFamily(
    val father: FamilyMemberProfile? = null,
    val mother: FamilyMemberProfile? = null,
    val spouse: FamilyMemberProfile? = null,
    val children: List<FamilyMemberProfile> = emptyList()
)

data class FamilyTreeLink(
    val fromMemberId: String,
    val toMemberId: String,
    val relationship: String
)

data class FamilyTreeData(
    val selfMemberId: String,
    val members: List<FamilyMemberProfile>,
    val links: List<FamilyTreeLink>
)

data class ProfileUpdate(
    val displayName: String,
    val gender: String,
    val dateOfBirth: String,
    val livingStatus: String,
    val maritalStatus: String,
    val anniversaryDate: String,
    val placeOfResidence: String,
    val city: String,
    val state: String,
    val country: String,
    val profession: String,
    val bio: String,
    val currentPlace: String,
    val currentRole: String,
    val previousPlaces: String,
    val experienceYears: Int?,
    val intermediate: EducationEntry,
    val graduation: EducationEntry,
    val postGraduation: EducationEntry,
    val bloodGroup: String,
    val knownConditions: List<String>,
    val allergies: List<String>,
    val geneticNotes: String
)

data class VirasatEvent(
    val id: String,
    val title: String,
    val eventDate: String = "",
    val eventYear: Int? = null,
    val location: String = "",
    val category: String = "family",
    val description: String = "",
    val sourceNote: String = "",
    val automatic: Boolean = false
)

data class SmaranPoint(val x: Float, val y: Float)

data class SmaranStroke(
    val points: List<SmaranPoint>,
    val width: Float = 5f
)

data class SmaranContribution(
    val id: String,
    val memberId: String,
    val memberName: String,
    val isMine: Boolean,
    val strokes: List<SmaranStroke>,
    val savedAt: String = ""
)

data class SmaranPage(
    val date: String,
    val editable: Boolean,
    val contributions: List<SmaranContribution>
)

data class SmaranPageSummary(
    val date: String,
    val contributorCount: Int,
    val strokeCount: Int
)

sealed interface LoginChallenge {
    data object None : LoginChallenge
    data object Phone : LoginChallenge
    data object Password : LoginChallenge
    data object ProfileClaim : LoginChallenge
    data object AccountSetup : LoginChallenge
    data object Recovery : LoginChallenge
}

data class PasswordRecoveryGrant(
    val memberName: String,
    val recoveryCode: String,
    val expiresAt: String
)
