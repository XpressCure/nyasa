@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddTask
import androidx.compose.material.icons.outlined.EditRoad
import androidx.compose.material.icons.outlined.PostAdd
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.SankalpManagementUpdate
import com.xpresscure.nyas.data.SankalpWorkspace
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch

private enum class SankalpAction { Stage, Milestone, Progress }

private val stages = listOf(
    "concept" to "Idea",
    "research" to "Research",
    "estimate_pending" to "Estimate pending",
    "estimate_received" to "Estimate received",
    "fundraising" to "Fundraising",
    "ready_for_implementation" to "Ready",
    "implementation" to "Implementation",
    "completed" to "Completed",
    "paused" to "Paused"
)

@Composable
fun SankalpManagePanel(
    session: NyasSession,
    workspace: SankalpWorkspace,
    onChanged: suspend () -> Unit
) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var action by remember { mutableStateOf<SankalpAction?>(null) }
    var working by remember { mutableStateOf(false) }
    var feedback by remember { mutableStateOf("") }
    var failure by remember { mutableStateOf("") }

    fun runAction(block: suspend () -> String) {
        scope.launch {
            working = true
            failure = ""
            try {
                feedback = block()
                action = null
                onChanged()
            } catch (exception: ApiException) {
                failure = exception.message.orEmpty()
            } finally {
                working = false
            }
        }
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Manage Sankalp", style = MaterialTheme.typography.titleMedium)
            Text("Keep the family informed as work moves forward.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { ActionChip("Change stage", Icons.Outlined.EditRoad) { action = SankalpAction.Stage } }
                item { ActionChip("Add milestone", Icons.Outlined.AddTask) { action = SankalpAction.Milestone } }
                item { ActionChip("Post progress", Icons.Outlined.PostAdd) { action = SankalpAction.Progress } }
            }
            if (feedback.isNotBlank()) Text(feedback, color = Leaf, fontWeight = FontWeight.SemiBold)
        }
    }

    when (action) {
        SankalpAction.Stage -> StageDialog(
            currentStage = workspace.project.stage,
            currentProgress = workspace.project.completionPercent,
            working = working,
            failure = failure,
            onDismiss = { if (!working) action = null },
            onSave = { stage, estimate, progress ->
                runAction {
                    api.updateSankalp(session, workspace.project.id, SankalpManagementUpdate(stage, estimate, progress))
                    "Sankalp stage updated."
                }
            }
        )
        SankalpAction.Milestone -> MilestoneDialog(working, failure, { if (!working) action = null }) { title, description, dueDate, budget ->
            runAction { api.addSankalpMilestone(session, workspace.project.id, title, description, dueDate, budget).message }
        }
        SankalpAction.Progress -> ProgressDialog(
            currentProgress = workspace.project.completionPercent,
            working = working,
            failure = failure,
            onDismiss = { if (!working) action = null }
        ) { title, details, type, progress ->
            runAction { api.addSankalpProgress(session, workspace.project.id, title, details, type, progress).message }
        }
        null -> Unit
    }
}

@Composable
private fun ActionChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    AssistChip(onClick = onClick, label = { Text(label) }, leadingIcon = { Icon(icon, null) })
}

@Composable
private fun StageDialog(
    currentStage: String,
    currentProgress: Int,
    working: Boolean,
    failure: String,
    onDismiss: () -> Unit,
    onSave: (String, Long?, Int?) -> Unit
) {
    var stage by remember { mutableStateOf(currentStage) }
    var estimate by remember { mutableStateOf("") }
    var progress by remember { mutableStateOf(currentProgress.toString()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Move Sankalp forward") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Choose the stage that best reflects the work today.")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    items(stages) { option -> AssistChip(onClick = { stage = option.first }, label = { Text(option.second, fontWeight = if (stage == option.first) FontWeight.Bold else FontWeight.Normal) }) }
                }
                if (stage == "estimate_received") OutlinedTextField(
                    value = estimate, onValueChange = { estimate = it.filter(Char::isDigit) }, label = { Text("Approved estimate (INR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(), singleLine = true
                )
                OutlinedTextField(
                    value = progress, onValueChange = { progress = it.filter(Char::isDigit).take(3) }, label = { Text("Completion %") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(), singleLine = true
                )
                if (failure.isNotBlank()) Text(failure, color = MaterialTheme.colorScheme.error)
            }
        },
        confirmButton = { Button(enabled = !working, onClick = { onSave(stage, estimate.toLongOrNull(), progress.toIntOrNull()?.coerceIn(0, 100)) }) { Text(if (working) "Saving..." else "Update Sankalp") } },
        dismissButton = { TextButton(enabled = !working, onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun MilestoneDialog(working: Boolean, failure: String, onDismiss: () -> Unit, onSave: (String, String, String, Long?) -> Unit) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf("") }
    var budget by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add a milestone") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
            OutlinedTextField(title, { title = it }, label = { Text("Milestone title") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(description, { description = it }, label = { Text("What will be completed?") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(dueDate, { dueDate = it }, label = { Text("Due date YYYY-MM-DD") }, modifier = Modifier.weight(1f))
                OutlinedTextField(budget, { budget = it.filter(Char::isDigit) }, label = { Text("Budget INR") }, modifier = Modifier.width(130.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            }
            if (failure.isNotBlank()) Text(failure, color = MaterialTheme.colorScheme.error)
        } },
        confirmButton = { Button(enabled = title.trim().length >= 2 && !working, onClick = { onSave(title, description, dueDate, budget.toLongOrNull()) }) { Text(if (working) "Adding..." else "Add milestone") } },
        dismissButton = { TextButton(enabled = !working, onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun ProgressDialog(currentProgress: Int, working: Boolean, failure: String, onDismiss: () -> Unit, onSave: (String, String, String, Int?) -> Unit) {
    var title by remember { mutableStateOf("") }
    var details by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("progress") }
    var progress by remember { mutableStateOf(currentProgress.toString()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Share a progress update") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                items(listOf("progress" to "Progress", "decision" to "Decision", "risk" to "Blocker", "completion" to "Completion")) { option ->
                    AssistChip(onClick = { type = option.first }, label = { Text(option.second, fontWeight = if (type == option.first) FontWeight.Bold else FontWeight.Normal) })
                }
            }
            OutlinedTextField(title, { title = it }, label = { Text("Heading (optional)") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(details, { details = it }, label = { Text("What should the family know?") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
            OutlinedTextField(progress, { progress = it.filter(Char::isDigit).take(3) }, label = { Text("Overall completion %") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
            if (failure.isNotBlank()) Text(failure, color = MaterialTheme.colorScheme.error)
        } },
        confirmButton = { Button(enabled = details.trim().length >= 2 && !working, onClick = { onSave(title, details, type, progress.toIntOrNull()?.coerceIn(0, 100)) }) { Text(if (working) "Publishing..." else "Publish update") } },
        dismissButton = { TextButton(enabled = !working, onClick = onDismiss) { Text("Cancel") } }
    )
}
