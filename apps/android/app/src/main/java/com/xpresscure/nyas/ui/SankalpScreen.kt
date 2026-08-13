@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.Sankalp
import com.xpresscure.nyas.data.SankalpWorkspace
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

@Composable
fun SankalpScreen(session: NyasSession, onFund: (String) -> Unit) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var projects by remember { mutableStateOf(emptyList<Sankalp>()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("all") }
    var selected by remember { mutableStateOf<Sankalp?>(null) }
    var createOpen by remember { mutableStateOf(false) }
    val canCreate = session.role in setOf("owner", "admin")

    fun refresh() {
        scope.launch {
            loading = true
            error = ""
            try {
                projects = api.sankalp(session).filter { it.status != "archived" && (canCreate || it.status != "draft") }
            }
            catch (exception: ApiException) { error = exception.message.orEmpty() }
            finally { loading = false }
        }
    }
    LaunchedEffect(session.familyId) { refresh() }
    val visible = projects.filter {
        when (filter) {
            "funding" -> it.stage == "fundraising" || (it.budgetRequired && !it.fullyFunded)
            "work" -> it.stage == "implementation" || it.stage == "ready_for_implementation"
            "complete" -> it.stage == "completed" || it.status == "completed"
            else -> true
        }
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Family Sankalp", style = MaterialTheme.typography.headlineSmall)
                    Text("Shared projects, visible from idea to completion", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (canCreate) IconButton(onClick = { createOpen = true }) { Icon(Icons.Outlined.Add, "New Sankalp") }
                IconButton(onClick = { refresh() }) { Icon(Icons.Outlined.Refresh, "Refresh") }
            }
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(listOf("all" to "All", "funding" to "Needs funding", "work" to "In progress", "complete" to "Completed")) { item ->
                    AssistChip(onClick = { filter = item.first }, label = { Text(item.second, fontWeight = if (filter == item.first) FontWeight.Bold else FontWeight.Normal) }, leadingIcon = if (filter == item.first) ({ Icon(Icons.Outlined.Route, null, Modifier.size(18.dp)) }) else null)
                }
            }
        }
        if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = Gold) }
        if (error.isNotBlank()) item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(error, Modifier.weight(1f)); TextButton(onClick = { refresh() }) { Text("Try again") }
                }
            }
        }
        if (!loading && visible.isEmpty()) item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Text("No Sankalp in this category yet.", Modifier.fillMaxWidth().padding(20.dp))
            }
        }
        items(visible, key = { it.id }) { project -> SankalpCard(project) { selected = project } }
    }

    selected?.let { project ->
        SankalpDetails(
            session = session,
            project = project,
            onDismiss = { selected = null },
            onFund = { selected = null; onFund(project.id) }
        )
    }
    if (createOpen) SankalpCreateSheet(
        session = session,
        onDismiss = { createOpen = false },
        onCreated = { createOpen = false; refresh() }
    )
}

@Composable
private fun SankalpCard(project: Sankalp, onClick: () -> Unit) {
    val money = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    Card(onClick = onClick, shape = RoundedCornerShape(8.dp), elevation = CardDefaults.cardElevation(1.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(stageLabel(project.stage), color = Leaf, style = MaterialTheme.typography.labelLarge)
                    Text(project.title, style = MaterialTheme.typography.titleMedium)
                }
                Icon(Icons.Outlined.ChevronRight, null)
            }
            Text(project.description, maxLines = 2, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (project.budgetRequired) {
                LinearProgressIndicator(progress = { project.fundingPercent / 100f }, Modifier.fillMaxWidth().height(8.dp).clip(CircleShape), color = Gold)
                Row {
                    Text("${project.fundingPercent}%", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.weight(1f))
                    Text("${money.format(project.allocatedPaise / 100.0)} / ${money.format(project.targetPaise / 100.0)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else Text("This Sankalp does not require funding.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Groups, null, Modifier.size(18.dp), tint = Gold)
                Spacer(Modifier.size(6.dp))
                Text("${project.contributorCount} contributors", style = MaterialTheme.typography.bodySmall)
                if (project.myAllocatedPaise > 0) {
                    Spacer(Modifier.weight(1f)); Text("You contributed", color = Leaf, style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}

@Composable
private fun SankalpDetails(session: NyasSession, project: Sankalp, onDismiss: () -> Unit, onFund: () -> Unit) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    val money = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }
    var workspace by remember(project.id) { mutableStateOf<SankalpWorkspace?>(null) }
    var loading by remember(project.id) { mutableStateOf(true) }
    var error by remember(project.id) { mutableStateOf("") }
    var milestoneFeedback by remember(project.id) { mutableStateOf("") }
    suspend fun loadWorkspace() {
        loading = true
        error = ""
        try { workspace = api.sankalpWorkspace(session, project.id) }
        catch (exception: ApiException) { error = exception.message.orEmpty() }
        finally { loading = false }
    }
    LaunchedEffect(project.id) { loadWorkspace() }
    ModalBottomSheet(onDismissRequest = onDismiss, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
        LazyColumn(
            Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
          item {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(stageLabel(project.stage), color = Leaf, style = MaterialTheme.typography.labelLarge)
            Text(project.title, style = MaterialTheme.typography.headlineSmall)
            Text(project.description, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (project.projectLeadName.isNotBlank()) Text("Led by ${project.projectLeadName}", fontWeight = FontWeight.SemiBold)
            if (project.budgetRequired) {
                LinearProgressIndicator(progress = { project.fundingPercent / 100f }, Modifier.fillMaxWidth().height(10.dp).clip(CircleShape), color = Gold)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column { Text("Raised"); Text(money.format(project.allocatedPaise / 100.0), style = MaterialTheme.typography.titleMedium) }
                    Column(horizontalAlignment = Alignment.End) { Text("Target"); Text(money.format(project.targetPaise / 100.0), style = MaterialTheme.typography.titleMedium) }
                }
                if (!project.fullyFunded) Button(onClick = onFund, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(8.dp)) { Text("Contribute from Kosh") }
            }
            }
          }
          if (loading) item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator() } }
          if (error.isNotBlank()) item { Text(error, color = MaterialTheme.colorScheme.error) }
          workspace?.let { details ->
              val canManage = session.role in setOf("owner", "admin", "manager") || session.memberId in setOf(
                  details.project.projectLeadMemberId,
                  details.project.auditorMemberId,
                  details.project.implementationLeadMemberId
              )
              item {
                  HorizontalDivider()
                  Spacer(Modifier.height(4.dp))
                  Text("Sankalp team", style = MaterialTheme.typography.titleMedium)
                  val people = listOf(
                      "Project lead" to details.project.projectLeadName,
                      "Progress auditor" to details.project.auditorName,
                      "Implementation lead" to details.project.implementationLeadName
                  ).filter { it.second.isNotBlank() }
                  if (people.isEmpty()) Text("Team details are being finalised.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                  else Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { people.forEach { (role, name) -> Row { Text(role, Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant); Text(name, fontWeight = FontWeight.SemiBold) } } }
              }
              if (canManage) item { SankalpManagePanel(session, details, onChanged = { loadWorkspace() }) }
              if (details.project.rules.isNotBlank()) item {
                  Text("Rules and scope", style = MaterialTheme.typography.titleMedium)
                  Text(details.project.rules, color = MaterialTheme.colorScheme.onSurfaceVariant)
              }
              item {
                  Text("Milestones", style = MaterialTheme.typography.titleMedium)
                  if (details.milestones.isEmpty()) Text("Milestones will appear here as the Sankalp progresses.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                  else Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                      details.milestones.forEach { milestone ->
                          Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), shape = RoundedCornerShape(8.dp)) {
                              Column(Modifier.fillMaxWidth().padding(12.dp)) {
                                  Row(verticalAlignment = Alignment.CenterVertically) {
                                      Text(milestone.title, Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                                      if (canManage && milestone.status != "completed") TextButton(onClick = {
                                          scope.launch {
                                              try {
                                                  milestoneFeedback = api.updateSankalpMilestone(session, details.project.id, milestone.id, "completed").message
                                                  loadWorkspace()
                                              } catch (exception: ApiException) { error = exception.message.orEmpty() }
                                          }
                                      }) { Text("Mark done") }
                                      else Text(milestone.status.replace('_', ' ').replaceFirstChar(Char::uppercase), color = Leaf)
                                  }
                                  if (milestone.description.isNotBlank()) Text(milestone.description, color = MaterialTheme.colorScheme.onSurfaceVariant)
                              }
                          }
                      }
                  }
                  if (milestoneFeedback.isNotBlank()) Text(milestoneFeedback, color = Leaf, fontWeight = FontWeight.SemiBold)
              }
              item {
                  Text("Latest progress", style = MaterialTheme.typography.titleMedium)
                  if (details.updates.isEmpty()) Text("No progress report has been added yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                  else Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                      details.updates.take(5).forEach { update ->
                          Column {
                              Text(update.title.ifBlank { update.updateType.replaceFirstChar(Char::uppercase) }, fontWeight = FontWeight.SemiBold)
                              Text(update.body, color = MaterialTheme.colorScheme.onSurfaceVariant)
                              if (update.authorName.isNotBlank()) Text(update.authorName, color = Leaf, style = MaterialTheme.typography.bodySmall)
                          }
                      }
                  }
              }
              if (details.documentCount > 0) item { Text("${details.documentCount} project documents are securely attached.", color = Leaf, fontWeight = FontWeight.SemiBold) }
          }
        }
    }
}
