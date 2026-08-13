package com.xpresscure.nyas.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
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
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.HealthConnectClient
import com.xpresscure.nyas.data.FitnessDashboard
import com.xpresscure.nyas.data.HealthConnectReader
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.time.LocalDate
import java.util.Locale
import kotlin.math.roundToInt

@Composable
fun SwasthyaScreen(session: NyasSession) {
    val context = LocalContext.current
    val api = remember { NyasApi() }
    val health = remember { HealthConnectReader(context) }
    val scope = rememberCoroutineScope()
    val snackbars = remember { SnackbarHostState() }
    var dashboard by remember { mutableStateOf(FitnessDashboard()) }
    var loading by remember { mutableStateOf(true) }
    var syncing by remember { mutableStateOf(false) }
    var goal by remember { mutableStateOf(6000f) }

    fun load() = scope.launch {
        loading = true
        runCatching { api.fitness(session) }
            .onSuccess { dashboard = it; goal = it.preference.dailyStepGoal.toFloat() }
            .onFailure { snackbars.showSnackbar(it.message ?: "Could not load Swasthya.") }
        loading = false
    }

    fun sync() = scope.launch {
        syncing = true
        runCatching {
            api.syncFitness(session, health.readLastSevenDays())
            api.fitness(session)
        }.onSuccess {
            dashboard = it
            snackbars.showSnackbar("Your activity is up to date.")
        }.onFailure { snackbars.showSnackbar(it.message ?: "Activity sync failed.") }
        syncing = false
    }

    val permissionLauncher = rememberLauncherForActivityResult(HealthConnectReader.permissionContract()) { granted ->
        if (granted.containsAll(HealthConnectReader.permissions)) sync()
        else scope.launch { snackbars.showSnackbar("Health permission was not granted.") }
    }

    LaunchedEffect(session.memberId) { load() }

    Scaffold(snackbarHost = { SnackbarHost(snackbars) }) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                Column {
                    Text("Swasthya", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("Small steps. Stronger family.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            if (loading) item { Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            else {
                val today = dashboard.days.firstOrNull { it.date == LocalDate.now().toString() } ?: dashboard.days.lastOrNull()
                val steps = today?.steps ?: 0
                val progress = (steps.toFloat() / dashboard.preference.dailyStepGoal.coerceAtLeast(1)).coerceIn(0f, 1f)
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(22.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text("TODAY", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                                AnimatedContent(steps) { value ->
                                    Text(formatNumber(value), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                                }
                                Text("of ${formatNumber(dashboard.preference.dailyStepGoal.toLong())} steps")
                            }
                            Box(contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(progress = { progress }, modifier = Modifier.size(88.dp), strokeWidth = 8.dp)
                                Icon(Icons.AutoMirrored.Outlined.DirectionsWalk, null, Modifier.size(34.dp), tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }

                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        HealthStat("Active", "${today?.activeMinutes ?: 0} min", Modifier.weight(1f))
                        HealthStat("Distance", "${String.format(Locale.US, "%.1f", (today?.distanceMetres ?: 0.0) / 1000)} km", Modifier.weight(1f))
                        HealthStat("Streak", "${dashboard.streak} days", Modifier.weight(1f))
                    }
                }

                item {
                    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f))) {
                        Column(Modifier.padding(18.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.FavoriteBorder, null, tint = MaterialTheme.colorScheme.primary)
                                Text("  Your 7-day rhythm", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(Modifier.height(18.dp))
                            Row(Modifier.fillMaxWidth().height(112.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
                                val max = dashboard.days.maxOfOrNull { it.steps }?.coerceAtLeast(1) ?: 1
                                dashboard.days.takeLast(7).forEach { day ->
                                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                                        Box(
                                            Modifier.fillMaxWidth(.62f)
                                                .height((22 + 66 * day.steps.toFloat() / max).dp)
                                                .clip(RoundedCornerShape(12.dp))
                                                .background(MaterialTheme.colorScheme.primary.copy(alpha = .72f))
                                        )
                                        Spacer(Modifier.height(6.dp))
                                        Text(day.date.takeLast(2), style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    val challenge = dashboard.challenge
                    val challengeProgress = (challenge.totalSteps.toFloat() / challenge.targetSteps.coerceAtLeast(1)).coerceIn(0f, 1f)
                    Card(shape = RoundedCornerShape(20.dp)) {
                        Column(Modifier.padding(18.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Groups, null, tint = MaterialTheme.colorScheme.primary)
                                Text("  ${challenge.title}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            }
                            Text(challenge.subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(14.dp))
                            LinearProgressIndicator(progress = { challengeProgress }, Modifier.fillMaxWidth().height(9.dp).clip(CircleShape))
                            Spacer(Modifier.height(10.dp))
                            Text("${formatNumber(challenge.totalSteps)} steps · ${challenge.participantCount} participants", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                item {
                    Card(shape = RoundedCornerShape(20.dp)) {
                        Column(Modifier.padding(18.dp)) {
                            Text("Your preferences", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(12.dp))
                            Text("Daily goal: ${formatNumber(goal.roundToInt().toLong())} steps")
                            Slider(value = goal, onValueChange = { goal = it }, valueRange = 3000f..15000f, steps = 11)
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(Modifier.weight(1f)) {
                                    Text("Join the Kul challenge", fontWeight = FontWeight.Medium)
                                    Text("Share only your step total", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Switch(
                                    checked = dashboard.preference.shareWithFamily,
                                    onCheckedChange = { enabled ->
                                        scope.launch {
                                            runCatching { api.updateFitnessPreferences(session, goal.roundToInt(), enabled) }
                                                .onSuccess { dashboard = dashboard.copy(preference = it); snackbars.showSnackbar("Swasthya preferences saved.") }
                                                .onFailure { snackbars.showSnackbar(it.message ?: "Could not save preference.") }
                                        }
                                    }
                                )
                            }
                            Spacer(Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    scope.launch {
                                        runCatching { api.updateFitnessPreferences(session, goal.roundToInt(), dashboard.preference.shareWithFamily) }
                                            .onSuccess { dashboard = dashboard.copy(preference = it); snackbars.showSnackbar("Daily goal saved.") }
                                            .onFailure { snackbars.showSnackbar(it.message ?: "Could not save goal.") }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) { Text("Save goal") }
                        }
                    }
                }

                item {
                    if (health.status == HealthConnectClient.SDK_AVAILABLE) {
                        Button(
                            onClick = {
                                scope.launch {
                                    if (health.hasPermissions()) sync() else permissionLauncher.launch(HealthConnectReader.permissions)
                                }
                            },
                            enabled = !syncing,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Outlined.Sync, null)
                            Text(if (syncing) "  Syncing..." else "  Sync Health Connect")
                        }
                    } else {
                        OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth()) {
                            Text("Health Connect is not available on this phone")
                        }
                    }
                    Text(
                        "Private by default. Nyas never shares health conditions or detailed workouts.",
                        Modifier.padding(top = 10.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun HealthStat(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .5f))) {
        Column(Modifier.padding(horizontal = 10.dp, vertical = 14.dp)) {
            Text(value, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun formatNumber(value: Long): String = NumberFormat.getIntegerInstance(Locale("en", "IN")).format(value)
