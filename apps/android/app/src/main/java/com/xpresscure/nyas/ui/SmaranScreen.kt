@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTransformGestures
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
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CenterFocusStrong
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.PanToolAlt
import androidx.compose.material.icons.outlined.Remove
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
import androidx.compose.ui.platform.LocalContext
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
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import kotlin.math.hypot

private enum class SmaranTool { Write, Erase, Move }

@Composable
internal fun SmaranScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val context = LocalContext.current
    val draftPreferences = remember { context.getSharedPreferences("nyas_smaran_drafts", android.content.Context.MODE_PRIVATE) }
    val gson = remember { Gson() }
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
    var tool by remember { mutableStateOf(SmaranTool.Write) }
    var zoom by remember { mutableStateOf(1f) }
    var pan by remember { mutableStateOf(Offset.Zero) }
    fun draftKey(date: String) = "${session.familyId}:${session.memberId}:$date"
    fun preserveDraft(strokes: List<SmaranStroke>) {
        draftPreferences.edit().putString(draftKey(today), gson.toJson(strokes)).apply()
    }
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
                val savedStrokes = page.contributions.firstOrNull { it.isMine }?.strokes.orEmpty()
                val key = draftKey(page.date)
                myStrokes = if (page.date == today && draftPreferences.contains(key)) {
                    runCatching {
                        val type = object : TypeToken<List<SmaranStroke>>() {}.type
                        gson.fromJson<List<SmaranStroke>>(draftPreferences.getString(key, "[]"), type)
                    }.getOrDefault(savedStrokes)
                } else savedStrokes
                archive = api.smaranPages(session)
                zoom = 1f
                pan = Offset.Zero
                tool = SmaranTool.Write
            } catch (exception: ApiException) {
                snackbars.showSnackbar(exception.message ?: "Could not open Smaran Pat.")
            } finally { loading = false }
        }
    }
    fun saveToday() {
        scope.launch {
            saving = true
            try {
                val result = api.saveSmaran(session, today, myStrokes)
                draftPreferences.edit().remove(draftKey(today)).apply()
                snackbars.showSnackbar(result.message)
                load(today)
            } catch (exception: ApiException) {
                snackbars.showSnackbar(exception.message ?: "Could not save today's page.")
            } finally { saving = false }
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
                            Text("प्रभात स्मरण", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
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
                if (selectedDate == today) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(enabled = myStrokes.isNotEmpty(), onClick = {
                                    myStrokes = myStrokes.dropLast(1)
                                    preserveDraft(myStrokes)
                                }) { Icon(Icons.Outlined.Undo, "Undo") }
                                IconButton(enabled = myStrokes.isNotEmpty(), onClick = {
                                    myStrokes = emptyList()
                                    preserveDraft(myStrokes)
                                }) { Icon(Icons.Outlined.DeleteSweep, "Clear my writing") }
                            }
                        }
                        Button(
                            enabled = !saving && (myStrokes.isNotEmpty() || contributions.any { it.isMine }),
                            onClick = ::saveToday,
                            modifier = Modifier.weight(1f).height(52.dp)
                        ) {
                            Icon(Icons.Outlined.Save, null)
                            Spacer(Modifier.size(8.dp))
                            Text(if (saving) "Saving..." else "Save page")
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SmaranToolButton("Write", Icons.Outlined.Edit, tool == SmaranTool.Write) { tool = SmaranTool.Write }
                        SmaranToolButton("Erase", Icons.Outlined.DeleteSweep, tool == SmaranTool.Erase) { tool = SmaranTool.Erase }
                        SmaranToolButton("Scroll", Icons.Outlined.PanToolAlt, tool == SmaranTool.Move) { tool = SmaranTool.Move }
                    }
                    Text(
                        when (tool) {
                            SmaranTool.Write -> "Writing mode: use your finger on the page."
                            SmaranTool.Erase -> "Eraser mode: touch your own stroke to remove it."
                            SmaranTool.Move -> if (zoom == 1f) "Scroll mode: swipe over the page to move down." else "Move mode: drag the enlarged page."
                        },
                        Modifier.padding(top = 7.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(8.dp))
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                    Text("${(zoom * 100).toInt()}%", style = MaterialTheme.typography.labelLarge)
                    IconButton(onClick = { zoom = (zoom - .25f).coerceAtLeast(1f); pan = pan.clamped(canvasSize, zoom) }) {
                        Icon(Icons.Outlined.Remove, "Zoom out")
                    }
                    IconButton(onClick = { zoom = 1f; pan = Offset.Zero }) {
                        Icon(Icons.Outlined.CenterFocusStrong, "Fit page")
                    }
                    IconButton(onClick = { zoom = (zoom + .25f).coerceAtMost(4f); pan = pan.clamped(canvasSize, zoom) }) {
                        Icon(Icons.Outlined.Add, "Zoom in")
                    }
                }
                Card(shape = RoundedCornerShape(12.dp), elevation = CardDefaults.cardElevation(2.dp)) {
                    Box(
                        Modifier.fillMaxWidth().aspectRatio(1f).background(Color(0xFFFFFCF7)).onSizeChanged { canvasSize = it }
                    ) {
                        if (loading) CircularProgressIndicator(Modifier.align(Alignment.Center))
                        Canvas(
                            Modifier.fillMaxSize().then(
                                if (selectedDate == today && !loading && (tool != SmaranTool.Move || zoom > 1f)) Modifier.pointerInput(canvasSize, selectedDate, tool, zoom) {
                                    when (tool) {
                                        SmaranTool.Move -> detectTransformGestures { centroid, panChange, gestureZoom, _ ->
                                            val oldZoom = zoom
                                            val newZoom = (oldZoom * gestureZoom).coerceIn(1f, 4f)
                                            val ratio = newZoom / oldZoom
                                            pan = (centroid + (pan - centroid) * ratio + panChange).clamped(canvasSize, newZoom)
                                            zoom = newZoom
                                        }
                                        SmaranTool.Write -> detectDragGestures(
                                            onDragStart = { offset ->
                                                if (canvasSize.width > 0 && canvasSize.height > 0) {
                                                    myStrokes = myStrokes + SmaranStroke(
                                                        points = listOf(offset.toDocumentPoint(canvasSize, zoom, pan)),
                                                        width = 7f
                                                    )
                                                }
                                            },
                                            onDrag = { change, _ ->
                                                change.consume()
                                                val last = myStrokes.lastOrNull() ?: return@detectDragGestures
                                                myStrokes = myStrokes.dropLast(1) + last.copy(
                                                    points = last.points + change.position.toDocumentPoint(canvasSize, zoom, pan)
                                                )
                                            },
                                            onDragEnd = { preserveDraft(myStrokes) },
                                            onDragCancel = { preserveDraft(myStrokes) }
                                        )
                                        SmaranTool.Erase -> detectDragGestures(
                                            onDragStart = { offset -> myStrokes = myStrokes.erasingNear(offset.toDocumentPoint(canvasSize, zoom, pan), canvasSize, zoom) },
                                            onDrag = { change, _ ->
                                                change.consume()
                                                myStrokes = myStrokes.erasingNear(change.position.toDocumentPoint(canvasSize, zoom, pan), canvasSize, zoom)
                                            },
                                            onDragEnd = { preserveDraft(myStrokes) },
                                            onDragCancel = { preserveDraft(myStrokes) }
                                        )
                                    }
                                } else Modifier
                            )
                        ) {
                            contributions.filterNot { it.isMine }.forEachIndexed { index, contribution ->
                                contribution.strokes.forEach { drawSmaranStroke(it, memberInk(index), size.width, size.height, zoom, pan) }
                            }
                            myStrokes.forEach { drawSmaranStroke(it, Color(0xFF8E2337), size.width, size.height, zoom, pan) }
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
private fun androidx.compose.foundation.layout.RowScope.SmaranToolButton(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.weight(1f),
        shape = RoundedCornerShape(8.dp),
        color = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(Modifier.padding(vertical = 11.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, Modifier.size(19.dp))
            Spacer(Modifier.size(6.dp))
            Text(label, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
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

private fun Offset.toDocumentPoint(size: IntSize, zoom: Float, pan: Offset) = SmaranPoint(
    ((x - pan.x) / zoom / size.width.coerceAtLeast(1)).coerceIn(0f, 1f),
    ((y - pan.y) / zoom / size.height.coerceAtLeast(1)).coerceIn(0f, 1f)
)

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawSmaranStroke(
    stroke: SmaranStroke,
    color: Color,
    width: Float,
    height: Float,
    zoom: Float,
    pan: Offset
) {
    if (stroke.points.size < 2) return
    val path = Path().apply {
        moveTo(stroke.points.first().x * width * zoom + pan.x, stroke.points.first().y * height * zoom + pan.y)
        stroke.points.drop(1).forEach { lineTo(it.x * width * zoom + pan.x, it.y * height * zoom + pan.y) }
    }
    drawPath(path, color, style = Stroke(width = stroke.width * zoom, cap = StrokeCap.Round))
}

private fun Offset.clamped(size: IntSize, zoom: Float) = Offset(
    x.coerceIn(-size.width * (zoom - 1f), 0f),
    y.coerceIn(-size.height * (zoom - 1f), 0f)
)

private fun List<SmaranStroke>.erasingNear(point: SmaranPoint, size: IntSize, zoom: Float): List<SmaranStroke> {
    val radius = 28f / zoom
    return filterNot { stroke ->
        stroke.points.any { candidate ->
            hypot((candidate.x - point.x) * size.width, (candidate.y - point.y) * size.height) <= radius
        }
    }
}

private fun memberInk(index: Int) = listOf(Color(0xFF3B6B5A), Color(0xFF9A6A19), Color(0xFF4A5878), Color(0xFF704B66))[index % 4]

private fun prettyDate(value: String): String = runCatching {
    LocalDate.parse(value).format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM))
}.getOrDefault(value)
