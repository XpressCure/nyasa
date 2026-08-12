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

data class KoshSummary(
    val treasuryBalancePaise: Long = 0,
    val walletBalancePaise: Long = 0,
    val contributionThisYearPaise: Long = 0
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
    val projectLeadName: String = ""
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

data class FamilyMemberProfile(
    val id: String,
    val displayName: String,
    val role: String = "member",
    val status: String = "active",
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
    val work: WorkProfile = WorkProfile()
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
    val experienceYears: Int?
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

sealed interface LoginChallenge {
    data object None : LoginChallenge
    data object Phone : LoginChallenge
    data object Password : LoginChallenge
    data object PasswordSetup : LoginChallenge
}
