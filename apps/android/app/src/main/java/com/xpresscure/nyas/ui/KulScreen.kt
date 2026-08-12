@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.PersonSearch
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.WorkOutline
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.xpresscure.nyas.BuildConfig
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.FamilyMemberProfile
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch
import okhttp3.Headers
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

@Composable
fun KulScreen(session: NyasSession, onOpenMap: () -> Unit, onOpenRegister: () -> Unit) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var members by remember { mutableStateOf(emptyList<FamilyMemberProfile>()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("living") }
    var selected by remember { mutableStateOf<FamilyMemberProfile?>(null) }

    fun refresh() {
        scope.launch {
            loading = true
            error = ""
            try { members = api.members(session) }
            catch (exception: ApiException) { error = exception.message.orEmpty() }
            finally { loading = false }
        }
    }
    LaunchedEffect(session.familyId) { refresh() }
    val visible = remember(members, query, filter) {
        members.filter { member ->
            val matchesQuery = query.isBlank() || listOf(member.displayName, member.city, member.placeOfResidence, member.profession)
                .any { it.contains(query.trim(), ignoreCase = true) }
            val matchesFilter = when (filter) {
                "living" -> member.livingStatus != "deceased"
                "memory" -> member.livingStatus == "deceased"
                "places" -> member.city.isNotBlank() || member.placeOfResidence.isNotBlank()
                else -> true
            }
            matchesQuery && matchesFilter
        }
    }
    val locations = members.mapNotNull { it.city.ifBlank { it.placeOfResidence }.takeIf(String::isNotBlank) }.distinctBy { it.lowercase() }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("हमारा Kul", style = MaterialTheme.typography.headlineSmall)
                    Text("परिवारजन, स्थान, ज्ञान और स्मृतियाँ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = { refresh() }) { Icon(Icons.Outlined.Refresh, "Refresh") }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                KulMetric("परिवारजन", members.count { it.livingStatus != "deceased" }.toString(), Modifier.weight(1f))
                KulMetric("स्थान", locations.size.toString(), Modifier.weight(1f))
                KulMetric("स्मृति", members.count { it.livingStatus == "deceased" }.toString(), Modifier.weight(1f))
            }
        }
        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Outlined.PersonSearch, null) },
                label = { Text("नाम, शहर या कार्य खोजें") },
                singleLine = true,
                shape = RoundedCornerShape(8.dp)
            )
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(listOf("living" to "जीवित सदस्य", "all" to "सभी", "memory" to "स्मृति", "places" to "स्थान")) { option ->
                    AssistChip(onClick = { filter = option.first }, label = { Text(option.second, fontWeight = if (filter == option.first) FontWeight.Bold else FontWeight.Normal) })
                }
            }
        }
        if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = Gold) }
        if (error.isNotBlank()) item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(error, Modifier.weight(1f)); TextButton(onClick = { refresh() }) { Text("फिर कोशिश") }
                }
            }
        }
        if (!loading && visible.isEmpty()) item {
            Text("इस खोज में कोई परिवारजन नहीं मिले।", Modifier.fillMaxWidth().padding(vertical = 24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(visible, key = { it.id }) { member ->
            Surface(onClick = { selected = member }, modifier = Modifier.fillMaxWidth(), color = Color.Transparent) {
                Column {
                    Row(Modifier.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                        MemberAvatar(member, session, 54)
                        Spacer(Modifier.size(12.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(member.displayName, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                if (member.livingStatus == "deceased") {
                                    Spacer(Modifier.size(8.dp)); Text("स्मृति", color = Gold, style = MaterialTheme.typography.labelSmall)
                                }
                            }
                            Text(memberSubtitle(member), color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            if (member.city.isNotBlank() || member.placeOfResidence.isNotBlank()) Text(member.city.ifBlank { member.placeOfResidence }, style = MaterialTheme.typography.bodySmall, color = Leaf)
                        }
                    }
                    HorizontalDivider()
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onOpenMap, modifier = Modifier.weight(1f), shape = RoundedCornerShape(8.dp)) { Text("Kul Map") }
                OutlinedButton(onClick = onOpenRegister, modifier = Modifier.weight(1f), shape = RoundedCornerShape(8.dp)) { Text("पूरा Register") }
            }
        }
    }
    selected?.let { MemberDetails(it, session) { selected = null } }
}

@Composable
fun MemberAvatar(member: FamilyMemberProfile, session: NyasSession, size: Int) {
    val context = LocalContext.current
    val photo = member.photoUrl.takeIf(String::isNotBlank)?.let { if (it.startsWith("http")) it else BuildConfig.WEB_BASE_URL.trimEnd('/') + it }
    val background = if (member.livingStatus == "deceased") MaterialTheme.colorScheme.surfaceVariant else if (member.gender == "female") Color(0xFFF5DFE0) else Color(0xFFE2ECF4)
    Surface(modifier = Modifier.size(size.dp), shape = CircleShape, color = background) {
        if (photo != null) {
            AsyncImage(
                model = ImageRequest.Builder(context).data(photo).headers(Headers.headersOf("Authorization", "Bearer ${session.token}")).crossfade(true).build(),
                contentDescription = member.displayName,
                modifier = Modifier.fillMaxSize().clip(CircleShape)
            )
        } else Box(contentAlignment = Alignment.Center) {
            Text(member.displayName.take(1).uppercase(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = if (member.livingStatus == "deceased") MaterialTheme.colorScheme.onSurfaceVariant else Leaf)
        }
    }
}

@Composable
private fun KulMetric(label: String, value: String, modifier: Modifier) {
    Card(modifier, shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(12.dp)) { Text(value, style = MaterialTheme.typography.headlineSmall); Text(label, style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun MemberDetails(member: FamilyMemberProfile, session: NyasSession, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
        LazyColumn(Modifier.fillMaxWidth(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MemberAvatar(member, session, 72); Spacer(Modifier.size(14.dp))
                    Column {
                        Text(member.displayName, style = MaterialTheme.typography.headlineSmall)
                        Text(if (member.livingStatus == "deceased") "स्मृति में" else member.relationLabel.ifBlank { roleLabel(member.role) }, color = if (member.livingStatus == "deceased") Gold else Leaf)
                    }
                }
            }
            if (member.bio.isNotBlank()) item { Text(member.bio, style = MaterialTheme.typography.bodyLarge) }
            item {
                DetailLine(Icons.Outlined.LocationOn, "निवास", listOf(member.placeOfResidence, member.city, member.state, member.country).filter(String::isNotBlank).distinct().joinToString(", ").ifBlank { "जानकारी शेष" })
                DetailLine(Icons.Outlined.WorkOutline, "कार्य", listOf(member.work.currentRole, member.work.currentPlace, member.profession).filter(String::isNotBlank).distinct().joinToString(" • ").ifBlank { "जानकारी शेष" })
                val education = listOf(member.postGraduation, member.graduation, member.intermediate).firstOrNull { it.degree.isNotBlank() || it.institution.isNotBlank() }
                DetailLine(Icons.Outlined.School, "शिक्षा", education?.let { listOf(it.degree, it.institution, it.year?.toString().orEmpty()).filter(String::isNotBlank).joinToString(" • ") } ?: "जानकारी शेष")
            }
            item {
                HorizontalDivider(); Spacer(Modifier.height(12.dp))
                Text(lifeLine(member), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun DetailLine(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.Top) {
        Icon(icon, null, tint = Gold); Spacer(Modifier.size(12.dp)); Column { Text(label, style = MaterialTheme.typography.labelLarge); Text(value, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

private fun memberSubtitle(member: FamilyMemberProfile): String = member.work.currentRole.ifBlank { member.profession }.ifBlank { member.relationLabel }.ifBlank { roleLabel(member.role) }
private fun roleLabel(role: String): String = when (role) { "owner" -> "Nyas प्रमुख"; "admin" -> "व्यवस्थापक"; "kosh_pramukh" -> "Kosh प्रमुख"; "project_lead" -> "Sankalp प्रमुख"; else -> "परिवार सदस्य" }
private fun lifeLine(member: FamilyMemberProfile): String {
    if (member.livingStatus == "deceased") return "स्मरण${member.dateOfDeath.takeIf(String::isNotBlank)?.let { ", ${formatMemberDate(it)}" } ?: member.yearOfDeath?.let { ", $it" }.orEmpty()}"
    return member.dateOfBirth.takeIf(String::isNotBlank)?.let { "जन्म ${formatMemberDate(it)}" } ?: "जन्म तिथि शेष"
}
internal fun formatMemberDate(value: String): String = try { OffsetDateTime.parse(value).format(DateTimeFormatter.ofPattern("d MMM yyyy", Locale("en", "IN"))) } catch (_: DateTimeParseException) { value.take(10) }
