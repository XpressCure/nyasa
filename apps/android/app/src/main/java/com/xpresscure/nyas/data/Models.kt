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

sealed interface LoginChallenge {
    data object None : LoginChallenge
    data object Phone : LoginChallenge
    data object Password : LoginChallenge
    data object PasswordSetup : LoginChallenge
}
