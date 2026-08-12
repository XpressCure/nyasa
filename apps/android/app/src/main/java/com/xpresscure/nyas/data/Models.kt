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

sealed interface LoginChallenge {
    data object None : LoginChallenge
    data object Phone : LoginChallenge
    data object Password : LoginChallenge
    data object PasswordSetup : LoginChallenge
}
