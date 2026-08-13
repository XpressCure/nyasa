@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.DeleteSweep
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material.icons.outlined.Undo
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.SmaranContribution
import com.xpresscure.nyas.data.SmaranPageSummary
import com.xpresscure.nyas.data.SmaranPoint
import com.xpresscure.nyas.data.SmaranStroke
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@Composable
internal fun SmaranScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    val snackbars = remember { SnackbarHostState() }
    val today = remember { LocalDate.now().toString() }
    var selectedDate by remember { mutableStateOf(today) }
    var contributions by remember { mutableStateOf<List<SmaranContribution>>(emptyList()) }
    var archive by remember { mutableStateOf<List<SmaranPageSummary>>(emptyList()) }
    var myStrokes by remember { mutableStateOf<List<SmaranStroke>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        scope.launch { snackbars.showSnackbar(if (granted) "7 AM and 8 PM Smaran reminders are on." else "You can enable reminders later in phone settings.") }
    }

    fun load(date: String) {
        scope.launch {
            loading = true
            try {
                val page = api.smaranPage(session, date)
                selectedDate = page.date
                contributions = page.contributions
                myStrokes = page.contributions.firstOrNull { it.isMine }?.strokes.orEmpty()
                archive = api.smaranPages(session)
            } catch (exception: ApiException) {
                snackbars.showSnackbar(exception.message ?: "Could not open Smaran Pat.")
            } finally { loading = false }
        }
    }

    LaunchedEffect(Unit) {
        load(today)
        if (Build.VERSION.SDK_INT >= 33) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbars) }) { scaffoldPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(scaffoldPadding),
            contentPadding = PaddingValues(16.dp, 12.dp, 16.dp, 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = .45f))
                ) {
                    Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surface, modifier = Modifier.size(48.dp)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Edit, null, tint = MaterialTheme.colorScheme.primary) }
                        }
                        Spacer(Modifier.size(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Prabhat Smaran", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text("Ek Kul, ek smaran, ek shubh shuruaat.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Outlined.NotificationsActive, "7 AM and 8 PM reminders")
                    }
                }
            }

            item {
                Text(if (selectedDate == today) "Today's Smaran Pat" else prettyDate(selectedDate), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    if (selectedDate == today) "Write Ram, Om, a mantra or a शुभ विचार with your finger."
                    else "This page is preserved exactly as the Kul left it.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            item {
                Card(shape = RoundedCornerShape(12.dp), elevation = CardDefaults.cardElevation(2.dp)) {
                    Box(
                        Modifier.fillMaxWidth().aspectRatio(.72f).background(Color(0xFFFFFCF7)).onSizeChanged { canvasSize = it }
                    ) {
                        if (loading) CircularProgressIndicator(Modifier.align(Alignment.Center))
                        Canvas(
                            Modifier.fillMaxSize().then(
                                if (selectedDate == today && !loading) Modifier.pointerInput(canvasSize, myStrokes) {
                                    detectDragGestures(
                                        onDragStart = { offset ->
                                            if (canvasSize.width > 0 && canvasSize.height > 0) {
                                                myStrokes = myStrokes + SmaranStroke(listOf(offset.normalized(canvasSize)))
                                            }
                                        },
                                        onDrag = { change, _ ->
                                            change.consume()
                                            val last = myStrokes.lastOrNull() ?: return@detectDragGestures
                                            myStrokes = myStrokes.dropLast(1) + last.copy(points = last.points + change.position.normalized(canvasSize))
                                        }
                                    )
                                } else Modifier
                            )
                        ) {
                            contributions.filterNot { it.isMine }.forEachIndexed { index, contribution ->
                                contribution.strokes.forEach { drawSmaranStroke(it, memberInk(index), size.width, size.height) }
                            }
                            myStrokes.forEach { drawSmaranStroke(it, Color(0xFF8E2337), size.width, size.height) }
                        }
                    }
                }
            }

            if (selectedDate == today) {
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(enabled = myStrokes.isNotEmpty(), onClick = { myStrokes = myStrokes.dropLast(1) }) { Icon(Icons.Outlined.Undo, "Undo") }
                                IconButton(enabled = myStrokes.isNotEmpty(), onClick = { myStrokes = emptyList() }) { Icon(Icons.Outlined.DeleteSweep, "Clear my writing") }
                            }
                        }
                        Button(
                            enabled = !saving && (myStrokes.isNotEmpty() || contributions.any { it.isMine }),
                            onClick = {
                                scope.launch {
                                    saving = true
                                    try {
                                        val result = api.saveSmaran(session, today, myStrokes)
                                        snackbars.showSnackbar(result.message)
                                        load(today)
                                    } catch (exception: ApiException) {
                                        snackbars.showSnackbar(exception.message ?: "Could not save today's page.")
                                    } finally { saving = false }
                                }
                            },
                            modifier = Modifier.weight(1f).height(52.dp)
                        ) {
                            Icon(Icons.Outlined.Save, null)
                            Spacer(Modifier.size(8.dp))
                            Text(if (saving) "Saving..." else "Save today's writing")
                        }
                    }
                }
            }

            item {
                val allContributors = contributions.map { it.memberName }.distinct()
                Text("${allContributors.size} Kul members on this page", style = MaterialTheme.typography.titleSmall)
                Text(allContributors.joinToString("  •  ").ifBlank { "Be the first to write today." }, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.AutoStories, null)
                    Spacer(Modifier.size(8.dp))
                    Text("Smaran Diary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(10.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        DateChip(today, selectedDate == today, "Today") { load(today) }
                    }
                    items(archive.filterNot { it.date == today }, key = { it.date }) { page ->
                        DateChip(page.date, selectedDate == page.date, "${prettyDate(page.date)}\n${page.contributorCount} members") { load(page.date) }
                    }
                }
            }
        }
    }
}

@Composable
private fun DateChip(date: String, selected: Boolean, label: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
    ) { Text(label, Modifier.padding(horizontal = 14.dp, vertical = 10.dp), fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) }
}

private fun Offset.normalized(size: IntSize) = SmaranPoint(
    (x / size.width.coerceAtLeast(1)).coerceIn(0f, 1f),
    (y / size.height.coerceAtLeast(1)).coerceIn(0f, 1f)
)

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawSmaranStroke(stroke: SmaranStroke, color: Color, width: Float, height: Float) {
    if (stroke.points.size < 2) return
    val path = Path().apply {
        moveTo(stroke.points.first().x * width, stroke.points.first().y * height)
        stroke.points.drop(1).forEach { lineTo(it.x * width, it.y * height) }
    }
    drawPath(path, color, style = Stroke(width = stroke.width, cap = StrokeCap.Round))
}

private fun memberInk(index: Int) = listOf(Color(0xFF3B6B5A), Color(0xFF9A6A19), Color(0xFF4A5878), Color(0xFF704B66))[index % 4]

private fun prettyDate(value: String): String = runCatching {
    LocalDate.parse(value).format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM))
}.getOrDefault(value)
