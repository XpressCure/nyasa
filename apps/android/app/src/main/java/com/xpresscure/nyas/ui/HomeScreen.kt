@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.Cake
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Celebration
import androidx.compose.material.icons.outlined.FamilyRestroom
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.DashboardData
import com.xpresscure.nyas.data.FamilyCalendarItem
import com.xpresscure.nyas.data.FamilyCelebration
import com.xpresscure.nyas.data.FamilyHubOverview
import com.xpresscure.nyas.data.FamilyMemberProfile
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.SankalpSummary
import com.xpresscure.nyas.data.WeeklyFeature
import com.xpresscure.nyas.ui.theme.Forest
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import java.text.NumberFormat
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

private data class RecommendedAction(
    val eyebrow: String,
    val title: String,
    val description: String,
    val action: String,
    val route: AppRoute,
    val icon: ImageVector
)

@Composable
internal fun HomeScreen(
    session: NyasSession,
    dashboard: DashboardData,
    familyHub: FamilyHubOverview,
    profile: FamilyMemberProfile?,
    loading: Boolean,
    error: String,
    onNavigate: (AppRoute) -> Unit,
    onRefresh: () -> Unit
) {
    val action = remember(profile, dashboard, familyHub) { recommendedAction(profile, dashboard, familyHub) }
    val rupees = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    val moments: List<Any> = remember(familyHub) {
        (familyHub.celebrations.take(4) + familyHub.calendarEvents.take(4)).sortedBy {
            when (it) {
                is FamilyCelebration -> it.date
                is FamilyCalendarItem -> it.startsAt
                else -> ""
            }
        }.take(6)
    }

    LazyColumn(
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(22.dp)
    ) {
        item {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Hello, ${session.fullName.substringBefore(' ')}", style = MaterialTheme.typography.headlineMedium)
                        Text("Here is what matters today", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = onRefresh) { Icon(Icons.Outlined.Refresh, "Refresh home") }
                }
                Spacer(Modifier.height(16.dp))
                NextActionCard(action) { onNavigate(action.route) }
                if (loading) {
                    Spacer(Modifier.height(12.dp))
                    LinearProgressIndicator(Modifier.fillMaxWidth(), color = Gold)
                }
                if (error.isNotBlank()) {
                    Spacer(Modifier.height(10.dp))
                    Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        if (moments.isNotEmpty()) {
            item { SectionTitle("Coming up", "Calendar") { onNavigate(AppRoute.Panchang) } }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(moments.size) { index ->
                        when (val moment = moments[index]) {
                            is FamilyCelebration -> CelebrationCard(moment)
                            is FamilyCalendarItem -> CalendarCard(moment)
                        }
                    }
                }
            }
        }

        familyHub.weeklyFeature?.let { feature ->
            item { WeeklyFeatureCard(feature) }
        }

        item { SectionTitle("Sankalp in focus", "View all") { onNavigate(AppRoute.Sankalp) } }
        if (!loading && dashboard.featured.isEmpty()) {
            item {
                Surface(
                    onClick = { onNavigate(AppRoute.Sankalp) },
                    modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Route, null, tint = Gold)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Explore family Sankalp", fontWeight = FontWeight.SemiBold)
                            Text("See the work the family is shaping together.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.AutoMirrored.Outlined.ArrowForward, null)
                    }
                }
            }
        } else {
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(dashboard.featured, key = { it.id }) { project ->
                        SankalpFocusCard(project) { onNavigate(AppRoute.Sankalp) }
                    }
                }
            }
        }

        item {
            FamilyPulse(
                members = familyHub.snapshot.memberCount.takeIf { it > 0 } ?: dashboard.metrics.members,
                locations = familyHub.snapshot.locationCount,
                kosh = rupees.format(dashboard.metrics.koshPaise / 100.0),
                onFamily = { onNavigate(AppRoute.Kul) },
                onMap = { onNavigate(AppRoute.Tree) },
                onVirasat = { onNavigate(AppRoute.Virasat) }
            )
        }
    }
}

@Composable
private fun NextActionCard(action: RecommendedAction, onClick: () -> Unit) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Forest)) {
        Box(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Forest, Leaf))).padding(20.dp)) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(Modifier.size(42.dp), shape = CircleShape, color = Color.White.copy(alpha = 0.14f)) {
                        Box(contentAlignment = Alignment.Center) { Icon(action.icon, null, tint = Gold) }
                    }
                    Spacer(Modifier.width(12.dp))
                    Text(action.eyebrow.uppercase(), color = Gold, style = MaterialTheme.typography.labelLarge)
                }
                Spacer(Modifier.height(18.dp))
                Text(action.title, color = Color.White, style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.height(6.dp))
                Text(action.description, color = Color(0xFFDDE8E0), style = MaterialTheme.typography.bodyLarge)
                Spacer(Modifier.height(18.dp))
                Button(onClick = onClick) {
                    Text(action.action)
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.AutoMirrored.Outlined.ArrowForward, null)
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String, action: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
        TextButton(onClick = onClick) { Text(action) }
    }
}

@Composable
private fun CelebrationCard(item: FamilyCelebration) {
    Card(Modifier.width(244.dp), shape = RoundedCornerShape(8.dp)) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(Modifier.size(42.dp), shape = CircleShape, color = MaterialTheme.colorScheme.secondaryContainer) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(if (item.type == "birthday") Icons.Outlined.Cake else Icons.Outlined.Celebration, null, tint = Gold)
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.memberName, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(if (item.type == "birthday") "Birthday" else "Anniversary", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(dayLabel(item.daysUntil), color = Leaf, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun CalendarCard(item: FamilyCalendarItem) {
    Card(Modifier.width(244.dp), shape = RoundedCornerShape(8.dp)) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(Modifier.size(42.dp), shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Outlined.CalendarMonth, null, tint = Leaf) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.title, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(formatHomeDate(item.startsAt), color = Leaf, style = MaterialTheme.typography.labelLarge)
                if (item.location.isNotBlank()) Text(item.location, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            }
        }
    }
}

@Composable
private fun WeeklyFeatureCard(feature: WeeklyFeature) {
    val context = LocalContext.current
    Surface(
        onClick = {
            if (feature.url.isNotBlank()) runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(feature.url))) }
        },
        modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.secondaryContainer
    ) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(if (feature.featureType == "video") Icons.Outlined.PlayCircle else Icons.AutoMirrored.Outlined.MenuBook, null, Modifier.size(32.dp), tint = Gold)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(if (feature.featureType == "video") "Video of the week" else "Read of the week", style = MaterialTheme.typography.labelLarge, color = Leaf)
                Text(feature.title, style = MaterialTheme.typography.titleMedium)
                if (feature.summary.isNotBlank()) Text(feature.summary, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            if (feature.url.isNotBlank()) Icon(Icons.AutoMirrored.Outlined.ArrowForward, null)
        }
    }
}

@Composable
private fun SankalpFocusCard(project: SankalpSummary, onClick: () -> Unit) {
    val progress = if (project.targetPaise > 0) (project.allocatedPaise.toFloat() / project.targetPaise).coerceIn(0f, 1f) else 0f
    Card(onClick = onClick, modifier = Modifier.width(280.dp), shape = RoundedCornerShape(8.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(project.title, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(stageLabel(project.stage), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(16.dp))
            LinearProgressIndicator(progress = { progress }, Modifier.fillMaxWidth().height(8.dp).clip(CircleShape), color = Gold)
            Spacer(Modifier.height(8.dp))
            Text(if (project.targetPaise > 0) "${(progress * 100).toInt()}% funded" else "No funding required", color = Leaf, style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun FamilyPulse(
    members: Int,
    locations: Int,
    kosh: String,
    onFamily: () -> Unit,
    onMap: () -> Unit,
    onVirasat: () -> Unit
) {
    Column(Modifier.padding(horizontal = 16.dp)) {
        Text("Family pulse", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(10.dp))
        Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    PulseStat(Icons.Outlined.People, members.toString(), "Members")
                    PulseStat(Icons.Outlined.LocationOn, locations.toString(), "Places")
                    PulseStat(Icons.Outlined.Savings, kosh, "Kosh")
                }
                Spacer(Modifier.height(16.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilledTonalButton(onClick = onFamily, modifier = Modifier.weight(1f)) { Icon(Icons.Outlined.FamilyRestroom, null); Spacer(Modifier.width(6.dp)); Text("Family") }
                    FilledTonalButton(onClick = onMap, modifier = Modifier.weight(1f)) { Icon(Icons.Outlined.Route, null); Spacer(Modifier.width(6.dp)); Text("Map") }
                    FilledTonalButton(onClick = onVirasat, modifier = Modifier.weight(1f)) { Icon(Icons.Outlined.AutoStories, null); Spacer(Modifier.width(6.dp)); Text("Virasat") }
                }
            }
        }
    }
}

@Composable
private fun PulseStat(icon: ImageVector, value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(96.dp)) {
        Icon(icon, null, tint = Gold)
        Spacer(Modifier.height(6.dp))
        Text(value, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
    }
}

private fun recommendedAction(profile: FamilyMemberProfile?, dashboard: DashboardData, hub: FamilyHubOverview): RecommendedAction {
    val today = hub.celebrations.firstOrNull { it.daysUntil == 0 }
    if (today != null) return RecommendedAction(
        "Family moment",
        "Celebrate ${today.memberName}",
        if (today.type == "birthday") "It is their birthday today. Make the family moment count." else "It is their anniversary today. Send your wishes.",
        "Open family",
        AppRoute.Kul,
        Icons.Outlined.Celebration
    )
    if (profile == null || profileCompletion(profile) < 55) return RecommendedAction(
        "Your next step",
        "Complete your family profile",
        "A few details help relatives recognise you and make the Kul Map richer.",
        "Continue profile",
        AppRoute.Parichay,
        Icons.Outlined.People
    )
    val funding = dashboard.featured.firstOrNull { it.targetPaise > it.allocatedPaise }
    if (funding != null) return RecommendedAction(
        "Sankalp needs support",
        funding.title,
        "See its progress and decide whether you would like to participate.",
        "View Sankalp",
        AppRoute.Sankalp,
        Icons.Outlined.Route
    )
    return RecommendedAction(
        "Explore your roots",
        "See your family across generations",
        "Open the Kul Map and discover how each branch connects.",
        "Open Kul Map",
        AppRoute.Tree,
        Icons.Outlined.FamilyRestroom
    )
}

private fun profileCompletion(member: FamilyMemberProfile): Int {
    val checks = listOf(
        member.displayName.isNotBlank(),
        member.gender != "prefer_not_to_say",
        member.dateOfBirth.isNotBlank(),
        member.photoUrl.isNotBlank(),
        member.city.isNotBlank() || member.placeOfResidence.isNotBlank(),
        member.profession.isNotBlank() || member.work.currentRole.isNotBlank(),
        member.bio.isNotBlank()
    )
    return checks.count { it } * 100 / checks.size
}

private fun dayLabel(days: Int): String = when (days) {
    0 -> "Today"
    1 -> "Tomorrow"
    else -> "In $days days"
}

private fun formatHomeDate(value: String): String = try {
    OffsetDateTime.parse(value).format(DateTimeFormatter.ofPattern("EEE, d MMM", Locale("en", "IN")))
} catch (_: DateTimeParseException) {
    value.take(10)
}
