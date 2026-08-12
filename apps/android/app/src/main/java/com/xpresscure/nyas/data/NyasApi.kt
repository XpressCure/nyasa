package com.xpresscure.nyas.data

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.xpresscure.nyas.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import java.time.Instant
import java.util.UUID

class ApiException(val code: String, message: String) : Exception(message)

class NyasApi {
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .build()

    suspend fun login(name: String, phone: String, password: String, confirmPassword: String): NyasSession =
        withContext(Dispatchers.IO) {
            val body = JsonObject().apply {
                addProperty("fullName", name.trim())
                if (phone.isNotBlank()) addProperty("phone", phone.trim())
                if (password.isNotBlank()) addProperty("password", password)
                if (confirmPassword.isNotBlank()) addProperty("confirmPassword", confirmPassword)
            }
            val root = execute("/auth/login", "POST", body)
            val data = root.objectAt("data")
            val user = data.objectAt("user")
            val family = data.objectOrNull("family")
            val member = data.objectOrNull("member")
            NyasSession(
                token = data.string("token"),
                userId = user.string("id", user.string("_id")),
                fullName = user.string("fullName", name),
                phone = user.string("phone", phone),
                familyId = family?.let { it.string("_id", it.string("id")) } ?: "",
                familyName = family?.string("name", "Nyas") ?: "Nyas",
                role = member?.string("role", "member") ?: "member",
                memberId = member?.let { it.string("_id", it.string("id")) } ?: ""
            )
        }

    suspend fun dashboard(session: NyasSession): DashboardData = withContext(Dispatchers.IO) {
        if (session.familyId.isBlank()) return@withContext DashboardData()
        val data = execute("/families/${session.familyId}/dashboard", token = session.token).objectAt("data")
        val metrics = data.objectOrNull("metrics") ?: JsonObject()
        val projects = data.arrayOrNull("featuredProjects")
        DashboardData(
            metrics = DashboardMetrics(
                members = metrics.int("memberCount"),
                activeSankalp = metrics.int("activeProjects"),
                completedSankalp = metrics.int("completedProjects"),
                koshPaise = metrics.long("treasuryBalance"),
                contributedThisYearPaise = metrics.long("contributionThisYear")
            ),
            featured = projects?.mapNotNull { item ->
                item.takeIf { it.isJsonObject }?.asJsonObject?.let {
                    SankalpSummary(
                        id = it.string("_id", it.string("id")),
                        title = it.string("title", "Sankalp"),
                        stage = it.string("stage", "planning"),
                        targetPaise = it.long("targetBudgetPaise", it.long("estimatedBudgetPaise")),
                        allocatedPaise = it.long("allocatedAmountPaise")
                    )
                }
            }.orEmpty()
        )
    }

    suspend fun koshSummary(session: NyasSession): KoshSummary = withContext(Dispatchers.IO) {
        val data = execute("/treasury/family/${session.familyId}/summary", token = session.token).objectAt("data")
        KoshSummary(
            treasuryBalancePaise = data.objectAt("treasury").long("balancePaise"),
            walletBalancePaise = data.objectAt("wallet").long("balancePaise"),
            contributionThisYearPaise = data.long("contributionThisYearPaise")
        )
    }

    suspend fun bankContributionConfig(session: NyasSession): BankContributionConfig = withContext(Dispatchers.IO) {
        val data = execute("/bank-contributions/family/${session.familyId}/config", token = session.token).objectAt("data")
        BankContributionConfig(
            enabled = data.bool("enabled"),
            minimumAmountRupees = data.long("minimumAmountRupees", 2000),
            accountName = data.string("accountName", "Nyas Kul Kosh"),
            accountNumber = data.string("accountNumber"),
            ifsc = data.string("ifsc"),
            upiId = data.string("upiId"),
            qrImageUrl = data.string("qrImageUrl"),
            paymentLink = data.string("paymentLink")
        )
    }

    suspend fun sankalp(session: NyasSession): List<Sankalp> = withContext(Dispatchers.IO) {
        execute("/projects/family/${session.familyId}", token = session.token).arrayAt("data").mapNotNull { element ->
            element.takeIf { it.isJsonObject }?.asJsonObject?.let { data ->
                Sankalp(
                    id = data.string("id", data.string("_id")),
                    title = data.string("title", "Sankalp"),
                    description = data.string("description"),
                    stage = data.string("lifecycleStage", "concept"),
                    status = data.string("status", "proposed"),
                    budgetRequired = data.bool("budgetRequired", true),
                    targetPaise = data.long("targetBudgetPaise"),
                    allocatedPaise = data.long("allocatedPaise"),
                    myAllocatedPaise = data.long("myAllocatedPaise"),
                    spentPaise = data.long("spentPaise"),
                    contributorCount = data.int("contributorCount"),
                    fundingPercent = data.int("fundingPercent"),
                    fullyFunded = data.bool("isFullyFunded"),
                    projectLeadName = data.objectOrNull("projectLeadMember")?.string("displayName") ?: ""
                )
            }
        }
    }

    suspend fun declareBankContribution(session: NyasSession, amountRupees: Long, note: String = ""): ActionResult =
        withContext(Dispatchers.IO) {
            val body = JsonObject().apply {
                addProperty("amountRupees", amountRupees)
                addProperty("paidAt", Instant.now().toString())
                addProperty("note", note)
                addProperty("attested", true)
                addProperty("declarationToken", UUID.randomUUID().toString())
            }
            val root = execute("/bank-contributions/family/${session.familyId}/declarations", "POST", body, session.token)
            ActionResult(root.string("message", "Your contribution has been recorded."), amountRupees * 100)
        }

    suspend fun allocate(session: NyasSession, projectId: String, amountRupees: Long): ActionResult =
        withContext(Dispatchers.IO) {
            val body = JsonObject().apply {
                addProperty("projectId", projectId)
                addProperty("amountRupees", amountRupees)
                addProperty("description", "Allocated from Nyas Android app")
            }
            val root = execute("/treasury/family/${session.familyId}/allocations", "POST", body, session.token)
            val data = root.objectAt("data")
            ActionResult(
                message = root.string("message", "Funds allocated to Sankalp."),
                amountPaise = data.long("amountPaise"),
                projectId = data.string("projectId", projectId)
            )
        }

    private fun execute(path: String, method: String = "GET", body: JsonObject? = null, token: String = ""): JsonObject {
        val request = Request.Builder()
            .url(BuildConfig.API_BASE_URL.trimEnd('/') + path)
            .header("Accept", "application/json")
            .apply {
                if (token.isNotBlank()) header("Authorization", "Bearer $token")
                if (method == "POST") post((body ?: JsonObject()).toString().toRequestBody(jsonType))
            }
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            val root = runCatching { JsonParser.parseString(raw).asJsonObject }.getOrElse { JsonObject() }
            if (!response.isSuccessful) {
                val error = root.objectOrNull("error")
                throw ApiException(error?.string("code", "HTTP_${response.code}") ?: "HTTP_${response.code}", error?.string("message", root.string("message", "Please try again.")) ?: "Please try again.")
            }
            return root
        }
    }
}

private fun JsonObject.objectAt(name: String): JsonObject = getAsJsonObject(name) ?: JsonObject()
private fun JsonObject.objectOrNull(name: String): JsonObject? = get(name)?.takeIf { it.isJsonObject }?.asJsonObject
private fun JsonObject.arrayOrNull(name: String) = get(name)?.takeIf { it.isJsonArray }?.asJsonArray
private fun JsonObject.arrayAt(name: String) = arrayOrNull(name) ?: com.google.gson.JsonArray()
private fun JsonObject.string(name: String, fallback: String = ""): String = get(name)?.takeIf { !it.isJsonNull }?.asString ?: fallback
private fun JsonObject.int(name: String, fallback: Int = 0): Int = get(name)?.takeIf { !it.isJsonNull }?.asInt ?: fallback
private fun JsonObject.long(name: String, fallback: Long = 0): Long = get(name)?.takeIf { !it.isJsonNull }?.asLong ?: fallback
private fun JsonObject.bool(name: String, fallback: Boolean = false): Boolean = get(name)?.takeIf { !it.isJsonNull }?.asBoolean ?: fallback
