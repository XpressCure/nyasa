@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.xpresscure.nyas.ui

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.xpresscure.nyas.data.ApiException
import com.xpresscure.nyas.data.FamilyCalendarItem
import com.xpresscure.nyas.data.NyasApi
import com.xpresscure.nyas.data.NyasSession
import com.xpresscure.nyas.ui.theme.Gold
import com.xpresscure.nyas.ui.theme.Leaf
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

@Composable
internal fun CalendarScreen(session: NyasSession) {
    val api = remember { NyasApi() }
    val scope = rememberCoroutineScope()
    var events by remember { mutableStateOf(emptyList<FamilyCalendarItem>()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var adding by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }

    fun refresh() {
        scope.launch {
            loading = true
            error = ""
            try { events = api.calendarEvents(session) } catch (e: Exception) { error = e.message ?: "Could not load the family calendar." }
            loading = false
        }
    }
    LaunchedEffect(session.familyId) { refresh() }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Family Calendar", style = MaterialTheme.typography.headlineSmall)
                        Text("Puja, fasts, gatherings and moments everyone should know", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = ::refresh) { Icon(Icons.Outlined.Refresh, "Refresh calendar") }
                }
            }
            if (message.isNotBlank()) item {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
                    Text(message, Modifier.fillMaxWidth().padding(14.dp), color = Leaf)
                }
            }
            if (loading) item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            if (error.isNotBlank()) item {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.errorContainer) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(error, Modifier.weight(1f), color = MaterialTheme.colorScheme.onErrorContainer)
                        TextButton(onClick = ::refresh) { Text("Try again") }
                    }
                }
            }
            if (!loading && events.isEmpty() && error.isBlank()) item {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Outlined.CalendarMonth, null, Modifier.size(40.dp), tint = Gold)
                        Spacer(Modifier.height(10.dp))
                        Text("The calendar is ready", style = MaterialTheme.typography.titleMedium)
                        Text("Add the first family event so everyone can plan ahead.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            items(events, key = { it.id }) { event -> CalendarEventRow(event) }
        }
        FloatingActionButton(onClick = { adding = true }, Modifier.align(Alignment.BottomEnd).padding(20.dp), containerColor = Gold) {
            Icon(Icons.Outlined.Add, "Add family event")
        }
    }

    if (adding) AddCalendarEventDialog(
        busy = loading,
        onDismiss = { adding = false },
        onSubmit = { title, type, startsAt, location, description ->
            scope.launch {
                loading = true
                try {
                    api.addCalendarEvent(session, title, type, startsAt, location, description)
                    adding = false
                    message = "Event added to the family calendar."
                    events = api.calendarEvents(session)
                } catch (e: ApiException) {
                    error = e.message ?: "Could not add the event."
                }
                loading = false
            }
        }
    )
}

@Composable
private fun CalendarEventRow(event: FamilyCalendarItem) {
    Card(shape = RoundedCornerShape(8.dp)) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(Modifier.size(48.dp), shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Box(contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(eventDay(event.startsAt), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(eventMonth(event.startsAt), style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(event.title, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(eventTypeLabel(event.eventType), color = Leaf, style = MaterialTheme.typography.labelLarge)
                if (event.location.isNotBlank()) Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.LocationOn, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(4.dp))
                    Text(event.location, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
            }
        }
    }
}

@Composable
private fun AddCalendarEventDialog(
    busy: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (String, String, String, String, String) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var eventType by remember { mutableStateOf("puja") }
    var location by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedDate by remember { mutableStateOf<Long?>(null) }
    var datePickerOpen by remember { mutableStateOf(false) }
    val dateLabel = selectedDate?.let(::formatPickerDate).orEmpty()
    val valid = title.trim().length >= 2 && selectedDate != null

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add family event") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("Event title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("puja", "fast", "gathering", "meeting", "ritual", "other")) { type ->
                        FilterChip(selected = eventType == type, onClick = { eventType = type }, label = { Text(eventTypeLabel(type)) })
                    }
                }
                Button(onClick = { datePickerOpen = true }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Outlined.CalendarMonth, null)
                    Spacer(Modifier.width(8.dp))
                    Text(dateLabel.ifBlank { "Choose date" })
                }
                OutlinedTextField(location, { location = it }, label = { Text("Location (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(description, { description = it }, label = { Text("Note (optional)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            TextButton(enabled = valid && !busy, onClick = {
                onSubmit(title, eventType, selectedDate!!.toEventIso(), location, description)
            }) { Text("Add event") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )

    if (datePickerOpen) {
        val pickerState = androidx.compose.material3.rememberDatePickerState(initialSelectedDateMillis = selectedDate)
        DatePickerDialog(
            onDismissRequest = { datePickerOpen = false },
            confirmButton = { TextButton(onClick = { selectedDate = pickerState.selectedDateMillis; datePickerOpen = false }) { Text("Choose") } },
            dismissButton = { TextButton(onClick = { datePickerOpen = false }) { Text("Cancel") } }
        ) { DatePicker(pickerState) }
    }
}

private fun eventTypeLabel(value: String): String = when (value) {
    "puja" -> "Puja"
    "fast" -> "Fast"
    "gathering" -> "Gathering"
    "meeting" -> "Meeting"
    "ritual" -> "Ritual"
    else -> "Other"
}

private fun parseEventDate(value: String): OffsetDateTime? = try { OffsetDateTime.parse(value) } catch (_: DateTimeParseException) { null }
private fun eventDay(value: String) = parseEventDate(value)?.format(DateTimeFormatter.ofPattern("dd")) ?: "--"
private fun eventMonth(value: String) = parseEventDate(value)?.format(DateTimeFormatter.ofPattern("MMM", Locale("en", "IN")))?.uppercase() ?: "DATE"
private fun formatPickerDate(value: Long): String = Instant.ofEpochMilli(value).atZone(ZoneOffset.UTC).toLocalDate().format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale("en", "IN")))
private fun Long.toEventIso(): String = Instant.ofEpochMilli(this).atZone(ZoneOffset.UTC).toLocalDate().atTime(9, 0).atZone(ZoneId.systemDefault()).toOffsetDateTime().toString()
