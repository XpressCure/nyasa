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
import android.util.Base64

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

    suspend fun changePassword(
        session: NyasSession,
        currentPassword: String,
        password: String,
        confirmPassword: String
    ): String = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("currentPassword", currentPassword)
            addProperty("password", password)
            addProperty("confirmPassword", confirmPassword)
        }
        execute("/auth/password/change", "POST", body, session.token).objectAt("data").string("token")
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
                koshPaise = metrics.long("treasuryBalance") * 100,
                contributedThisYearPaise = metrics.long("contributionThisYear") * 100
            ),
            featured = projects?.mapNotNull { item ->
                item.takeIf { it.isJsonObject }?.asJsonObject?.let {
                    SankalpSummary(
                        id = it.string("_id", it.string("id")),
                        title = it.string("title", "Sankalp"),
                        stage = it.string("lifecycleStage", it.string("stage", "planning")),
                        targetPaise = it.long("targetBudgetPaise").takeIf { value -> value > 0 }
                            ?: it.long("targetBudgetRupees", it.long("estimatedBudgetRupees")) * 100,
                        allocatedPaise = it.long("allocatedAmountPaise")
                    )
                }
            }.orEmpty()
        )
    }

    suspend fun familyHubOverview(session: NyasSession): FamilyHubOverview = withContext(Dispatchers.IO) {
        val data = execute("/family-hub/family/${session.familyId}/overview", token = session.token).objectAt("data")
        val snapshot = data.objectOrNull("snapshot") ?: JsonObject()
        FamilyHubOverview(
            snapshot = FamilySnapshot(
                memberCount = snapshot.int("memberCount"),
                livingMembers = snapshot.int("livingMembers"),
                locationCount = snapshot.int("locationCount")
            ),
            celebrations = data.arrayOrNull("celebrations")?.mapNotNull { element ->
                element.takeIf { it.isJsonObject }?.asJsonObject?.let {
                    FamilyCelebration(
                        memberId = it.idString("memberId"),
                        memberName = it.string("memberName"),
                        type = it.string("type"),
                        date = it.string("date"),
                        daysUntil = it.int("daysUntil")
                    )
                }
            }.orEmpty(),
            calendarEvents = data.arrayOrNull("calendarEvents")?.mapNotNull { element ->
                element.takeIf { it.isJsonObject }?.asJsonObject?.let {
                    FamilyCalendarItem(
                        id = it.idString("id"),
                        title = it.string("title"),
                        eventType = it.string("eventType", "other"),
                        startsAt = it.string("startsAt"),
                        location = it.string("location")
                    )
                }
            }.orEmpty(),
            weeklyFeature = data.objectOrNull("weeklyFeature")?.let {
                WeeklyFeature(
                    id = it.idString("id"),
                    title = it.string("title"),
                    featureType = it.string("featureType", "read"),
                    url = it.string("url"),
                    summary = it.string("summary")
                )
            }
        )
    }

    suspend fun calendarEvents(session: NyasSession): List<FamilyCalendarItem> = withContext(Dispatchers.IO) {
        execute("/family-hub/family/${session.familyId}/calendar-events", token = session.token).arrayAt("data").mapNotNull { element ->
            element.takeIf { it.isJsonObject }?.asJsonObject?.let {
                FamilyCalendarItem(
                    id = it.idString("id"),
                    title = it.string("title"),
                    eventType = it.string("eventType", "other"),
                    startsAt = it.string("startsAt"),
                    location = it.string("location")
                )
            }
        }
    }

    suspend fun addCalendarEvent(
        session: NyasSession,
        title: String,
        eventType: String,
        startsAt: String,
        location: String,
        description: String
    ): FamilyCalendarItem = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("title", title.trim())
            addProperty("eventType", eventType)
            addProperty("startsAt", startsAt)
            addProperty("location", location.trim())
            addProperty("description", description.trim())
        }
        val data = execute("/family-hub/family/${session.familyId}/calendar-events", "POST", body, session.token).objectAt("data")
        FamilyCalendarItem(
            id = data.idString("id"),
            title = data.string("title"),
            eventType = data.string("eventType", "other"),
            startsAt = data.string("startsAt"),
            location = data.string("location")
        )
    }

    suspend fun proposals(session: NyasSession): ProposalList = withContext(Dispatchers.IO) {
        val data = execute("/proposals/family/${session.familyId}", token = session.token).objectAt("data")
        ProposalList(
            canVote = data.bool("canVote"),
            proposals = data.arrayAt("proposals").mapNotNull { element ->
                element.takeIf { it.isJsonObject }?.asJsonObject?.let(::parseProposal)
            }
        )
    }

    suspend fun createProposal(
        session: NyasSession,
        title: String,
        description: String,
        category: String,
        expectedImpact: String,
        tentativeBudgetRupees: Long
    ): SankalpProposal = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("title", title.trim())
            addProperty("description", description.trim())
            addProperty("category", category)
            addProperty("expectedImpact", expectedImpact.trim())
            addProperty("tentativeBudgetRupees", tentativeBudgetRupees)
        }
        parseProposal(execute("/proposals/family/${session.familyId}", "POST", body, session.token).objectAt("data"))
    }

    suspend fun voteProposal(session: NyasSession, proposalId: String, vote: String): SankalpProposal = withContext(Dispatchers.IO) {
        val body = JsonObject().apply { addProperty("vote", vote) }
        parseProposal(execute("/proposals/family/${session.familyId}/$proposalId/vote", "POST", body, session.token).objectAt("data"))
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
            element.takeIf { it.isJsonObject }?.asJsonObject?.let(::parseSankalp)
        }
    }

    suspend fun sankalpWorkspace(session: NyasSession, projectId: String): SankalpWorkspace = withContext(Dispatchers.IO) {
        val data = execute("/projects/family/${session.familyId}/$projectId", token = session.token).objectAt("data")
        SankalpWorkspace(
            project = parseSankalp(data.objectAt("project")),
            milestones = data.arrayAt("milestones").mapNotNull { element ->
                element.takeIf { it.isJsonObject }?.asJsonObject?.let {
                    SankalpMilestone(
                        id = it.idString("_id"), title = it.string("title"), description = it.string("description"),
                        status = it.string("status", "pending"), dueDate = it.string("dueDate"),
                        budgetPaise = it.long("budgetPaise"), actualSpendPaise = it.long("actualSpendPaise")
                    )
                }
            },
            updates = data.arrayAt("updates").mapNotNull { element ->
                element.takeIf { it.isJsonObject }?.asJsonObject?.let {
                    SankalpUpdate(
                        id = it.idString("_id"), title = it.string("title"), body = it.string("body"),
                        updateType = it.string("updateType", "note"), progressPercent = it.nullableInt("progressPercent"),
                        authorName = it.objectOrNull("createdByMember")?.string("displayName").orEmpty(), createdAt = it.string("createdAt")
                    )
                }
            },
            documentCount = data.arrayAt("projectDocuments").size()
        )
    }

    suspend fun updateSankalp(
        session: NyasSession,
        projectId: String,
        update: SankalpManagementUpdate
    ): Sankalp = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            update.lifecycleStage?.let { addProperty("lifecycleStage", it) }
            update.estimatedBudgetRupees?.let { addProperty("estimatedBudgetRupees", it) }
            update.completionPercent?.let { addProperty("completionPercent", it) }
        }
        parseSankalp(execute("/projects/family/${session.familyId}/$projectId", "PATCH", body, session.token).objectAt("data"))
    }

    suspend fun addSankalpMilestone(
        session: NyasSession,
        projectId: String,
        title: String,
        description: String,
        dueDate: String,
        budgetRupees: Long?
    ): ActionResult = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("title", title.trim())
            if (description.isNotBlank()) addProperty("description", description.trim())
            if (dueDate.isNotBlank()) addProperty("dueDate", dueDate)
            budgetRupees?.let { addProperty("budgetRupees", it) }
        }
        execute("/projects/family/${session.familyId}/$projectId/milestones", "POST", body, session.token)
        ActionResult("Milestone added to the Sankalp.")
    }

    suspend fun updateSankalpMilestone(
        session: NyasSession,
        projectId: String,
        milestoneId: String,
        status: String
    ): ActionResult = withContext(Dispatchers.IO) {
        val body = JsonObject().apply { addProperty("status", status) }
        execute("/projects/family/${session.familyId}/$projectId/milestones/$milestoneId", "PATCH", body, session.token)
        ActionResult(if (status == "completed") "Milestone marked complete." else "Milestone updated.")
    }

    suspend fun addSankalpProgress(
        session: NyasSession,
        projectId: String,
        title: String,
        bodyText: String,
        updateType: String,
        progressPercent: Int?
    ): ActionResult = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            if (title.isNotBlank()) addProperty("title", title.trim())
            addProperty("body", bodyText.trim())
            addProperty("updateType", updateType)
            progressPercent?.let { addProperty("progressPercent", it) }
        }
        execute("/projects/family/${session.familyId}/$projectId/updates", "POST", body, session.token)
        ActionResult("Progress update shared with the family.")
    }

    suspend fun declareBankContribution(
        session: NyasSession,
        amountRupees: Long,
        utr: String = "",
        note: String = ""
    ): ActionResult =
        withContext(Dispatchers.IO) {
            val body = JsonObject().apply {
                addProperty("amountRupees", amountRupees)
                addProperty("paidAt", Instant.now().toString())
                if (utr.isNotBlank()) addProperty("utr", utr.trim())
                addProperty("note", note)
                addProperty("attested", true)
                addProperty("declarationToken", UUID.randomUUID().toString())
            }
            val root = execute("/bank-contributions/family/${session.familyId}/declarations", "POST", body, session.token)
            ActionResult(root.string("message", "Your contribution has been recorded."), amountRupees * 100)
        }

    suspend fun koshReconciliation(session: NyasSession): KoshReconciliation = withContext(Dispatchers.IO) {
        val data = execute("/bank-contributions/family/${session.familyId}/reconciliation", token = session.token).objectAt("data")
        val latest = data.objectOrNull("latest")?.let {
            KoshBalanceSnapshot(
                actualBankBalanceRupees = it.long("actualBankBalanceRupees"),
                expectedBankBalanceRupees = it.long("expectedBankBalanceRupees"),
                differenceRupees = it.long("differenceRupees"),
                asOfDate = it.string("asOfDate")
            )
        }
        KoshReconciliation(
            currentExpectedBankBalanceRupees = data.long("currentExpectedBankBalanceRupees"),
            latest = latest,
            declarations = data.arrayAt("recentDeclarations").mapNotNull { element ->
                element.takeIf { it.isJsonObject }?.asJsonObject?.let {
                    KoshDeclaration(
                        id = it.idString("id"),
                        memberName = it.objectOrNull("member")?.string("displayName", "Sadasya").orEmpty(),
                        declaredAmountRupees = it.long("declaredAmountRupees"),
                        confirmedAmountRupees = it.get("confirmedAmountRupees")?.takeUnless { value -> value.isJsonNull }?.asLong,
                        paymentReference = it.string("paymentReference"),
                        utr = it.string("utr"),
                        paidAt = it.string("paidAt"),
                        sourceAccountLast4 = it.string("sourceAccountLast4"),
                        reconciliationStatus = it.string("reconciliationStatus", "unreconciled"),
                        reconciliationNote = it.string("reconciliationNote")
                    )
                }
            }
        )
    }

    suspend fun recordKoshSnapshot(
        session: NyasSession,
        actualBankBalanceRupees: Long,
        note: String
    ): ActionResult = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("actualBankBalanceRupees", actualBankBalanceRupees)
            addProperty("asOfDate", Instant.now().toString())
            addProperty("note", note.trim())
        }
        val root = execute("/bank-contributions/family/${session.familyId}/reconciliation", "POST", body, session.token)
        ActionResult(root.string("message", "Bank balance snapshot recorded."))
    }

    suspend fun reconcileKoshDeclaration(
        session: NyasSession,
        declarationId: String,
        confirmedAmountRupees: Long,
        confirmedUtr: String,
        note: String
    ): ActionResult = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("confirmedAmountRupees", confirmedAmountRupees)
            addProperty("confirmedUtr", confirmedUtr.trim())
            addProperty("note", note.trim())
        }
        val root = execute(
            "/bank-contributions/family/${session.familyId}/declarations/$declarationId/reconciliation",
            "POST",
            body,
            session.token
        )
        ActionResult(root.string("message", "Contribution matched with the bank statement."))
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

    suspend fun members(session: NyasSession): List<FamilyMemberProfile> = withContext(Dispatchers.IO) {
        execute("/members/family/${session.familyId}", token = session.token).arrayAt("data").mapNotNull {
            it.takeIf { element -> element.isJsonObject }?.asJsonObject?.let(::parseMember)
        }
    }

    suspend fun familyTree(session: NyasSession): FamilyTreeData = withContext(Dispatchers.IO) {
        val data = execute("/members/family/${session.familyId}/tree?mode=general", token = session.token).objectAt("data")
        FamilyTreeData(
            selfMemberId = data.idString("selfMemberId").ifBlank { session.memberId },
            members = data.arrayAt("members").mapNotNull {
                it.takeIf { element -> element.isJsonObject }?.asJsonObject?.let(::parseMember)
            },
            links = data.arrayAt("links").mapNotNull { element ->
                element.takeIf { it.isJsonObject }?.asJsonObject?.let { link ->
                    FamilyTreeLink(
                        fromMemberId = link.idString("fromMemberId"),
                        toMemberId = link.idString("toMemberId"),
                        relationship = link.string("relationship")
                    )
                }
            }.filter { it.fromMemberId.isNotBlank() && it.toMemberId.isNotBlank() }
        )
    }

    suspend fun myProfile(session: NyasSession): FamilyMemberProfile = withContext(Dispatchers.IO) {
        parseMember(execute("/members/family/${session.familyId}/me", token = session.token).objectAt("data"))
    }

    suspend fun immediateFamily(session: NyasSession): ImmediateFamily = withContext(Dispatchers.IO) {
        val data = execute("/members/family/${session.familyId}/immediate-family", token = session.token).objectAt("data")
        ImmediateFamily(
            father = data.objectOrNull("father")?.let(::parseMember),
            mother = data.objectOrNull("mother")?.let(::parseMember),
            spouse = data.objectOrNull("spouse")?.let(::parseMember),
            children = data.arrayAt("children").mapNotNull { it.takeIf { element -> element.isJsonObject }?.asJsonObject?.let(::parseMember) }
        )
    }

    suspend fun searchFamilyMembers(session: NyasSession, query: String): List<FamilyMemberProfile> = withContext(Dispatchers.IO) {
        if (query.trim().length < 2) return@withContext emptyList()
        execute("/members/family/${session.familyId}/search?q=${java.net.URLEncoder.encode(query.trim(), "UTF-8")}", token = session.token)
            .arrayAt("data")
            .mapNotNull { element -> element.takeIf { it.isJsonObject }?.asJsonObject?.let(::parseMember) }
    }

    suspend fun saveImmediateRelative(
        session: NyasSession,
        relationship: String,
        displayName: String,
        existingMemberId: String = "",
        gender: String = "prefer_not_to_say",
        dateOfBirth: String = ""
    ): ImmediateFamily = withContext(Dispatchers.IO) {
        val relative = JsonObject().apply {
            addProperty("displayName", displayName.trim())
            if (existingMemberId.isNotBlank()) addProperty("existingMemberId", existingMemberId)
            addProperty("gender", gender)
            if (dateOfBirth.isNotBlank()) addProperty("dateOfBirth", dateOfBirth)
        }
        val body = JsonObject().apply {
            if (relationship == "child") {
                add("children", com.google.gson.JsonArray().apply { add(relative) })
            } else {
                add(relationship, relative)
                add("children", com.google.gson.JsonArray())
            }
        }
        execute("/members/family/${session.familyId}/immediate-family", "POST", body, session.token)
        val data = execute("/members/family/${session.familyId}/immediate-family", token = session.token).objectAt("data")
        ImmediateFamily(
            father = data.objectOrNull("father")?.let(::parseMember),
            mother = data.objectOrNull("mother")?.let(::parseMember),
            spouse = data.objectOrNull("spouse")?.let(::parseMember),
            children = data.arrayAt("children").mapNotNull { it.takeIf { element -> element.isJsonObject }?.asJsonObject?.let(::parseMember) }
        )
    }

    suspend fun updateMyProfile(session: NyasSession, update: ProfileUpdate): FamilyMemberProfile = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("displayName", update.displayName.trim())
            addProperty("gender", update.gender)
            if (update.dateOfBirth.isNotBlank()) addProperty("dateOfBirth", update.dateOfBirth)
            addProperty("livingStatus", update.livingStatus)
            addProperty("maritalStatus", update.maritalStatus)
            if (update.anniversaryDate.isNotBlank()) addProperty("anniversaryDate", update.anniversaryDate)
            addProperty("placeOfResidence", update.placeOfResidence.trim())
            addProperty("city", update.city.trim())
            addProperty("state", update.state.trim())
            addProperty("country", update.country.trim())
            addProperty("profession", update.profession.trim())
            addProperty("bio", update.bio.trim())
            add("work", JsonObject().apply {
                addProperty("currentPlace", update.currentPlace.trim())
                addProperty("currentRole", update.currentRole.trim())
                addProperty("previousPlaces", update.previousPlaces.trim())
                update.experienceYears?.let { addProperty("experienceYears", it) }
            })
            add("education", JsonObject().apply {
                add("intermediate", update.intermediate.toJson())
                add("graduation", update.graduation.toJson())
                add("postGraduation", update.postGraduation.toJson())
            })
            add("health", JsonObject().apply {
                addProperty("bloodGroup", update.bloodGroup.trim())
                add("knownConditions", com.google.gson.JsonArray().apply { update.knownConditions.forEach(::add) })
                add("allergies", com.google.gson.JsonArray().apply { update.allergies.forEach(::add) })
                addProperty("geneticNotes", update.geneticNotes.trim())
            })
        }
        parseMember(execute("/members/family/${session.familyId}/me", "PATCH", body, session.token).objectAt("data"))
    }

    suspend fun uploadProfilePhoto(
        session: NyasSession,
        memberId: String,
        originalName: String,
        mimeType: String,
        bytes: ByteArray
    ): FamilyMemberProfile = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("originalName", originalName)
            addProperty("mimeType", mimeType)
            addProperty("sizeBytes", bytes.size)
            addProperty("dataBase64", Base64.encodeToString(bytes, Base64.NO_WRAP))
        }
        val data = execute("/members/family/${session.familyId}/$memberId/photo", "POST", body, session.token).objectAt("data")
        parseMember(data.objectAt("member"))
    }

    suspend fun virasat(session: NyasSession): List<VirasatEvent> = withContext(Dispatchers.IO) {
        execute("/family-hub/family/${session.familyId}/history", token = session.token).arrayAt("data").mapNotNull {
            it.takeIf { element -> element.isJsonObject }?.asJsonObject?.let(::parseVirasat)
        }
    }

    suspend fun addVirasatEvent(
        session: NyasSession,
        title: String,
        year: Int,
        category: String,
        location: String,
        description: String
    ): VirasatEvent = withContext(Dispatchers.IO) {
        val body = JsonObject().apply {
            addProperty("title", title.trim())
            addProperty("eventYear", year)
            addProperty("category", category)
            addProperty("location", location.trim())
            addProperty("description", description.trim())
        }
        parseVirasat(execute("/family-hub/family/${session.familyId}/history", "POST", body, session.token).objectAt("data"))
    }

    private fun execute(path: String, method: String = "GET", body: JsonObject? = null, token: String = ""): JsonObject {
        val request = Request.Builder()
            .url(BuildConfig.API_BASE_URL.trimEnd('/') + path)
            .header("Accept", "application/json")
            .apply {
                if (token.isNotBlank()) header("Authorization", "Bearer $token")
                when (method) {
                    "POST" -> post((body ?: JsonObject()).toString().toRequestBody(jsonType))
                    "PATCH" -> patch((body ?: JsonObject()).toString().toRequestBody(jsonType))
                }
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

private fun parseSankalp(data: JsonObject) = Sankalp(
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
    projectLeadMemberId = data.objectOrNull("projectLeadMember")?.idString("_id")
        .orEmpty().ifBlank { data.idString("projectLeadMemberId") },
    auditorMemberId = data.objectOrNull("auditorMember")?.idString("_id")
        .orEmpty().ifBlank { data.idString("auditorMemberId") },
    implementationLeadMemberId = data.objectOrNull("implementationLeadMember")?.idString("_id")
        .orEmpty().ifBlank { data.idString("implementationLeadMemberId") },
    projectLeadName = data.objectOrNull("projectLeadMember")?.string("displayName").orEmpty(),
    auditorName = data.objectOrNull("auditorMember")?.string("displayName").orEmpty(),
    implementationLeadName = data.objectOrNull("implementationLeadMember")?.string("displayName").orEmpty(),
    rules = data.string("rules"),
    completionPercent = data.int("completionPercent"),
    startDate = data.string("startDate"),
    targetCompletionDate = data.string("targetCompletionDate")
)

private fun parseMember(data: JsonObject): FamilyMemberProfile {
    val education = data.objectOrNull("education") ?: JsonObject()
    val work = data.objectOrNull("work") ?: JsonObject()
    val health = data.objectOrNull("health") ?: JsonObject()
    fun educationAt(name: String): EducationEntry {
        val item = education.objectOrNull(name) ?: JsonObject()
        return EducationEntry(item.string("institution"), item.string("degree"), item.nullableInt("year"))
    }
    return FamilyMemberProfile(
        id = data.string("_id", data.string("id")),
        displayName = data.string("displayName", "Family member"),
        role = data.string("role", "member"),
        status = data.string("status", "active"),
        gender = data.string("gender", "prefer_not_to_say"),
        livingStatus = data.string("livingStatus", "living"),
        dateOfBirth = data.string("dateOfBirth"),
        dateOfDeath = data.string("dateOfDeath"),
        yearOfDeath = data.nullableInt("yearOfDeath"),
        maritalStatus = data.string("maritalStatus", "unknown"),
        anniversaryDate = data.string("anniversaryDate"),
        relationLabel = data.string("relationLabel"),
        placeOfResidence = data.string("placeOfResidence"),
        city = data.string("city"),
        state = data.string("state"),
        country = data.string("country"),
        profession = data.string("profession"),
        bio = data.string("bio"),
        photoUrl = data.string("photoUrl"),
        fatherMemberId = data.idString("fatherMemberId"),
        motherMemberId = data.idString("motherMemberId"),
        spouseMemberId = data.idString("spouseMemberId"),
        childrenCount = data.int("childrenCount"),
        intermediate = educationAt("intermediate"),
        graduation = educationAt("graduation"),
        postGraduation = educationAt("postGraduation"),
        work = WorkProfile(
            currentPlace = work.string("currentPlace"),
            currentRole = work.string("currentRole"),
            previousPlaces = work.string("previousPlaces"),
            experienceYears = work.nullableInt("experienceYears")
        ),
        health = HealthProfile(
            bloodGroup = health.string("bloodGroup"),
            knownConditions = health.stringList("knownConditions"),
            allergies = health.stringList("allergies"),
            geneticNotes = health.string("geneticNotes")
        )
    )
}

private fun EducationEntry.toJson() = JsonObject().apply {
    addProperty("institution", institution.trim())
    addProperty("degree", degree.trim())
    year?.let { addProperty("year", it) }
}

private fun parseVirasat(data: JsonObject) = VirasatEvent(
    id = data.string("id", data.string("_id")),
    title = data.string("title", "Family memory"),
    eventDate = data.string("eventDate"),
    eventYear = data.nullableInt("eventYear"),
    location = data.string("location"),
    category = data.string("category", "family"),
    description = data.string("description"),
    sourceNote = data.string("sourceNote"),
    automatic = data.string("source") == "profile"
)

private fun parseProposal(data: JsonObject): SankalpProposal {
    val votes = data.objectOrNull("votes") ?: JsonObject()
    val proposedBy = data.objectOrNull("proposedBy")
    return SankalpProposal(
        id = data.idString("id"),
        title = data.string("title"),
        description = data.string("description"),
        category = data.string("category", "other"),
        expectedImpact = data.string("expectedImpact"),
        tentativeBudgetPaise = data.long("tentativeBudgetPaise"),
        status = data.string("status", "voting"),
        votingEndsAt = data.string("votingEndsAt"),
        proposedByName = proposedBy?.string("displayName").orEmpty(),
        votes = SankalpProposalVotes(
            up = votes.int("up"),
            down = votes.int("down"),
            total = votes.int("total"),
            score = votes.int("score"),
            myVote = votes.string("myVote")
        )
    )
}

private fun JsonObject.objectAt(name: String): JsonObject = getAsJsonObject(name) ?: JsonObject()
private fun JsonObject.objectOrNull(name: String): JsonObject? = get(name)?.takeIf { it.isJsonObject }?.asJsonObject
private fun JsonObject.arrayOrNull(name: String) = get(name)?.takeIf { it.isJsonArray }?.asJsonArray
private fun JsonObject.arrayAt(name: String) = arrayOrNull(name) ?: com.google.gson.JsonArray()
private fun JsonObject.stringList(name: String): List<String> = arrayAt(name).mapNotNull {
    it.takeIf { value -> value.isJsonPrimitive }?.asString?.trim()?.takeIf(String::isNotBlank)
}
private fun JsonObject.string(name: String, fallback: String = ""): String = get(name)?.takeIf { !it.isJsonNull }?.asString ?: fallback
private fun JsonObject.int(name: String, fallback: Int = 0): Int = get(name)?.takeIf { !it.isJsonNull }?.asInt ?: fallback
private fun JsonObject.long(name: String, fallback: Long = 0): Long = get(name)?.takeIf { !it.isJsonNull }?.asLong ?: fallback
private fun JsonObject.bool(name: String, fallback: Boolean = false): Boolean = get(name)?.takeIf { !it.isJsonNull }?.asBoolean ?: fallback
private fun JsonObject.nullableInt(name: String): Int? = get(name)?.takeIf { !it.isJsonNull }?.runCatching { asInt }?.getOrNull()
private fun JsonObject.idString(name: String): String {
    val value = get(name) ?: return ""
    return when {
        value.isJsonPrimitive -> value.asString
        value.isJsonObject -> value.asJsonObject.string("_id", value.asJsonObject.string("id"))
        else -> ""
    }
}
