@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Paint
import android.graphics.RectF
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CenterFocusStrong
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.ZoomIn
import androidx.compose.material.icons.outlined.ZoomOut
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.FamilyMemberProfile
import com.xpresscure.nyas.data.FamilyTreeData
import com.xpresscure.nyas.data.FamilyTreeLink
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max

private const val nodeWidth = 176
private const val nodeHeight = 116
private const val horizontalGap = 30
private const val verticalGap = 92

private data class TreePosition(val x: Float, val y: Float)
private data class TreeLayout(val positions: Map<String, TreePosition>, val width: Float, val height: Float)
private data class DisplayLink(val from: String, val to: String, val spouse: Boolean)

@Composable
fun KulMapScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var tree by remember { mutableStateOf<FamilyTreeData?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<FamilyMemberProfile?>(null) }
    val context = LocalContext.current

    fun refresh() {
        scope.launch {
            loading = true
            error = ""
            try { tree = api.familyTree(session) } catch (e: ApiException) { error = e.message.orEmpty() }
            loading = false
        }
    }
    LaunchedEffect(session.familyId) { refresh() }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 12.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text("Kul Map", style = MaterialTheme.typography.headlineSmall)
                Text("Your family, connected across generations", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (!loading && tree?.members?.isNotEmpty() == true) IconButton(onClick = { shareKulMap(context, tree!!, session.familyName) }) {
                Icon(Icons.Outlined.Share, "Share Kul Map")
            }
            IconButton(onClick = { refresh() }) { Icon(Icons.Outlined.Refresh, "Refresh tree") }
        }
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error.isNotBlank() -> TreeMessage(error, "Try again", ::refresh)
            tree == null || tree!!.members.isEmpty() -> TreeMessage("No family relationships have been added yet.", "Refresh", ::refresh)
            else -> NativeTreeViewport(tree = tree!!, session = session, onSelect = { selected = it })
        }
    }
    selected?.let { MemberDetails(it, session) { selected = null } }
}

private fun shareKulMap(context: Context, tree: FamilyTreeData, familyName: String) {
    runCatching {
        val layout = calculateTreeLayout(tree)
        val maxWidth = 4096f
        val maxHeight = 8192f
        val headerHeight = 150f
        val scale = minOf(1f, maxWidth / layout.width, (maxHeight - headerHeight) / layout.height)
        val bitmapWidth = (layout.width * scale).toInt().coerceIn(900, maxWidth.toInt())
        val bitmapHeight = (layout.height * scale + headerHeight).toInt().coerceIn(700, maxHeight.toInt())
        val bitmap = Bitmap.createBitmap(bitmapWidth, bitmapHeight, Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(bitmap)
        canvas.drawColor(android.graphics.Color.rgb(248, 246, 240))
        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(20, 48, 35); textSize = 48f; typeface = android.graphics.Typeface.DEFAULT_BOLD }
        val captionPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(89, 103, 95); textSize = 25f }
        canvas.drawText("$familyName Kul Map", 38f, 62f, titlePaint)
        canvas.drawText("Generated by Nyas • ${tree.members.size} family profiles", 38f, 106f, captionPaint)
        canvas.save()
        canvas.translate(0f, headerHeight)
        canvas.scale(scale, scale)
        val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(214, 161, 44); strokeWidth = 4f; style = Paint.Style.STROKE }
        val spousePaint = Paint(linePaint).apply { color = android.graphics.Color.rgb(135, 107, 44); pathEffect = android.graphics.DashPathEffect(floatArrayOf(10f, 7f), 0f) }
        displayLinks(tree.links).forEach { link ->
            val from = layout.positions[link.from] ?: return@forEach
            val to = layout.positions[link.to] ?: return@forEach
            if (link.spouse) {
                val left = if (from.x <= to.x) from else to
                val right = if (from.x <= to.x) to else from
                canvas.drawLine(left.x + nodeWidth, left.y + nodeHeight / 2f, right.x, right.y + nodeHeight / 2f, spousePaint)
            } else {
                val startX = from.x + nodeWidth / 2f
                val startY = from.y + nodeHeight
                val endX = to.x + nodeWidth / 2f
                val endY = to.y
                val middleY = startY + (endY - startY) / 2f
                canvas.drawLine(startX, startY, startX, middleY, linePaint)
                canvas.drawLine(startX, middleY, endX, middleY, linePaint)
                canvas.drawLine(endX, middleY, endX, endY, linePaint)
            }
        }
        val cardPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.WHITE; style = Paint.Style.FILL }
        val selfPaint = Paint(cardPaint).apply { color = android.graphics.Color.rgb(244, 234, 202) }
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(218, 211, 196); strokeWidth = 2f; style = Paint.Style.STROKE }
        val namePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(24, 34, 28); textSize = 21f; typeface = android.graphics.Typeface.DEFAULT_BOLD }
        val detailPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(90, 103, 95); textSize = 16f }
        tree.members.forEach { member ->
            val position = layout.positions[member.id] ?: return@forEach
            val bounds = RectF(position.x, position.y, position.x + nodeWidth, position.y + nodeHeight)
            canvas.drawRoundRect(bounds, 12f, 12f, if (member.id == tree.selfMemberId) selfPaint else cardPaint)
            canvas.drawRoundRect(bounds, 12f, 12f, borderPaint)
            val name = member.displayName.take(28)
            canvas.drawText(name, position.x + 14f, position.y + 34f, namePaint)
            val detail = member.city.ifBlank { member.relationLabel }.ifBlank { if (member.livingStatus == "deceased") "In memory" else "Family member" }.take(28)
            canvas.drawText(detail, position.x + 14f, position.y + 65f, detailPaint)
            if (member.dateOfBirth.isNotBlank()) canvas.drawText("Born ${member.dateOfBirth.take(10)}", position.x + 14f, position.y + 92f, detailPaint)
        }
        canvas.restore()
        val directory = File(context.cacheDir, "shared").apply { mkdirs() }
        val file = File(directory, "nyas-kul-map.jpg")
        FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 94, it) }
        bitmap.recycle()
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
            type = "image/jpeg"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, "$familyName Kul Map, shared from Nyas")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }, "Share Kul Map"))
    }.onFailure { Toast.makeText(context, "Could not prepare the Kul Map. Please try again.", Toast.LENGTH_LONG).show() }
}

@Composable
private fun TreeMessage(message: String, action: String, onAction: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Surface(onClick = onAction, color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(8.dp)) {
                Text(action, Modifier.padding(horizontal = 18.dp, vertical = 10.dp), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun NativeTreeViewport(tree: FamilyTreeData, session: NyasSession, onSelect: (FamilyMemberProfile) -> Unit) {
    val layout = remember(tree) { calculateTreeLayout(tree) }
    val links = remember(tree) { displayLinks(tree.links) }
    var scale by remember(tree) { mutableFloatStateOf(0.82f) }
    var pan by remember(tree) { mutableStateOf(androidx.compose.ui.geometry.Offset.Zero) }
    var centered by remember(tree) { mutableStateOf(false) }

    BoxWithConstraints(
        Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
    ) {
        val density = androidx.compose.ui.platform.LocalDensity.current
        val viewportWidth = with(density) { maxWidth.toPx() }
        val viewportHeight = with(density) { maxHeight.toPx() }
        val selfPosition = layout.positions[tree.selfMemberId]

        fun centreOnSelf(nextScale: Float = scale) {
            val target = selfPosition ?: TreePosition(layout.width / 2f, layout.height / 2f)
            val targetX = with(density) { (target.x + nodeWidth / 2f).dp.toPx() }
            val targetY = with(density) { (target.y + nodeHeight / 2f).dp.toPx() }
            pan = androidx.compose.ui.geometry.Offset(viewportWidth / 2f - targetX * nextScale, viewportHeight / 2f - targetY * nextScale)
        }

        LaunchedEffect(tree.selfMemberId, viewportWidth, viewportHeight) {
            if (!centered && viewportWidth > 0f) { centreOnSelf(); centered = true }
        }

        Box(
            Modifier.fillMaxSize().pointerInput(tree) {
                detectTransformGestures { centroid, panChange, zoomChange, _ ->
                    val oldScale = scale
                    val nextScale = (scale * zoomChange).coerceIn(0.42f, 1.65f)
                    val scaleRatio = nextScale / oldScale
                    pan = (pan - centroid) * scaleRatio + centroid + panChange
                    scale = nextScale
                }
            }
        ) {
            Box(
                Modifier.width(layout.width.dp).height(layout.height.dp).graphicsLayer {
                    translationX = pan.x
                    translationY = pan.y
                    scaleX = scale
                    scaleY = scale
                    transformOrigin = TransformOrigin(0f, 0f)
                }
            ) {
                TreeConnectors(layout, links)
                tree.members.forEach { member ->
                    val position = layout.positions[member.id] ?: return@forEach
                    TreeMemberNode(
                        member = member,
                        session = session,
                        isSelf = member.id == tree.selfMemberId,
                        modifier = Modifier.offset(x = position.x.dp, y = position.y.dp),
                        onClick = { onSelect(member) }
                    )
                }
            }

            Column(
                Modifier.align(Alignment.BottomEnd).padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilledTonalIconButton(onClick = { scale = (scale + 0.16f).coerceAtMost(1.65f) }) { Icon(Icons.Outlined.ZoomIn, "Zoom in") }
                FilledTonalIconButton(onClick = { scale = (scale - 0.16f).coerceAtLeast(0.42f) }) { Icon(Icons.Outlined.ZoomOut, "Zoom out") }
                FilledTonalIconButton(onClick = { centreOnSelf() }) { Icon(Icons.Outlined.CenterFocusStrong, "Centre on me") }
            }
            Surface(
                modifier = Modifier.align(Alignment.TopStart).padding(12.dp),
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
                shape = RoundedCornerShape(8.dp),
                tonalElevation = 2.dp
            ) {
                Text("Drag to move  |  Pinch to zoom", Modifier.padding(horizontal = 12.dp, vertical = 8.dp), style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

@Composable
private fun TreeConnectors(layout: TreeLayout, links: List<DisplayLink>) {
    val parentColor = Gold.copy(alpha = 0.88f)
    val spouseColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.72f)
    Canvas(Modifier.fillMaxSize()) {
        fun px(value: Float) = value.dp.toPx()
        links.forEach { link ->
            val from = layout.positions[link.from] ?: return@forEach
            val to = layout.positions[link.to] ?: return@forEach
            if (link.spouse) {
                val left = if (from.x <= to.x) from else to
                val right = if (from.x <= to.x) to else from
                val startX = px(left.x + nodeWidth)
                val endX = px(right.x)
                val y = px(left.y + nodeHeight / 2f)
                drawLine(spouseColor, start = androidx.compose.ui.geometry.Offset(startX, y), end = androidx.compose.ui.geometry.Offset(endX, y), strokeWidth = 2.5f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(9f, 7f)))
            } else {
                val start = androidx.compose.ui.geometry.Offset(px(from.x + nodeWidth / 2f), px(from.y + nodeHeight))
                val end = androidx.compose.ui.geometry.Offset(px(to.x + nodeWidth / 2f), px(to.y))
                val middleY = start.y + (end.y - start.y) / 2f
                val path = Path().apply {
                    moveTo(start.x, start.y); lineTo(start.x, middleY); lineTo(end.x, middleY); lineTo(end.x, end.y)
                }
                drawPath(path, parentColor, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3f))
            }
        }
    }
}

@Composable
private fun TreeMemberNode(member: FamilyMemberProfile, session: NyasSession, isSelf: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = modifier.width(nodeWidth.dp).height(nodeHeight.dp),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = if (isSelf) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface),
        border = if (isSelf) androidx.compose.foundation.BorderStroke(2.dp, Gold) else null,
        elevation = CardDefaults.cardElevation(if (isSelf) 4.dp else 1.dp)
    ) {
        Column(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                MemberAvatar(member, session, 40)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(member.displayName, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    if (isSelf) Text("YOU", style = MaterialTheme.typography.labelSmall, color = Leaf, fontWeight = FontWeight.Bold)
                }
            }
            Text(
                member.city.ifBlank { member.placeOfResidence }.ifBlank { member.relationLabel }.ifBlank { "Details pending" },
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (member.livingStatus == "deceased") Text("In memory", color = Gold, style = MaterialTheme.typography.labelSmall)
        }
    }
}

private fun calculateTreeLayout(tree: FamilyTreeData): TreeLayout {
    val memberIds = tree.members.map { it.id }.toSet()
    val adjacency = memberIds.associateWith { mutableListOf<Pair<String, Int>>() }.toMutableMap()
    tree.links.forEach { link ->
        if (link.fromMemberId !in memberIds || link.toMemberId !in memberIds) return@forEach
        val delta = if (link.relationship == "spouse") 0 else 1
        adjacency.getValue(link.fromMemberId).add(link.toMemberId to delta)
        adjacency.getValue(link.toMemberId).add(link.fromMemberId to -delta)
    }
    val generation = mutableMapOf<String, Int>()
    val seeds = listOf(tree.selfMemberId) + memberIds.sorted()
    seeds.forEach { seed ->
        if (seed !in memberIds || seed in generation) return@forEach
        generation[seed] = 0
        val queue = ArrayDeque<String>(); queue.add(seed)
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            adjacency[current].orEmpty().forEach { (next, delta) ->
                if (next !in generation) { generation[next] = generation.getValue(current) + delta; queue.add(next) }
            }
        }
    }
    val minGeneration = generation.values.minOrNull() ?: 0
    val rows = tree.members.groupBy { generation[it.id]?.minus(minGeneration) ?: 0 }.toSortedMap()
    val maxCount = max(1, rows.values.maxOfOrNull { it.size } ?: 1)
    val contentWidth = maxCount * nodeWidth + (maxCount - 1) * horizontalGap + 48
    val positions = mutableMapOf<String, TreePosition>()
    rows.entries.forEachIndexed { rowIndex, (_, members) ->
        val sorted = spouseAwareSort(members, tree.links)
        val rowWidth = sorted.size * nodeWidth + (sorted.size - 1) * horizontalGap
        val startX = (contentWidth - rowWidth) / 2f
        sorted.forEachIndexed { index, member ->
            positions[member.id] = TreePosition(startX + index * (nodeWidth + horizontalGap), 52f + rowIndex * (nodeHeight + verticalGap))
        }
    }
    val rowCount = max(1, rows.size)
    return TreeLayout(positions, contentWidth.toFloat(), (104 + rowCount * nodeHeight + (rowCount - 1) * verticalGap).toFloat())
}

private fun spouseAwareSort(members: List<FamilyMemberProfile>, links: List<FamilyTreeLink>): List<FamilyMemberProfile> {
    val inRow = members.associateBy { it.id }
    val spouseById = links.filter { it.relationship == "spouse" }.flatMap { listOf(it.fromMemberId to it.toMemberId, it.toMemberId to it.fromMemberId) }.toMap()
    val output = mutableListOf<FamilyMemberProfile>()
    val used = mutableSetOf<String>()
    members.sortedBy { it.displayName.lowercase() }.forEach { member ->
        if (!used.add(member.id)) return@forEach
        output += member
        inRow[spouseById[member.id]]?.takeIf { used.add(it.id) }?.let(output::add)
    }
    return output
}

private fun displayLinks(links: List<FamilyTreeLink>): List<DisplayLink> {
    val seen = mutableSetOf<String>()
    return links.mapNotNull { link ->
        if (link.relationship == "spouse") {
            val ids = listOf(link.fromMemberId, link.toMemberId).sorted()
            val key = "spouse:${ids[0]}:${ids[1]}"
            if (!seen.add(key)) null else DisplayLink(ids[0], ids[1], true)
        } else {
            val key = "parent:${link.fromMemberId}:${link.toMemberId}"
            if (!seen.add(key)) null else DisplayLink(link.fromMemberId, link.toMemberId, false)
        }
    }
}
