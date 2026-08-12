@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.data.VirasatEvent
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch
import java.time.Year

@Composable
fun VirasatScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var events by remember { mutableStateOf(emptyList<VirasatEvent>()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var adding by remember { mutableStateOf(false) }

    fun refresh() { scope.launch { loading = true; error = ""; try { events = api.virasat(session) } catch (e: ApiException) { error = e.message.orEmpty() }; loading = false } }
    LaunchedEffect(session.familyId) { refresh() }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("Virasat", style = MaterialTheme.typography.headlineSmall); Text("Family memories in chronological order", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                IconButton(onClick = { refresh() }) { Icon(Icons.Outlined.Refresh, "Refresh") }
                IconButton(onClick = { adding = true }) { Icon(Icons.Outlined.Add, "Add history") }
            }
        }
        if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = Gold) }
        if (error.isNotBlank()) item { Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) { Text(error, Modifier.padding(14.dp)) } }
        if (!loading && events.isEmpty()) item { Text("Add the first family memory.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 30.dp)) }
        items(events, key = { it.id }) { event -> TimelineEvent(event) }
    }
    if (adding) AddVirasatDialog(
        busy = loading,
        onDismiss = { adding = false },
        onAdd = { title, year, category, location, description ->
            scope.launch {
                loading = true; error = ""
                try { api.addVirasatEvent(session, title, year, category, location, description); adding = false; events = api.virasat(session) }
                catch (e: ApiException) { error = e.message.orEmpty() }
                finally { loading = false }
            }
        }
    )
}

@Composable
private fun TimelineEvent(event: VirasatEvent) {
    Row(Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(42.dp).fillMaxHeight()) {
            Box(Modifier.size(14.dp).background(if (event.automatic) Leaf else Gold, CircleShape))
            Box(Modifier.width(2.dp).height(120.dp).background(MaterialTheme.colorScheme.outlineVariant))
        }
        Card(Modifier.weight(1f).padding(bottom = 4.dp), shape = RoundedCornerShape(8.dp), elevation = CardDefaults.cardElevation(1.dp)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row {
                    Text(event.eventYear?.toString() ?: event.eventDate.take(4), color = Gold, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.weight(1f)); Text(categoryLabel(event.category), color = Leaf, style = MaterialTheme.typography.labelMedium)
                }
                Text(event.title, style = MaterialTheme.typography.titleMedium)
                if (event.description.isNotBlank()) Text(event.description, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (event.location.isNotBlank()) Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.LocationOn, null, Modifier.size(16.dp)); Spacer(Modifier.size(4.dp)); Text(event.location, style = MaterialTheme.typography.bodySmall) }
                if (event.automatic) Text("Added automatically from a profile", style = MaterialTheme.typography.labelSmall, color = Leaf)
            }
        }
    }
}

@Composable
private fun AddVirasatDialog(busy: Boolean, onDismiss: () -> Unit, onAdd: (String, Int, String, String, String) -> Unit) {
    var title by remember { mutableStateOf("") }; var year by remember { mutableStateOf(Year.now().value.toString()) }; var location by remember { mutableStateOf("") }; var description by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Outlined.AutoStories, null, tint = Gold) },
        title = { Text("Add to Virasat") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(title, { title = it }, label = { Text("Event or memory") }, singleLine = true)
            OutlinedTextField(year, { year = it.filter(Char::isDigit).take(4) }, label = { Text("Year") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true)
            OutlinedTextField(location, { location = it }, label = { Text("Location (optional)") }, singleLine = true)
            OutlinedTextField(description, { description = it }, label = { Text("What happened?") }, minLines = 3)
        } },
        confirmButton = { Button(onClick = { onAdd(title, year.toIntOrNull() ?: Year.now().value, "family", location, description) }, enabled = !busy && title.trim().length >= 2 && (year.toIntOrNull() ?: 0) in 1600..2200) { if (busy) CircularProgressIndicator(Modifier.size(18.dp)) else Text("Add memory") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(8.dp)
    )
}

private fun categoryLabel(category: String): String = when (category) { "village" -> "Village"; "education" -> "Education"; "migration" -> "Migration"; "property" -> "Property"; "spiritual" -> "Spiritual"; "achievement" -> "Achievement"; "memory" -> "Memory"; else -> "Family" }
